import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

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
  max_chars: z.number().int().positive().optional(),
});

export type Skill = z.infer<typeof SkillFrontMatterSchema> & {
  body: string;
  sourceFile: string;
};

const SKILLS_DIR = join(process.cwd(), "src/skills");

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseSkillFile(file: string, raw: string): Skill | null {
  const m = raw.match(FRONT_MATTER_RE);
  if (!m) {
    console.warn(`[skills] ${file}: no YAML front matter, skipping`);
    return null;
  }
  const [, fm, body] = m;
  let parsed: unknown;
  try {
    parsed = parseYaml(fm);
  } catch (err) {
    console.warn(`[skills] ${file}: YAML parse error:`, err);
    return null;
  }
  const result = SkillFrontMatterSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `[skills] ${file}: schema errors:`,
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return null;
  }
  return {
    ...result.data,
    body: body.trim(),
    sourceFile: file,
  };
}

let cached: Skill[] | null = null;

export function loadSkills(): Skill[] {
  if (cached) return cached;
  let files: string[];
  try {
    files = readdirSync(SKILLS_DIR).filter(
      (f) => f.endsWith(".md") && f !== "README.md",
    );
  } catch {
    cached = [];
    return cached;
  }
  const out: Skill[] = [];
  for (const file of files) {
    const path = join(SKILLS_DIR, file);
    try {
      const raw = readFileSync(path, "utf8");
      const skill = parseSkillFile(file, raw);
      if (skill) out.push(skill);
    } catch (err) {
      console.warn(`[skills] could not read ${file}:`, err);
    }
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
  // If topic triggers are non-wildcard and no matches hit, skip skill.
  if (!topicIsWildcard && topicMatches.length === 0) return null;

  const platformScore = isListed ? 2 : 1;
  const score =
    platformScore +
    topicMatches.length +
    PRIORITY_BONUS[skill.priority] +
    (topicIsWildcard ? 0 : 0.5); // slight bias for specific over catch-all

  return {
    skill,
    score,
    platformMatch: isListed ? "listed" : "wildcard",
    topicMatches,
  };
}

export function selectRelevantSkills(
  ctx: { topic: string; brief?: string | null; platform: string },
  budgetChars = 3000,
): ScoredSkill[] {
  const skills = loadSkills();
  const scored = skills
    .map((s) => scoreSkill(s, ctx))
    .filter((s): s is ScoredSkill => s !== null)
    .sort((a, b) => b.score - a.score);

  const out: ScoredSkill[] = [];
  let used = 0;
  for (const s of scored) {
    const truncated = s.skill.max_chars
      ? Math.min(s.skill.body.length, s.skill.max_chars)
      : s.skill.body.length;
    if (used + truncated > budgetChars) continue;
    out.push(s);
    used += truncated;
  }
  return out;
}

export function renderSkillBody(skill: Skill): string {
  if (skill.max_chars && skill.body.length > skill.max_chars) {
    return `${skill.body.slice(0, skill.max_chars)}\n…[truncated]`;
  }
  return skill.body;
}
