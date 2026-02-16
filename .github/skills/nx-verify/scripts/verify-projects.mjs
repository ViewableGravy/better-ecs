#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const projects = process.argv.slice(2).filter(Boolean);

if (projects.length === 0) {
  console.error("Usage: bun .github/skills/nx-verify/scripts/verify-projects.mjs <project> [...project]");
  process.exit(1);
}

const projectList = projects.join(",");
const targets = ["typecheck", "lint", "test"];

const supportedTargetsByProject = new Map();

for (const project of projects) {
  const projectResult = spawnSync("bun", ["x", "nx", "show", "project", project, "--json"], {
    encoding: "utf8",
    env: {
      ...process.env,
      NX_TERMINAL_OUTPUT_STYLE: "static",
    },
  });

  if (projectResult.status !== 0) {
    console.error(projectResult.stderr || projectResult.stdout);
    process.exit(projectResult.status ?? 1);
  }

  const projectConfig = JSON.parse(projectResult.stdout);
  supportedTargetsByProject.set(project, new Set(Object.keys(projectConfig.targets ?? {})));
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
  const args = [
    "x",
    "nx",
    "run-many",
    `--target=${target}`,
    `--projects=${targetProjectList}`,
    "--outputStyle=static",
  ];

  console.log(`\n▶ Running ${target} for: ${targetProjectList}`);

  const result = spawnSync("bun", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NX_TERMINAL_OUTPUT_STYLE: "static",
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n✅ Verification passed for: ${projectList}`);
