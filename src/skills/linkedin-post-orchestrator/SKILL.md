---
name: linkedin-post-orchestrator
description: Top-level routing and final-draft assembly planner
triggers:
  platforms: ["linkedin"]
  topics: ["*"]
priority: high
role: planner
phase: plan
---

# LinkedIn post orchestrator

Turn a rough Attribuly-related idea into a strong LinkedIn post plan,
route subtasks to the right writing skills, and assemble a final post draft.

## When to use

- When the user provides a raw topic and wants a full LinkedIn post.
- When the direction is vague and the system needs to choose audience, POV, and structure.
- When multiple downstream writing skills need coordination.

## Inputs

shared_post_brief / optional_raw_user_prompt / optional_brand_context / optional_product_context

## Outputs

audience_selection / content_goal_selection / topic_cluster_selection /
attribuly_pov_selection / structure_selection / proof_direction /
hook_direction / engagement_direction / final_post_draft /
optional_backup_hooks

## Workflow

1. Read the raw idea and identify the single strongest postable angle.
2. Select the most likely target audience.
3. Select one primary content goal only.
4. Map the idea to one topic cluster.
5. Choose the most relevant Attribuly POV.
6. Decide whether the post should be observational, educational, contrarian, or positioning-led.
7. Call or simulate outputs from hook-patterns, audience-pain-map, attribuly-pov, post-structures, proof-assets, and engagement-patterns.
8. Assemble a first draft.
9. Pass the draft through brand-voice-guardrails.
10. Return the final post plus optional alternate hooks.

## Responsibilities

- Make post-level decisions.
- Prevent multiple unrelated ideas from being mixed together.
- Keep every downstream skill aligned to one strategy.
- Assemble a coherent final output.

## Guardrails

- Do not stuff multiple disconnected product claims into one post.
- Do not make the post sound like a brochure.
- Do not lead with product explanation before clarifying the pain or POV.
- Do not add fake precision or unsupported claims.
- Do not force controversy when the topic does not naturally support it.

## Quality bar

- The post should have a sharp first 2–3 lines.
- The post should clearly target a real audience.
- The post should reflect Attribuly's worldview.
- The post should sound like an operator, not a hype marketer.
- The post should end in a way that feels conversational and credible.

## Recommended execution order

1. Read shared-post-brief
2. Run content-goals
3. Run audience-pain-map
4. Run topic-clusters
5. Run attribuly-pov
6. Run post-structures
7. Run hook-patterns
8. Run proof-assets
9. Run engagement-patterns
10. Assemble draft
11. Pass final draft through brand-voice-guardrails

## Global LinkedIn rules

- Write for one audience at a time.
- Write about one core idea per post.
- Do not sound like generic AI SaaS copy.
- Do not lead with product unless the goal is explicitly product positioning.
- Pain before product is usually the right default.
- Reframe before pitch.
- Keep paragraphs short.
- Use plain-English business language.
- Do not force controversy.
- Do not add made-up numbers or fake customer evidence.
- Do not overuse emojis.
- Posts should feel like they came from a smart operator, not a hype machine.
