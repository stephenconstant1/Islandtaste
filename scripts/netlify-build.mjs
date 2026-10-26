import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const environment = {
  ...process.env,
  NETLIFY: "true",
  DATABASE_REQUIRED: "true",
  ASTRO_TELEMETRY_DISABLED: "1",
};
const secretValues = [
  "DATABASE_URL",
  "NETLIFY_DATABASE_URL",
  "STAFF_PASSWORD",
  "NETLIFY_AUTH_TOKEN",
]
  .map((name) => environment[name])
  .filter((value) => value && value.length >= 4);
function redact(value = "") {
  let output = String(value);
  for (const secret of secretValues)
    output = output.split(secret).join("[redacted]");
  return output.replace(
    /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
    "[database connection redacted]",
  );
}
function stage(label, args) {
  console.log(`[Island Taste] START: ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(redact(result.stdout));
  if (result.stderr) process.stderr.write(redact(result.stderr));
  if (result.error || result.status !== 0) {
    console.error(
      `[Island Taste] FAILED: ${label} (exit ${result.status ?? "unknown"}).`,
    );
    if (result.error) console.error(redact(result.error.message));
    process.exit(result.status || 1);
  }
  console.log(`[Island Taste] PASS: ${label}`);
}
console.log(
  `[Island Taste] Build diagnostics started; Node ${process.version}.`,
);
for (const name of [
  "DATABASE_URL",
  "NETLIFY_DATABASE_URL",
  "STAFF_USERNAME",
  "STAFF_PASSWORD",
]) {
  console.log(
    `[Island Taste] ${name}: ${environment[name] ? "present" : "not configured"} (value hidden).`,
  );
}
if (!environment.DATABASE_URL && !environment.NETLIFY_DATABASE_URL) {
  console.error(
    "[Island Taste] STOP: No hosted database connection is available to this build. Configure DATABASE_URL for Builds and Functions, or make the managed NETLIFY_DATABASE_URL available to both scopes.",
  );
  process.exit(1);
}
try {
  require.resolve("tsx");
  require.resolve("astro/package.json");
} catch (error) {
  console.error(
    "[Island Taste] STOP: Build dependencies are missing. Netlify must install development dependencies, including tsx.",
  );
  console.error(redact(error.message));
  process.exit(1);
}
stage("database migration and initial staff account", [
  "--import",
  "tsx",
  "scripts/prepare-hosted.ts",
]);
stage("Astro Netlify function and asset build", [
  fileURLToPath(new URL("../node_modules/astro/astro.js", import.meta.url)),
  "build",
]);
console.log("[Island Taste] BUILD COMPLETE: ready for Netlify deployment.");
