import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/server.ts"],
	format: "esm",
	platform: "node",
	target: "node24",
	outDir: "dist",
	clean: true,
	sourcemap: true,
	fixedExtension: false, // output: dist/index.js (index.mjs না)
	copy: [{ from: "src/app/templates", to: "dist/templates" }],
});
