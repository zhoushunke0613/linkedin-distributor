import { z } from "zod";
import { generateStructured } from "./provider";
import { buildCritiqueSystemPrompt, HOOK_TYPES } from "./prompts";
import type { ScoredSkill } from "./skills";
import type { PostBrief } from "./brief";
import type { Platform } from "./store";

export type DraftHeadlineVariant = {
  text: string;
  hookType: (typeof HOOK_TYPES)[number];
};

export type DraftBodyVariant = {
  text: string;
  ctaKind: "question" | "invitation" | "link" | "reflection";
};

export type CritiquedVariant<T> = {
  original: T;
  revised: T;
  changed: boolean;
  critiqueNote: string;
};

const CritiquedHeadlineBatchSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string().min(5).max(500),
      hookType: z.enum(HOOK_TYPES),
      critique_note: z.string().max(500),
    }),
  ),
});

const CritiquedBodyBatchSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string().min(50).max(3000),
      ctaKind: z.enum(["question", "invitation", "link", "reflection"]),
      critique_note: z.string().max(500),
    }),
  ),
});

function renderVariantsForPrompt(
  kind: "headline" | "body",
  variants: Array<DraftHeadlineVariant | DraftBodyVariant>,
): string {
  const lines: string[] = [`## Variants to review (${kind})`];
  variants.forEach((v, i) => {
    const tag =
      "hookType" in v
        ? `hookType=${v.hookType}`
        : `ctaKind=${(v as DraftBodyVariant).ctaKind}`;
    lines.push("", `### Variant ${i + 1} (${tag})`, v.text);
  });
  lines.push(
    "",
    "Return the same number of variants in the same order, each with its original tag preserved.",
  );
  return lines.join("\n");
}

export async function critiqueHeadlines(args: {
  platform: Platform;
  brief: PostBrief | null;
  checkerSkills: ScoredSkill[];
  variants: DraftHeadlineVariant[];
}): Promise<CritiquedVariant<DraftHeadlineVariant>[]> {
  if (args.checkerSkills.length === 0 || args.variants.length === 0) {
    return args.variants.map((v) => ({
      original: v,
      revised: v,
      changed: false,
      critiqueNote: "no checker skills matched",
    }));
  }
  const system = buildCritiqueSystemPrompt({
    platform: args.platform,
    brief: args.brief,
    kind: "headline",
    checkerSkills: args.checkerSkills,
  });
  const prompt = renderVariantsForPrompt("headline", args.variants);
  const result = await generateStructured({
    schema: CritiquedHeadlineBatchSchema,
    system,
    prompt,
    temperature: 0.5,
  });
  return args.variants.map((v, i) => {
    const r = result.variants[i];
    if (!r) {
      return {
        original: v,
        revised: v,
        changed: false,
        critiqueNote: "critique response truncated",
      };
    }
    const revised: DraftHeadlineVariant = {
      text: r.text,
      hookType: r.hookType,
    };
    const changed = r.text.trim() !== v.text.trim();
    return {
      original: v,
      revised,
      changed,
      critiqueNote: r.critique_note,
    };
  });
}

export async function critiqueBodies(args: {
  platform: Platform;
  brief: PostBrief | null;
  checkerSkills: ScoredSkill[];
  variants: DraftBodyVariant[];
}): Promise<CritiquedVariant<DraftBodyVariant>[]> {
  if (args.checkerSkills.length === 0 || args.variants.length === 0) {
    return args.variants.map((v) => ({
      original: v,
      revised: v,
      changed: false,
      critiqueNote: "no checker skills matched",
    }));
  }
  const system = buildCritiqueSystemPrompt({
    platform: args.platform,
    brief: args.brief,
    kind: "body",
    checkerSkills: args.checkerSkills,
  });
  const prompt = renderVariantsForPrompt("body", args.variants);
  const result = await generateStructured({
    schema: CritiquedBodyBatchSchema,
    system,
    prompt,
    temperature: 0.5,
  });
  return args.variants.map((v, i) => {
    const r = result.variants[i];
    if (!r) {
      return {
        original: v,
        revised: v,
        changed: false,
        critiqueNote: "critique response truncated",
      };
    }
    const revised: DraftBodyVariant = {
      text: r.text,
      ctaKind: r.ctaKind,
    };
    const changed = r.text.trim() !== v.text.trim();
    return {
      original: v,
      revised,
      changed,
      critiqueNote: r.critique_note,
    };
  });
}
