import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const SKILL_ROLES = ["knowledge", "planner", "checker", "schema"] as const;
export type SkillRole = (typeof SKILL_ROLES)[number];

export const SKILL_PHASES = ["plan", "draft", "critique"] as const;
export type SkillPhase = (typeof SKILL_PHASES)[number];

const SkillFrontMatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggers: z
    .object({
      platforms: z.array(z.string()).default(["*"]),
      topics: z.array(z.string()).default(["*"]),
    })
    .default({ platforms: ["*"], topics: ["*"] }),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  role: z.enum(SKILL_ROLES).default("knowledge"),
  phase: z.enum(SKILL_PHASES).default("draft"),
  max_chars: z.number().int().positive().optional(),
});

export type Skill = z.infer<typeof SkillFrontMatterSchema> & {
  body: string;
  sourceDir: string;
};

const SKILLS_DIR = join(process.cwd(), "src/skills");

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseSkillFile(
  sourceDir: string,
  path: string,
  raw: string,
): Skill | null {
  const m = raw.match(FRONT_MATTER_RE);
  if (!m) {
    console.warn(`[skills] ${path}: no YAML front matter, skipping`);
    return null;
  }
  const [, fm, body] = m;
  let parsed: unknown;
  try {
    parsed = parseYaml(fm);
  } catch (err) {
    console.warn(`[skills] ${path}: YAML parse error:`, err);
    return null;
  }
  const result = SkillFrontMatterSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `[skills] ${path}: schema errors:`,
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return null;
  }
  return { ...result.data, body: body.trim(), sourceDir };
}

let cached: Skill[] | null = null;

export function loadSkills(): Skill[] {
  if (cached) return cached;
  const out: Skill[] = [];
  let entries: string[];
  try {
    entries = readdirSync(SKILLS_DIR);
  } catch {
    cached = [];
    return cached;
  }
  for (const entry of entries) {
    const full = join(SKILLS_DIR, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    const skillMd = join(full, "SKILL.md");
    let raw: string;
    try {
      raw = readFileSync(skillMd, "utf8");
    } catch {
      continue;
    }
    const skill = parseSkillFile(entry, skillMd, raw);
    if (skill) out.push(skill);
  }
  cached = out;
  return cached;
}

const PRIORITY_BONUS = { high: 3, medium: 1, low: 0 } as const;

export type ScoredSkill = {
  skill: Skill;
  score: number;
  platformMatch: "listed" | "wildcard" | "miss";
  topicMatches: string[];
};

export function scoreSkill(
  skill: Skill,
  ctx: { topic: string; brief?: string | null; platform: string },
): ScoredSkill | null {
  const platforms = skill.triggers.platforms.map((p) => p.toLowerCase());
  const isWildcard = platforms.includes("*");
  const isListed = platforms.includes(ctx.platform.toLowerCase());
  if (!isWildcard && !isListed) return null;

  const haystack = `${ctx.topic}\n${ctx.brief ?? ""}`.toLowerCase();
  const topics = skill.triggers.topics;
  const topicIsWildcard = topics.includes("*");
  const topicMatches: string[] = [];
  for (const kw of topics) {
    if (kw === "*") continue;
    if (haystack.includes(kw.toLowerCase())) {
      topicMatches.push(kw);
    }
  }
  if (!topicIsWildcard && topicMatches.length === 0) return null;

  const platformScore = isListed ? 2 : 1;
  const score =
    platformScore +
    topicMatches.length +
    PRIORITY_BONUS[skill.priority] +
    (topicIsWildcard ? 0 : 0.5);

  return {
    skill,
    score,
    platformMatch: isListed ? "listed" : "wildcard",
    topicMatches,
  };
}

export type SkillSelection = {
  plan: ScoredSkill[];
  draft: ScoredSkill[];
  critique: ScoredSkill[];
  all: ScoredSkill[];
};

export function selectRelevantSkills(
  ctx: { topic: string; brief?: string | null; platform: string },
  budgetChars = 15000,
): SkillSelection {
  const skills = loadSkills().filter((s) => s.role !== "schema");
  const scored = skills
    .map((s) => scoreSkill(s, ctx))
    .filter((s): s is ScoredSkill => s !== null)
    .sort((a, b) => b.score - a.score);

  const packedByPhase: Record<SkillPhase, ScoredSkill[]> = {
    plan: [],
    draft: [],
    critique: [],
  };

  // Budget is enforced per-phase so one phase doesn't starve another.
  const perPhaseBudgets: Record<SkillPhase, number> = {
    plan: budgetChars,
    draft: budgetChars,
    critique: budgetChars,
  };
  const used: Record<SkillPhase, number> = { plan: 0, draft: 0, critique: 0 };

  for (const s of scored) {
    const phase = s.skill.phase;
    const maxLen = s.skill.max_chars ?? s.skill.body.length;
    const cost = Math.min(s.skill.body.length, maxLen);
    if (used[phase] + cost > perPhaseBudgets[phase]) continue;
    packedByPhase[phase].push(s);
    used[phase] += cost;
  }

  return {
    plan: packedByPhase.plan,
    draft: packedByPhase.draft,
    critique: packedByPhase.critique,
    all: [...packedByPhase.plan, ...packedByPhase.draft, ...packedByPhase.critique],
  };
}

export function renderSkillBody(skill: Skill): string {
  if (skill.max_chars && skill.body.length > skill.max_chars) {
    return `${skill.body.slice(0, skill.max_chars)}\n…[truncated]`;
  }
  return skill.body;
}

export function skillSummary(s: ScoredSkill) {
  return {
    name: s.skill.name,
    role: s.skill.role,
    phase: s.skill.phase,
    score: Number(s.score.toFixed(2)),
    topicMatches: s.topicMatches,
  };
}
