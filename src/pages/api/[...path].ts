import type { APIRoute } from "astro";
import { randomBytes, randomUUID } from "node:crypto";
import { db, menu, settings } from "../../lib/db";
import { staff, verify, digest } from "../../lib/auth";
import { priceOrder, statuses, isOpen } from "../../lib/orders";
import { demoPayment } from "../../lib/payments";
export const prerender = false;
const json = (data: any, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
const text = (v: unknown, max: number) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw Error("Please complete all fields with valid values.");
  return v.trim();
};
export const ALL: APIRoute = async ({ request, url, params }) => {
  try {
    const path = params.path;
    const method = request.method;
    if (method !== "GET" && request.headers.get("origin") !== url.origin)
      return json({ error: "Request origin rejected." }, 403);
    if (method !== "GET") {
      const reader = request.clone().body?.getReader();
      let bytes = 0;
      if (reader) {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 20000) {
            void reader.cancel();
            return json({ error: "Request too large" }, 413);
          }
        }
      }
    }
    if (path === "menu" && method === "GET") {
      const config = await settings();
      return json({
        items: await menu(),
        config,
        open: isOpen(config),
        mode: "demo",
      });
    }
    if (path?.startsWith("payments/"))
      return json(
        {
          error: "Live PayPal payments are disabled. No payment was processed.",
        },
        503,
      );
    if (path === "login" && method === "POST") {
      const b = await request.json();
      const username = text(b.username, 80),
        password = text(b.password, 200);
      const d = await db;
      const key = digest(username);
      const attempts = (
        await d.query<any>(
          "SELECT * FROM login_attempts WHERE key=$1 AND reset_at>now()",
          [key],
        )
      ).rows[0];
      if (attempts?.attempts >= 5)
        return json(
          { error: "Too many attempts. Try again in 15 minutes." },
          429,
        );
      const row = (
        await d.query<{ hash: string }>(
          "SELECT hash FROM staff WHERE username=$1",
          [username],
        )
      ).rows[0];
      if (!row || !verify(password, row.hash)) {
        await d.query(
          `INSERT INTO login_attempts VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.reset_at<now() THEN 1 ELSE login_attempts.attempts+1 END, reset_at=CASE WHEN login_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE login_attempts.reset_at END`,
          [key],
        );
        return json({ error: "Invalid sign-in details." }, 401);
      }
      await d.query("DELETE FROM login_attempts WHERE key=$1", [key]);
      const token = randomBytes(32).toString("hex");
      await d.query(
        "INSERT INTO sessions VALUES($1,$2,now()+interval '8 hours')",
        [digest(token), username],
      );
      return json({ ok: true }, 200, {
        "Set-Cookie": `island_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === "https:" ? "; Secure" : ""}`,
      });
    }
    if (path === "orders" && method === "POST") {
      const b = await request.json();
      if (b.mode !== "demo")
        return json({ error: "Only test orders are enabled." }, 403);
      const customer = {
        name: text(b.name, 100),
        email: text(b.email, 200),
        phone: text(b.phone, 30),
      };
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
        !/^\+?[\d\s().-]{7,30}$/.test(customer.phone) ||
        !/^\d{7,15}$/.test(customer.phone.replace(/\D/g, ""))
      )
        throw Error("Enter a valid email and phone number.");
      const notes = typeof b.notes === "string" ? b.notes.trim() : "";
      if (notes.length > 1000)
        throw Error("Notes must be under 1,000 characters.");
      const idem = text(b.idempotencyKey, 80);
      if (!/^[\da-f-]{36}$/i.test(idem)) throw Error("Invalid checkout token.");
      const fingerprint = digest(
        JSON.stringify({ customer, notes, lines: b.lines, pickup: b.pickup }),
      );
      const result = await (
        await db
      ).transaction(async (tx) => {
        await tx.lock("checkout:" + idem);
        const existing = (
          await tx.query<any>(
            "SELECT data,fingerprint FROM orders WHERE idem=$1",
            [idem],
          )
        ).rows[0];
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw Error("Checkout token already used. Start a new checkout.");
          return existing.data;
        }
        const config = (
          await tx.query<any>("SELECT data FROM settings WHERE id=1")
        ).rows[0].data;
        const m = (await tx.query<any>("SELECT data FROM menu")).rows.map(
          (r) => r.data,
        );
        const pricing = priceOrder(b.lines, m, config);
        const pickup = new Date(b.pickup);
        const now = new Date();
        if (
          !Number.isFinite(pickup.getTime()) ||
          pickup.getTime() < now.getTime() + 15 * 60000 ||
          pickup.getTime() > now.getTime() + 7 * 86400000 ||
          !isOpen(config, pickup)
        )
          throw Error(
            "Choose pickup during open hours, 15 minutes to 7 days ahead. Temporary closures apply.",
          );
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
        });
        if (!config.advance && today.format(pickup) !== today.format(now))
          throw Error(
            "Advance pickup is disabled. Choose an open time today, or ask staff to enable advance demo scheduling.",
          );
        const id = "TEST-" + randomUUID();
        const data = {
          id,
          customer,
          notes,
          pickup: pickup.toISOString(),
          ...pricing,
          ...demoPayment,
          status: "New Orders",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        await tx.query(
          "INSERT INTO orders(id,idem,fingerprint,data) VALUES($1,$2,$3,$4)",
          [id, idem, fingerprint, JSON.stringify(data)],
        );
        await tx.query(
          "INSERT INTO audit(order_id,actor,status) VALUES($1,$2,$3)",
          [id, "demo checkout", "New Orders"],
        );
        return data;
      });
      return json({ order: result }, 201);
    }
    const actor = await staff(request);
    if (!actor) return json({ error: "Staff sign-in required." }, 401);
    if (path === "session" && method === "GET")
      return json({ username: actor });
    if (path === "logout" && method === "POST") {
      const raw = request.headers
        .get("cookie")
        ?.match(/island_session=([^;]+)/)?.[1];
      if (raw)
        await (
          await db
        ).query("DELETE FROM sessions WHERE token=$1", [digest(raw)]);
      return json({ ok: true }, 200, {
        "Set-Cookie":
          "island_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      });
    }
    if (path === "orders" && method === "GET")
      return json({
        orders: (
          await (
            await db
          ).query<any>(
            "SELECT data FROM orders ORDER BY created_at DESC LIMIT 300",
          )
        ).rows.map((r) => r.data),
      });
    if (path === "status" && method === "POST") {
      const b = await request.json();
      if (!statuses.includes(b.status)) throw Error("Invalid status.");
      await (
        await db
      ).transaction(async (tx) => {
        const row = (
          await tx.query<any>(
            "SELECT data FROM orders WHERE id=$1 FOR UPDATE",
            [b.id],
          )
        ).rows[0];
        if (!row) throw Error("Order not found.");
        const old = row.data;
        if (old.status !== b.expectedStatus)
          throw Error("Order changed. Refresh and retry.");
        if (["Completed", "Cancelled"].includes(old.status))
          throw Error("This order is already closed.");
        if (
          b.status !== "Cancelled" &&
          statuses.indexOf(b.status) !== statuses.indexOf(old.status) + 1
        )
          throw Error("Move the order through each preparation stage.");
        await tx.query("UPDATE orders SET data=$2 WHERE id=$1", [
          b.id,
          JSON.stringify({
            ...old,
            status: b.status,
            updatedAt: new Date().toISOString(),
          }),
        ]);
        await tx.query(
          "INSERT INTO audit(order_id,actor,status) VALUES($1,$2,$3)",
          [b.id, actor, b.status],
        );
      });
      return json({ ok: true });
    }
    if (path === "menu" && method === "POST") {
      const b = await request.json();
      const current = (await menu()).find((i) => i.id === b.id);
      if (!current) throw Error("Item not found.");
      const name = text(b.name, 100),
        description = text(b.description, 500);
      if (!["Meals", "Sides", "Drinks"].includes(b.category))
        throw Error("Invalid category.");
      if (
        !Number.isInteger(b.price) ||
        b.price < 0 ||
        b.price > 100000 ||
        typeof b.available !== "boolean" ||
        (b.bundlePrice !== null &&
          (!Number.isInteger(b.bundlePrice) ||
            b.bundlePrice < 0 ||
            b.bundlePrice > 100000))
      )
        throw Error("Invalid price or availability.");
      if (!/^[a-z0-9-]+\.(jpg|svg|png|webp)$/.test(b.image))
        throw Error("Choose a local image filename.");
      await (
        await db
      ).query("UPDATE menu SET data=$2 WHERE id=$1", [
        b.id,
        JSON.stringify({
          ...current,
          name,
          description,
          category: b.category,
          price: b.price,
          available: b.available,
          bundlePrice: b.category === "Meals" ? b.bundlePrice : null,
          image: b.image,
        }),
      ]);
      return json({ ok: true });
    }
    if (path === "settings" && method === "POST") {
      const b = await request.json();
      if (
        !Array.isArray(b.days) ||
        b.days.length > 7 ||
        !b.days.every((d: any) => Number.isInteger(d) && d >= 0 && d <= 6) ||
        !Number.isInteger(b.open) ||
        !Number.isInteger(b.close) ||
        b.open < 0 ||
        b.close > 1440 ||
        b.open >= b.close ||
        !Number.isInteger(b.taxBps) ||
        b.taxBps < 0 ||
        b.taxBps > 2500 ||
        !Number.isInteger(b.fee) ||
        b.fee < 0 ||
        b.fee > 10000 ||
        ["closed", "advance", "pricingConfirmed"].some(
          (k) => typeof b[k] !== "boolean",
        )
      )
        throw Error("Invalid restaurant settings.");
      await (
        await db
      ).query("UPDATE settings SET data=$1 WHERE id=1", [
        JSON.stringify({
          days: [...new Set(b.days)],
          open: b.open,
          close: b.close,
          taxBps: b.taxBps,
          fee: b.fee,
          closed: b.closed,
          advance: b.advance,
          pricingConfirmed: b.pricingConfirmed,
        }),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/sql|relation|constraint|wasm/i.test(e.message)
            ? e.message
            : "Unable to complete the request. Please retry.",
      },
      400,
    );
  }
};
