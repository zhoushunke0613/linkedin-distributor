---
name: audience-pain-map
description: Translate a generic topic into audience-specific pain, stakes, and message angle
triggers:
  platforms: ["linkedin"]
  topics: ["*"]
priority: high
role: knowledge
phase: draft
---

# Audience pain map

Translate a generic Attribuly topic into audience-specific pain, stakes,
language, and message angle.

## When to use

- When the post topic is clear but the target reader is not.
- When the system needs to adapt the same idea for different personas.
- Before drafting body copy.

## Inputs

topic / optional_target_audience / content_goal / product_context / topic_cluster

## Outputs

chosen_audience / top_3_relevant_pains / mistaken_assumption /
key_business_consequence / recommended_message_angle

## Workflow

1. Identify the audience most likely to care about this topic.
2. Map the topic to pains that audience already feels.
3. Translate product framing into audience-native language.
4. Identify what commercial or operational consequence matters most.
5. Recommend the messaging angle that will land best with this audience.

## Guardrails

- Do not describe the audience too broadly.
- Do not default to founder language for every post.
- Do not use internal product terminology unless the audience would understand it.
- Do not turn persona mapping into a long persona essay.

## Quality bar

- The output should make the post feel written for someone real.
- The pains should feel commercially relevant.
- The recommended angle should be easy to draft from.

## Audience reference

### shopify_founder
- Paid traffic is expensive and hard to scale confidently.
- Revenue reports are inconsistent across tools.
- Retention systems exist but revenue still leaks.

### head_of_marketing
- Attribution trust is weak, so budget decisions feel shaky.
- Team reports a lot, but clarity is low.
- Channels look good in-platform but blended performance is unclear.

### performance_marketer
- Platform ROAS may not reflect reality.
- Scaling decisions are harder when attribution is noisy.
- Spend may be concentrated in campaigns with weak true return.

### crm_retention_manager
- Flows are built, but volume or recoverable users is limited.
- Anonymous traffic prevents automation from triggering.
- Email performance may be capped upstream.

### ecommerce_operator
- Too many dashboards, not enough action clarity.
- Multiple teams operate from partial visibility.
- Revenue leakage is hard to isolate.

### agency_consultant
- Need credible diagnosis across multiple client setups.
- Client trust drops when data sources conflict.
- Hard to separate reporting noise from actual growth levers.
