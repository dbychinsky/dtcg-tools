import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/cli/index.ts"],
    clean: true,
    format: ["cjs"],
    outDir: "dist-cli",
    platform: "node",
    target: "node18",
    sourcemap: false,
    splitting: false,
    bundle: true,
    external: ["commander", "ajv", "ajv-formats", "dispersa", "dispersa/transforms"],
    shims: false,
    dts: false,
    outExtension() {
        return {
            js: ".cjs",
        };
    },
    banner: {
        js: "#!/usr/bin/env node",
    },
});
