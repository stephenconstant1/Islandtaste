import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
const username = process.env.STAFF_USERNAME;
const password = process.env.STAFF_PASSWORD;
if (!username || !password || password.length < 12)
  throw Error(
    "Set STAFF_USERNAME and STAFF_PASSWORD (at least 12 characters) securely in the environment.",
  );
await (
  await db
).query(
  "INSERT INTO staff VALUES($1,$2) ON CONFLICT(username) DO UPDATE SET hash=excluded.hash",
  [username, hashPassword(password)],
);
await (await db).query("DELETE FROM sessions WHERE username=$1", [username]);
console.log("Staff account saved; existing sessions revoked.");
await (await db).close();
