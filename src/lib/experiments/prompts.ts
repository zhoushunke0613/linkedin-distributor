import type { LearningsReport } from "@/lib/learnings";
import type { Platform } from "./store";

/**
 * Hook types mirror growth-system's catalog. Each headline variant is
 * tagged with one so downstream analytics can tell which hook format wins.
 */
export const HOOK_TYPES = [
  "data_shock",
  "pain_resonance",
  "counterintuitive",
  "story_opener",
  "listicle",
  "question",
] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const HOOK_TYPE_DESCRIPTIONS: Record<HookType, string> = {
  data_shock: "lead with a concrete number or stat that surprises",
  pain_resonance: "name a pain point the reader has been thinking",
  counterintuitive: "challenge a commonly held belief",
  story_opener: "start with a specific scene or moment",
  listicle: "frame as 'N things' / 'N lessons' / 'N mistakes'",
  question: "open with a direct question the reader wants answered",
};

const PLATFORM_RULES: Record<Platform, string> = {
  linkedin: [
    "Platform: LinkedIn",
    "Audience: busy B2B / professional readers who scroll fast.",
    "Voice: first-person, direct, substantive. Avoid corporate filler.",
    "Formatting: short paragraphs (1-3 lines), blank lines between, sparse emojis.",
    "Headline: first 2-3 lines before the 'see more' fold. Must hook.",
    "Body: extend the hook with one concrete example or proof.",
    "End with one CTA — a question, an invitation, a link, or a reflection.",
    "No hashtag soup — max 3 relevant hashtags, at the very end.",
  ].join("\n"),
  xiaohongshu: [
    "Platform: 小红书 (Xiaohongshu)",
    "Audience: 中文读者,偏生活化、品类导购。",
    "语气:亲切、真实、有画面感;适度 emoji。",
    "格式:标题党 + 分点正文 + tag。",
  ].join("\n"),
  x: [
    "Platform: X (Twitter)",
    "Audience: thread-readers; attention span measured in seconds.",
    "Voice: punchy, specific. Every tweet earns the next scroll.",
    "Length: single tweets ≤ 280 chars.",
  ].join("\n"),
  google_ads: [
    "Platform: Google Ads (RSA)",
    "Headlines: up to 30 characters each, keyword-focused.",
    "Descriptions: up to 90 characters each, benefit-focused with CTA.",
  ].join("\n"),
};

function renderLearnings(l: LearningsReport | null): string {
  if (!l || l.coveredSampleSize === 0) {
    return "No historical engagement data available yet — use general best practices.";
  }
  const lines: string[] = [
    `Historical engagement context (n=${l.coveredSampleSize} posts, avg=${l.overallAvgEngagement.toFixed(1)}):`,
  ];
  const topBucket = (title: string, rows: typeof l.byTextLength) => {
    const top = [...rows].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    if (top && top.n >= 1) {
      lines.push(`- Best ${title}: ${top.label} (n=${top.n}, avg=${top.avgEngagement.toFixed(1)})`);
    }
  };
  topBucket("text length", l.byTextLength);
  topBucket("media", l.byHasMedia);
  topBucket("day of week (UTC)", l.byDayOfWeek);
  topBucket("hour of day (UTC)", l.byHourOfDay);
  if (l.topPosts.length > 0) {
    lines.push("Top posts (for style reference, not copying):");
    for (const p of l.topPosts.slice(0, 3)) {
      lines.push(`- engagement ${p.engagement}: ${p.textPreview}`);
    }
  }
  return lines.join("\n");
}

export function buildHeadlineSystemPrompt(
  platform: Platform,
  learnings: LearningsReport | null,
): string {
  return [
    `You are a senior ${platform} content strategist.`,
    "Generate HEADLINES — the first 2-3 lines of a post, the hook that decides whether readers tap 'see more'.",
    "",
    PLATFORM_RULES[platform],
    "",
    "Hook type catalog (tag each variant with the matching kind):",
    ...HOOK_TYPES.map((h) => `- ${h}: ${HOOK_TYPE_DESCRIPTIONS[h]}`),
    "",
    "Rules for headlines:",
    "- Each variant MUST use a different hookType.",
    "- Each variant is 1-3 sentences, max ~220 characters.",
    "- No emoji as the first character. No hashtags.",
    "- No generic openers like 'In today's world' or 'As a founder'.",
    "",
    renderLearnings(learnings),
  ].join("\n");
}

export function buildBodySystemPrompt(
  platform: Platform,
  learnings: LearningsReport | null,
): string {
  return [
    `You are a senior ${platform} content strategist.`,
    "Generate POST BODIES — the narrative below the hook, ending with a single CTA.",
    "",
    PLATFORM_RULES[platform],
    "",
    "Rules for bodies:",
    "- Body text only, not a headline (caller will pair this with a separate headline).",
    "- 3-6 short paragraphs, separated by blank lines.",
    "- Include ONE concrete example, story, number, or proof point.",
    "- End with exactly ONE of these CTA shapes: question / invitation / link / reflection.",
    "- Tag each variant with its CTA kind.",
    "- Total length 400-1200 characters unless the platform forces shorter.",
    "",
    renderLearnings(learnings),
  ].join("\n");
}

export function buildGenerationPrompt(args: {
  topic: string;
  brief?: string | null;
  constraints?: Record<string, unknown> | null;
  n: number;
  kind: "headline" | "body";
}): string {
  const lines = [
    `Generate ${args.n} distinct ${args.kind} variants.`,
    "",
    `Topic: ${args.topic}`,
  ];
  if (args.brief) {
    lines.push("", "Brief:", args.brief);
  }
  if (args.constraints && Object.keys(args.constraints).length > 0) {
    lines.push(
      "",
      "Constraints (strict):",
      JSON.stringify(args.constraints, null, 2),
    );
  }
  return lines.join("\n");
}
