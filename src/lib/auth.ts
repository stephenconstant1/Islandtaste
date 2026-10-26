import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verify(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export async function staff(request: Request) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("island_session="))
    ?.slice(15);
  if (!raw) return null;
  const {db}=await import("./db");
  return (
    (
      await (
        await db
      ).query<{ username: string }>(
        "SELECT username FROM sessions WHERE token=$1 AND expires>now()",
        [digest(raw)],
      )
    ).rows[0]?.username || null
  );
}
