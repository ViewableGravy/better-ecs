#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT = process.cwd();
const CONFIG_PATH = path.resolve(ROOT, "scripts/ts-extend-paths/config.json");

const parseJson = (content, source) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`Invalid JSON in ${source}: ${message}`);
  }
};

const readTsConfig = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  const parsed = ts.parseConfigFileTextToJson(filePath, content);

  if (parsed.error) {
    const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n");
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }

  return parsed.config ?? {};
};

const normalizeAliasEntries = (entries, tsconfigPath) => {
  if (!Array.isArray(entries)) {
    throw new Error(`Expected an array of aliases for ${tsconfigPath}`);
  }

  const result = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Each alias entry for ${tsconfigPath} must be an object`);
    }

    const keys = Object.keys(entry);

    if (keys.length !== 1) {
      throw new Error(`Each alias entry for ${tsconfigPath} must contain exactly one alias key`);
    }

    const alias = keys[0];
    const targets = entry[alias];

    if (!Array.isArray(targets) || !targets.every((item) => typeof item === "string")) {
      throw new Error(`Alias '${alias}' for ${tsconfigPath} must map to an array of string paths`);
    }

    result[alias] = targets;
  }

  return result;
};

const main = async () => {
  const rawConfig = await readFile(CONFIG_PATH, "utf8");
  const config = parseJson(rawConfig, CONFIG_PATH);

  if (!config || typeof config !== "object") {
    throw new Error("The ts-extend-paths config must be an object");
  }

  if (typeof config.base !== "string") {
    throw new Error("The 'base' field must be a string path to a tsconfig file");
  }

  if (!config.paths || typeof config.paths !== "object" || Array.isArray(config.paths)) {
    throw new Error("The 'paths' field must be an object keyed by tsconfig path");
  }

  const baseConfigPath = path.resolve(ROOT, config.base);
  const baseConfig = await readTsConfig(baseConfigPath);
  const basePaths = baseConfig.compilerOptions?.paths ?? {};

  for (const [tsconfigRelativePath, aliasEntries] of Object.entries(config.paths)) {
    const tsconfigPath = path.resolve(ROOT, tsconfigRelativePath);
    const tsconfig = await readTsConfig(tsconfigPath);
    const additionalPaths = normalizeAliasEntries(aliasEntries, tsconfigRelativePath);

    if (!tsconfig.compilerOptions || typeof tsconfig.compilerOptions !== "object") {
      tsconfig.compilerOptions = {};
    }

    tsconfig.compilerOptions.paths = {
      ...basePaths,
      ...additionalPaths,
    };

    await writeFile(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
  }

  console.log(`Updated ${Object.keys(config.paths).length} tsconfig file(s).`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
