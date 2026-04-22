---
name: shared-post-brief
description: Standard input schema for every downstream content skill
triggers:
  platforms: ["linkedin"]
  topics: ["*"]
priority: high
role: schema
phase: plan
---

# Shared post brief

Standard input schema for all LinkedIn content generation skills. Every
downstream skill should read from this brief so outputs stay aligned.

## Schema

- **topic** — The raw idea, prompt, claim, event, observation, or content angle.
- **target_audience** — one of:
  shopify_founder / head_of_marketing / performance_marketer /
  crm_retention_manager / ecommerce_operator / agency_consultant /
  mixed_b2b_ecommerce
- **content_goal** — one of:
  brand_awareness / pain_point_agitation / category_education /
  product_positioning / objection_handling / competitor_reframing /
  conversation_starting / thought_leadership
- **topic_cluster** — one of:
  anonymous_traffic / identity_resolution / attribution_trust /
  hidden_revenue_leakage / abandoned_cart_gap / email_flow_underperformance /
  paid_traffic_inefficiency / dashboard_overload / decision_clarity /
  revenue_recovery / platform_blind_spots
- **attribuly_pov** — The main brand worldview the post should reflect.
- **desired_tone** — default: "sharp, concise, operator-minded, commercially aware"
- **use_controversial_take** — boolean
- **require_question_close** — boolean
- **product_reference_level** — none / light / moderate / explicit
- **proof_level** — low / medium / high
- **length_preference** — short / medium / long

## Global rules

- Every post should focus on one main idea.
- Every post should be written for a specific audience, not for everyone.
- Every post should reflect Attribuly's worldview, not generic SaaS marketing.
- Pain and consequence should usually come before product mention.
- Use short paragraphs and plain-English business language.
