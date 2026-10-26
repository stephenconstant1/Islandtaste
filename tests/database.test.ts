import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../src/lib/database";

const names = [
  "DATABASE_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DB_URL",
  "NETLIFY_DB_DRIVER",
  "NETLIFY",
  "DATABASE_REQUIRED",
] as const;

async function withEnvironment(
  values: Record<string, string>,
  run: () => Promise<void>,
) {
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  try {
    for (const name of names) delete process.env[name];
    Object.assign(process.env, values);
    await run();
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
}

test("managed Netlify connection initializes without either legacy URL", async () => {
  await withEnvironment(
    { NETLIFY: "true", NETLIFY_DB_URL: "postgresql://localhost:1/island_test" },
    async () => {
      const database = await connectDatabase();
      // Pool creation is lazy: no query or connection to a real database is needed.
      await database.close();
    },
  );
});

test("hosted deployment without any connection refuses local fallback", async () => {
  await withEnvironment({ NETLIFY: "true" }, async () => {
    await assert.rejects(connectDatabase(), /Enable Netlify Database/);
  });
});

test("explicit URLs retain priority and PostgreSQL validation", async () => {
  await withEnvironment(
    {
      NETLIFY: "true",
      DATABASE_URL: "https://example.invalid",
      NETLIFY_DB_URL: "postgresql://localhost:1/island_test",
    },
    async () => {
      await assert.rejects(
        connectDatabase(),
        /PostgreSQL connection URL is required/,
      );
    },
  );
});
