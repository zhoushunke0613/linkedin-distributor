import { z } from "zod";

export const TARGET_AUDIENCES = [
  "shopify_founder",
  "head_of_marketing",
  "performance_marketer",
  "crm_retention_manager",
  "ecommerce_operator",
  "agency_consultant",
  "mixed_b2b_ecommerce",
] as const;
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export const CONTENT_GOALS = [
  "brand_awareness",
  "pain_point_agitation",
  "category_education",
  "product_positioning",
  "objection_handling",
  "competitor_reframing",
  "conversation_starting",
  "thought_leadership",
] as const;
export type ContentGoal = (typeof CONTENT_GOALS)[number];

export const TOPIC_CLUSTERS = [
  "anonymous_traffic",
  "identity_resolution",
  "attribution_trust",
  "hidden_revenue_leakage",
  "abandoned_cart_gap",
  "email_flow_underperformance",
  "paid_traffic_inefficiency",
  "dashboard_overload",
  "decision_clarity",
  "revenue_recovery",
  "platform_blind_spots",
] as const;
export type TopicCluster = (typeof TOPIC_CLUSTERS)[number];

export const PRODUCT_REF_LEVELS = ["none", "light", "moderate", "explicit"] as const;
export const PROOF_LEVELS = ["low", "medium", "high"] as const;
export const LENGTH_PREFS = ["short", "medium", "long"] as const;

/**
 * Mirror of shared-post-brief/SKILL.md — used to enrich the experiment
 * record so every downstream subagent reads the same contract.
 * All fields are optional: when missing, the agent decides.
 */
export const PostBriefSchema = z.object({
  target_audience: z.enum(TARGET_AUDIENCES).optional(),
  content_goal: z.enum(CONTENT_GOALS).optional(),
  topic_cluster: z.enum(TOPIC_CLUSTERS).optional(),
  attribuly_pov: z.string().max(500).optional(),
  desired_tone: z.string().max(200).optional(),
  use_controversial_take: z.boolean().optional(),
  require_question_close: z.boolean().optional(),
  product_reference_level: z.enum(PRODUCT_REF_LEVELS).optional(),
  proof_level: z.enum(PROOF_LEVELS).optional(),
  length_preference: z.enum(LENGTH_PREFS).optional(),
});

export type PostBrief = z.infer<typeof PostBriefSchema>;

export function renderBriefForPrompt(brief: PostBrief | null): string {
  if (!brief || Object.keys(brief).length === 0) {
    return "(no explicit brief — infer best defaults)";
  }
  const lines: string[] = [];
  if (brief.target_audience) lines.push(`- Target audience: ${brief.target_audience}`);
  if (brief.content_goal) lines.push(`- Content goal: ${brief.content_goal}`);
  if (brief.topic_cluster) lines.push(`- Topic cluster: ${brief.topic_cluster}`);
  if (brief.attribuly_pov) lines.push(`- Attribuly POV seed: ${brief.attribuly_pov}`);
  if (brief.desired_tone) lines.push(`- Desired tone: ${brief.desired_tone}`);
  if (brief.use_controversial_take !== undefined)
    lines.push(`- Use controversial take: ${brief.use_controversial_take}`);
  if (brief.require_question_close !== undefined)
    lines.push(`- End with a question: ${brief.require_question_close}`);
  if (brief.product_reference_level)
    lines.push(`- Product reference level: ${brief.product_reference_level}`);
  if (brief.proof_level) lines.push(`- Proof level: ${brief.proof_level}`);
  if (brief.length_preference) lines.push(`- Length preference: ${brief.length_preference}`);
  return lines.join("\n");
}
