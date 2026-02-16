---
name: ${name}
description: ${description}
---

# ${title}

## Purpose

${purpose}

## When to use

- ${whenToUse1}
- ${whenToUse2}
- ${whenToUse3}

## Commands

Run:

- [${scriptFile}](./scripts/${scriptFile})

Examples:

- `bun .github/skills/${name}/scripts/${scriptFile} ${exampleArgs}`

## Behavior

1. ${behaviorStep1}
2. ${behaviorStep2}
3. ${behaviorStep3}

## Script authoring standard

Scripts must be TypeScript and use Bun shell syntax.

Reference: https://bun.com/docs/runtime/shell

Example scaffold:

```ts
#!/usr/bin/env bun
import { $ } from "bun";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun .github/skills/${name}/scripts/${scriptFile} <args>");
  process.exit(1);
}

const result = await $`echo ${"$"}{args.join(" ")}`.nothrow();

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
```
