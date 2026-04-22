# Skills

Each subdirectory is a **skill** — a piece of domain knowledge or a checker
the generator uses when producing LinkedIn post variants.

## Folder structure

```
src/skills/<skill-name>/
  SKILL.md          # required — YAML front matter + markdown body
  (optional sidecar files later, e.g. checklist.yaml, examples.md)
```

## Front matter fields

```yaml
name: <unique>
description: <one line>
triggers:
  platforms: ["linkedin", ...]   # or ["*"] to apply to all
  topics: ["keyword1", "keyword2", ...]   # or ["*"] to always fire
priority: high | medium | low
role: knowledge | planner | checker | schema
phase: plan | draft | critique
max_chars: <optional int — truncate body above this length>
```

## Roles and phases

- **role=knowledge** — static domain knowledge injected into the `draft`
  phase system prompt. Used by the headline + body subagents.
- **role=planner** — decision-helper content injected into the `plan`
  phase prompt so subagents can route topic → audience → angle.
- **role=checker** — critique rules applied by the second LLM pass
  (critique phase) after the draft is produced. Can rewrite variants.
- **role=schema** — input contract documents (like `shared-post-brief`).
  Not injected into any prompt; used as a reference for the app's own
  brief validation.

## Adding a skill

1. Create a new folder under `src/skills/` with a kebab-case name.
2. Add a `SKILL.md` using the front matter above.
3. `git add` + commit + push. Vercel redeploys; the next `Generate
   variants` run loads the skill automatically — no code change needed.

## Changing the execution order

Execution is controlled by the `phase` field:
`plan` → `draft` → `critique`.

Within a phase, skills are selected and scored by the router in
`src/lib/experiments/skills.ts`. Higher-scoring skills are fed first.
