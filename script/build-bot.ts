import { build as esbuild } from "esbuild";
import { readFile, mkdir } from "fs/promises";

async function buildBot() {
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const externals = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  await mkdir("dist", { recursive: true });
  await esbuild({
    entryPoints: ["server/bot-entry.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/bot.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: externals,
    logLevel: "info",
  });
}

buildBot().catch((err) => {
  console.error(err);
  process.exit(1);
});