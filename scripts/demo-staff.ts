import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
const d = await db;
const destination = resolve(
  process.env.DATA_DIR || ".data",
  "demo-access.json",
);
if (existsSync(destination))
  throw Error(
    "Access file already exists; use staff:create to rotate credentials deliberately.",
  );
const username = "owner";
const password = randomBytes(24).toString("base64url");
await d.query("INSERT INTO staff VALUES($1,$2)", [
  username,
  hashPassword(password),
]);
writeFileSync(
  destination,
  JSON.stringify({ username, password }, null, 2) + "\n",
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Generated local demonstration account. Read .data/demo-access.json locally; do not commit or share this file.",
);
await d.close();
