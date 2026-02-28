import { expectTypeOf } from "vitest";
import { createAssetLoader, type AssetAdapter, type ShaderSourceAsset } from "../../asset";
import { createEngine } from "../../core";

const shaderAdapter: AssetAdapter<ShaderSourceAsset, "shader"> = {
  type: "shader",
  load: async () => ({
    type: "shader",
    vertex: "#version 300 es\nvoid main(){ gl_Position = vec4(0.0); }",
    fragment: "#version 300 es\nprecision mediump float; out vec4 fragColor; void main(){ fragColor = vec4(1.0); }",
  }),
};

const textAdapter: AssetAdapter<string, "text"> = {
  type: "text",
  load: async () => "hello",
};

const assets = createAssetLoader({
  "editor:demo-quad-shader": shaderAdapter,
  "docs:readme": textAdapter,
});

const engine = createEngine({
  systems: [],
  assetLoader: assets,
});

expectTypeOf(engine.assets.get("editor:demo-quad-shader")).toEqualTypeOf<
  ShaderSourceAsset | undefined
>();
expectTypeOf(engine.assets.getStrict("editor:demo-quad-shader")).toEqualTypeOf<ShaderSourceAsset>();

expectTypeOf(engine.assets.type("shader").get("editor:demo-quad-shader")).toEqualTypeOf<
  ShaderSourceAsset | undefined
>();
expectTypeOf(engine.assets.type("shader").getStrict("editor:demo-quad-shader")).toEqualTypeOf<
  ShaderSourceAsset
>();
expectTypeOf(engine.assets.type("shader").load("editor:demo-quad-shader")).toEqualTypeOf<
  Promise<ShaderSourceAsset>
>();

expectTypeOf(engine.assets.type("shader").getLoaded()).toEqualTypeOf<
  ReadonlyArray<{ key: "editor:demo-quad-shader"; asset: ShaderSourceAsset }>
>();

// @ts-expect-error text assets are not available from shader-typed accessors
engine.assets.type("shader").get("docs:readme");

// @ts-expect-error unknown key should fail on typed accessors
engine.assets.type("shader").get("missing:shader");

export { };

