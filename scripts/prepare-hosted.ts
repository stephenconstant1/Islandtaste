/** Runs on Netlify before building; never prints connection details or passwords. */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
if (
  !process.env.DATABASE_URL &&
  !process.env.NETLIFY_DATABASE_URL &&
  !process.env.NETLIFY_DB_URL
)
  throw Error(
    "Set DATABASE_URL (or enable Netlify Database) in Netlify build and function environment settings.",
  );
const d = await db;
try {
  await d.transaction(async (tx) => {
    await tx.lock("island-taste-staff-bootstrap");
    const existing = await tx.query("SELECT username FROM staff LIMIT 1");
    if (existing.rows.length) return;
    const username = process.env.STAFF_USERNAME;
    const password = process.env.STAFF_PASSWORD;
    if (!username || username.length > 80 || !password || password.length < 12)
      throw Error(
        "A fresh hosted database requires STAFF_USERNAME and STAFF_PASSWORD (12+ characters), set securely in Netlify build environment settings.",
      );
    await tx.query("INSERT INTO staff(username,hash) VALUES($1,$2)", [
      username,
      hashPassword(password),
    ]);
  });
  console.log(
    "Hosted database migration and staff bootstrap completed. Existing accounts preserved.",
  );
} finally {
  await d.close();
}
