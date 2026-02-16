#!/usr/bin/env bun

type ShellResult = {
  exitCode?: number;
};

type ShellCommand = {
  (strings: TemplateStringsArray, ...values: unknown[]): ShellCommand;
  env(vars: Record<string, string | undefined>): ShellCommand;
  quiet(): ShellCommand;
  text(): Promise<string>;
  nothrow(): Promise<ShellResult>;
};

declare const Bun: {
  $: ShellCommand;
};

const $ = Bun.$;

const projects = process.argv.slice(2).filter(Boolean);

if (projects.length === 0) {
  console.error("Usage: bun .github/skills/nx-verify/scripts/verify-projects.ts <project> [...project]");
  process.exit(1);
}

const projectList = projects.join(",");
const targets = ["typecheck", "lint", "test"] as const;

type NxProjectJson = {
  targets?: Record<string, unknown>;
};

const supportedTargetsByProject = new Map<string, Set<string>>();

for (const project of projects) {
  const projectJsonText = await $
    .env({
      ...process.env,
      NX_TERMINAL_OUTPUT_STYLE: "static",
    })`bun x nx show project ${project} --json`
    .quiet()
    .text();

  const projectJson = JSON.parse(projectJsonText) as NxProjectJson;
  supportedTargetsByProject.set(project, new Set(Object.keys(projectJson.targets ?? {})));
}

for (const target of targets) {
  const targetProjects = projects.filter((project) =>
    supportedTargetsByProject.get(project)?.has(target),
  );

  if (targetProjects.length === 0) {
    console.log(`\n↷ Skipping ${target} (no selected projects expose this target)`);
    continue;
  }

  const targetProjectList = targetProjects.join(",");
  console.log(`\n▶ Running ${target} for: ${targetProjectList}`);

  const result = await $
    .env({
      ...process.env,
      NX_TERMINAL_OUTPUT_STYLE: "static",
    })`bun x nx run-many --target=${target} --projects=${targetProjectList} --outputStyle=static`
    .nothrow();

  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

console.log(`\n✅ Verification passed for: ${projectList}`);

export { };

