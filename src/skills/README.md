# Skills

Each `.md` file in this directory is a **skill** — a piece of domain knowledge
the generator auto-injects into its system prompt when a new experiment matches
the skill's triggers.

## How it works

1. When you create + generate an experiment, the generator reads the topic,
   brief, and platform.
2. For each skill file, it scores relevance:
   - `triggers.platforms` must include the current platform (or be absent /
     contain `*` to apply to all platforms).
   - `triggers.topics` keywords are substring-matched against topic+brief.
     Each match = 1 relevance point.
   - `priority: high` adds +3 to the score; `medium` +1; `low` 0.
3. Skills with a positive score are sorted highest-first and packed into the
   prompt up to a ~3000 char budget.

## Authoring a skill

1. Copy `example-domain-skill.md` to a new file, e.g. `my-brand-voice.md`.
2. Fill in the YAML front matter and the markdown body.
3. `git add` + commit + push. Vercel auto-deploys; the next `Generate
   variants` run loads it automatically — no code change required.

## Tips

- Keep each skill under ~800 chars (front matter can set `max_chars` to
  enforce per-skill truncation).
- One skill = one idea. Don't pile 10 unrelated POVs into one file.
- Use examples of good + bad phrasing — LLMs learn style from examples.
- Review `src/lib/experiments/skills.ts` if you want to tweak the scoring.
