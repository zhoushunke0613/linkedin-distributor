---
name: brand-voice-guardrails
description: Final voice-alignment pass — sharp, concise, operator-minded, commercially aware
triggers:
  platforms: ["linkedin"]
  topics: ["*"]
priority: high
role: checker
phase: critique
---

# Brand voice guardrails

Keep every post aligned with Attribuly's desired voice: sharp, concise,
operator-minded, commercially aware, and human.

## When to use

- On every final draft.
- When a draft sounds too generic, too polished, or too salesy.
- Before final output.

## Inputs

full_or_partial_draft / target_audience / content_goal

## Outputs

revised_draft / tone_corrections /
wording_to_remove / wording_to_strengthen

## Workflow

1. Scan for AI-sounding filler.
2. Remove fluff, hype, and over-polished phrasing.
3. Tighten sentences.
4. Shorten paragraphs.
5. Make the tone more commercially sharp and practical.
6. Preserve readability and human tone.

## Guardrails

- Do not make the tone overly aggressive.
- Do not make the post sound like an ad.
- Do not strip away all personality.
- Do not over-edit until the writing becomes robotic.

## Quality bar

- The final post should sound like a smart operator.
- The language should be plain-English, not corporate filler.
- The post should feel concise but not dry.

## Preferred voice traits

sharp / clear / grounded / commercially aware /
slightly contrarian when useful / practical / human

## Avoid these phrases

- "game-changing"
- "revolutionary"
- "unlock your potential"
- "in today's fast-paced landscape"
- generic founder inspiration
- forced hype
- too many emojis

## Revision instruction (for critique pass)

When revising variants, return the same number of variants you received.
For each variant, either keep the text identical (if already good) or
rewrite it. Preserve the original hookType / ctaKind tag. Return a short
`critique_note` per variant explaining what you changed and why (one
sentence). If no change was needed, set `critique_note` to "unchanged".
