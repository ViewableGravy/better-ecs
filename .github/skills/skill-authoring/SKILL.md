---
name: skill-authoring
description: Standardized process and template for creating or updating agent skills in this repository.
---

# Skill Authoring Standard

Use this skill whenever creating or updating any skill under .github/skills.

## Required workflow

1. Start from [TEMPLATE.md](./TEMPLATE.md).
2. Fill in all placeholders (for example ${name}, ${description}).
3. Keep scripts inside ./scripts.
3.1. Only create a scripts folder or files if the skill requires scripts. Omit links in the template if no scripts are needed.
4. Write scripts as TypeScript using Bun shell syntax (`import { $ } from "bun"`).
5. Reference scripts from the skill markdown using relative links.

## Script requirements

- Script location: .github/skills/<skill-name>/scripts/*
- Runtime: Bun
- Style: Bun shell syntax (cross-platform)
- Docs: https://bun.com/docs/runtime/shell

## Notes

- Do not add agent-only helper scripts to package.json.
- Skills should be runnable directly with `bun <relative-script-path>`.
- Keep skill docs concise and consistent with the template.
