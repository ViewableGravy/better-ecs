import { resolve } from "node:path";
import { defineConfig } from "vite";
import { libInjectCss } from "vite-plugin-lib-inject-css";

export default defineConfig({
  plugins: [libInjectCss()],
  resolve: {
    alias: {
      "@ui": resolve(__dirname, "src/ui"),
    },
  },
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
