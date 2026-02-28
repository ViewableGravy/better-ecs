import { resolve } from "node:path";
import { defineConfig } from "vite";
import { libInjectCss } from "vite-plugin-lib-inject-css";
import tsconfigPaths from "vite-tsconfig-paths";
import { shadersPlugin } from "./plugins/shaders";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [resolve(__dirname, "tsconfig.json"), resolve(__dirname, "tsconfig.lib.json")],
    }),
    libInjectCss(),
    shadersPlugin(),
  ],
  build: {
    outDir: "dist/src/ui",
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: true,
    lib: {
      entry: resolve(__dirname, "src/ui/index.tsx"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "styles",
    },
    rollupOptions: {
      external: [
        /^@repo\/engine(\/.*)?$/,
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@headlessui/react",
        "@phosphor-icons/react",
        "classnames",
        "tiny-invariant",
        "valtio",
      ],
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
