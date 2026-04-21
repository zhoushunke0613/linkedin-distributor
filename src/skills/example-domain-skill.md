---
# Everything in this block is metadata the router reads.
name: example-domain-skill
description: Template — copy this file, rename, and make it your own.
triggers:
  # Platforms where this skill should fire. Use ["*"] for all platforms.
  platforms: ["linkedin"]
  # Keywords matched case-insensitively against topic + brief. Each match
  # earns 1 relevance point. Use ["*"] to make the skill always fire.
  topics:
    - "attribution"
    - "归因"
    - "ios 17"
    - "DTC"
priority: high       # high (+3) / medium (+1) / low (0)
max_chars: 800       # optional truncation budget per skill
---

# Your brand's POV on <topic>

Replace this file with genuine domain knowledge you want the agent to use.
Good skills usually contain a subset of:

## Core point of view
One or two sentences that state your unique angle. The agent will frame
variants around this.

## Vocabulary we use
- "server-side attribution" (not "backend tracking")
- "first-party pixel" (not "custom tag")

## Vocabulary we avoid
- "attribution is hard" — we say it's *wrong*, not hard.
- "privacy killed tracking" — privacy and tracking aren't zero-sum.

## Proof points / stats
Any specific data or references the agent can weave in.
- "30% of Meta CPA is virtual" — internal study, 2025
- "iOS 17 cut view-through conversions by ~45%" — internal data

## Good examples (for style transfer, not copying)
- "Is Meta stealing your TikTok credit?" — counterintuitive hook
- "Your Meta ROAS is 4x. Your bank account says otherwise." — pain resonance

---

**Delete this example file (or keep it — it won't fire unless triggers match
a real experiment) and add your own `.md` files beside it. No code change
needed — Vercel will redeploy on push and the next generation picks up the
new skill.**
