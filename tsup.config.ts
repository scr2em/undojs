import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    platform: "neutral",
    format: ["cjs", "esm"], // Build for commonJS and ESmodules
    outDir: "./dist",
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    minify: true,
    clean: true,
  },
  {
    name: "react",
    entry: ["src/react/index.ts"],
    platform: "neutral",
    format: ["cjs", "esm"],
    outDir: "./dist/react",
    dts: true,
    splitting: false,
    sourcemap: true,
    minify: true,
    clean: true,
  },
  {
    name: "zustand",
    entry: ["src/zustand/index.ts"],
    platform: "neutral",
    format: ["cjs", "esm"],
    outDir: "./dist/zustand",
    dts: true,
    splitting: false,
    sourcemap: true,
    minify: true,
    clean: true,
  },
]);
