import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/server.ts"],
	format: "esm",
	platform: "node",
	target: "node24",
	outDir: "dist",
	clean: true,
	sourcemap: true,
	fixedExtension: false, // output: dist/server.js (server.mjs না)
	// "to" হলো যে folder-এর ভেতরে কপি হবে → dist/ + templates = dist/templates
	copy: [{ from: "src/app/templates", to: "dist" }],
});
