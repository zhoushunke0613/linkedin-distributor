---
name: competitor-reframes
description: Reframe competitor-shaped market beliefs into Attribuly-friendly category narratives
triggers:
  platforms: ["linkedin"]
  topics:
    - "competitor"
    - "vs"
    - "versus"
    - "alternative"
    - "switcher"
    - "switch"
    - "compared to"
    - "triple whale"
    - "northbeam"
    - "rockerbox"
    - "measured"
    - "attribution vendors"
    - "ga4"
    - "meta pixel"
    - "shopify apps"
    - "对比"
    - "竞品"
priority: high
role: checker
phase: critique
---

# Competitor reframes

Reframe competitor-shaped market beliefs into Attribuly-friendly category
narratives without sounding petty, reactive, or overly comparative.

## When to use

- When the topic is influenced by competitor positioning.
- When writing switcher content or category contrast posts.
- When handling objections shaped by other tools.

## Inputs

topic / optional_competitor_context / target_audience / content_goal

## Outputs

reframe_statement / comparison_logic /
softer_phrasing_options / optional_soft_contrast_line

## Workflow

1. Identify the market assumption shaped by competitors.
2. Reframe the issue around outcomes, blind spots, actionability, or decision quality.
3. Prefer category-level truth over direct attacks.
4. Use indirect contrast unless direct mention is strategically necessary.
5. Keep the tone commercially confident, not emotional.

## Guardrails

- Do not make false claims about competitors.
- Do not sound bitter or defensive.
- Do not turn every post into a competitor comparison.
- Do not rely on direct naming unless necessary.

## Quality bar

- The reframe should make Attribuly's lens feel stronger.
- The contrast should feel strategic and credible.
- The reader should remember the category logic, not just the competitor mention.

## Safe reframe examples

- "Reporting is not the same as recovery."
- "Seeing more charts does not always mean seeing more truth."
- "Attribution visibility matters, but actionability matters too."
- "A retention stack can only work on the users it can actually reach."

## Revision instruction (for critique pass)

Only fire when the draft mentions a competitor (direct or indirect)
or is shaped by a competitor-flavored belief. If the draft does not
touch competitor framing, return the variants unchanged with
`critique_note: "n/a (no competitor framing)"`. If it does, rewrite
the relevant line to use indirect reframing language from the "safe
reframe examples" catalog.
