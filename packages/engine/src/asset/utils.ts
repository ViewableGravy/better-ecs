import type { ShaderSourceAsset } from "./loaders";

export function isShaderSourceAsset(value: unknown): value is ShaderSourceAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = Reflect.get(value, "type");
  if (type !== "shader") {
    return false;
  }

  const vertex = Reflect.get(value, "vertex");
  if (typeof vertex !== "string") {
    return false;
  }

  const fragment = Reflect.get(value, "fragment");
  if (typeof fragment !== "string") {
    return false;
  }

  return true;
}