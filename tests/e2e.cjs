const { chromium } = require("playwright");
const { readFileSync, writeFileSync } = require("node:fs");
const assert = require("node:assert/strict");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const cleanups = [];
  try {
    const staffContext = await browser.newContext();
    const customerContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    const staff = await staffContext.newPage();
    const customer = await customerContext.newPage();
    for (const p of [staff, customer])
      p.on("pageerror", (e) => errors.push(e.message));
    const call = async (path, data, context = staffContext) => {
      const r = await context.request.fetch(origin + "/api/" + path, {
        method: data === undefined ? "GET" : "POST",
        headers: data === undefined ? {} : { Origin: origin },
        data,
      });
      return { status: r.status(), body: await r.json() };
    };
    assert.equal(
      (await call("orders", undefined, customerContext)).status,
      401,
    );
    assert.equal(
      (await call("settings", { closed: true }, customerContext)).status,
      401,
    );
    const csrf = await staffContext.request.post(origin + "/api/login", {
      headers: { Origin: "https://example.invalid" },
      data: { username: "x", password: "x" },
    });
    assert.equal(csrf.status(), 403);
    for (const p of ["create", "capture", "webhook", "reconcile"])
      assert.equal((await call("payments/" + p, {})).status, 503);
    console.log(
      "PASS: staff authorization, cross-origin rejection and all disabled payment endpoints",
    );
    await staff.goto(origin + "/staff");
    const credentials = JSON.parse(
      readFileSync(".data/demo-access.json", "utf8"),
    );
    await staff
      .getByLabel("Username", { exact: true })
      .fill(credentials.username);
    await staff
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
    await staff.getByRole("button", { name: "Sign in securely" }).click();
    await staff
      .getByRole("heading", { name: "Restaurant dashboard" })
      .waitFor();
    const initial = (await call("menu")).body;
    const config = { ...initial.config, advance: true };
    assert.equal((await call("settings", config)).status, 200);
    const jerk = initial.items.find((i) => i.id === "jerk");
    cleanups.push(async () => {
      await call("menu", jerk);
      await call("settings", initial.config);
    });
    assert.equal(
      (await call("menu", { ...jerk, bundlePrice: 2100 })).status,
      200,
    );
    await customer.goto(origin);
    await customer
      .getByRole("button", { name: "Customize +" })
      .first()
      .waitFor();
    await customer
      .getByRole("button", { name: "Customize +" })
      .filter({ visible: true })
      .first()
      .click();
    // The menu is sorted by id; select the confirmed Jerk Chicken card explicitly.
    await customer.getByRole("button", { name: "Close dialog" }).click();
    await customer
      .locator("article")
      .filter({
        has: customer.getByRole("heading", {
          name: "Jerk Chicken",
          exact: true,
        }),
      })
      .getByRole("button", { name: "Customize +" })
      .click();
    await customer.getByLabel("Meal style").selectOption("bundle");
    await customer.getByLabel("Rice & Peas — contains coconut").check();
    await customer
      .getByRole("checkbox", { name: "Fried Cabbage", exact: true })
      .check();
    await customer.getByRole("button", { name: "Add to order" }).click();
    await customer
      .getByRole("button", { name: "Increase Jerk Chicken" })
      .click();
    await customer.reload();
    await customer.getByRole("button", { name: "Review test order" }).click();
    await customer.getByLabel("Full name").fill("Demo Acceptance");
    await customer.getByLabel("Phone number").fill("4105550100");
    await customer.getByLabel("Email address").fill("demo@example.test");
    // Find a future open pickup in the configured Eastern hours.
    let pickup;
    for (let h = 1; h <= 168; h++) {
      const d = new Date(Date.now() + h * 3600000);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(d);
      const get = (t) => parts.find((p) => p.type === t).value;
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
          get("weekday"),
        ),
        mins = Number(get("hour")) * 60 + Number(get("minute"));
      if (
        config.days.includes(day) &&
        mins >= config.open &&
        mins < config.close
      ) {
        pickup = d;
        break;
      }
    }
    assert.ok(pickup);
    const local = new Date(
      pickup.getTime() - pickup.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    await customer.getByLabel("Pickup time").fill(local);
    await customer
      .getByLabel("Order notes")
      .fill("Acceptance test. No real meal.");
    await customer.getByLabel("I understand this is a test order").check();
    await customer.getByRole("button", { name: "Submit test order" }).click();
    await customer
      .getByText("TEST ORDER · NOT PAID", { exact: true })
      .waitFor();
    await customer.reload();
    await customer
      .getByText("TEST ORDER · NOT PAID", { exact: true })
      .waitFor();
    const orders = (await call("orders")).body.orders;
    const order = orders.find((o) => o.customer.name === "Demo Acceptance");
    assert.ok(order);
    assert.equal(order.total, 4200);
    assert.equal(order.paymentStatus, "demo_unpaid");
    assert.equal(order.items[0].sides.length, 2);
    assert.equal(order.items[0].coconut, true);
    console.log(
      "PASS: mobile customized meal, quantity, cart refresh, checkout validation, persisted test confirmation and server-side total",
    );
    const key = await customer.evaluate(() =>
      sessionStorage.getItem("island-checkout-key"),
    );
    const body = {
      mode: "demo",
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      pickup: order.pickup,
      notes: order.notes,
      lines: [
        {
          id: "jerk",
          quantity: 2,
          bundle: true,
          sides: ["cabbage", "ricepeas"],
        },
      ],
      idempotencyKey: crypto.randomUUID(),
      price: 1,
    };
    const a = await call("orders", body, customerContext),
      b = await call("orders", body, customerContext);
    assert.equal(a.status, 201);
    assert.equal(a.body.order.id, b.body.order.id);
    assert.equal(a.body.order.total, 4200);
    assert.equal(
      (
        await call(
          "orders",
          {
            ...body,
            lines: [
              {
                id: "jerk",
                quantity: 2,
                bundle: true,
                sides: ["ricepeas", "ricepeas"],
              },
            ],
            idempotencyKey: crypto.randomUUID(),
          },
          customerContext,
        )
      ).status,
      400,
    );
    assert.equal(
      (await call("orders", { ...body, mode: "production" }, customerContext))
        .status,
      403,
    );
    assert.equal(
      (
        await call(
          "orders",
          { ...body, name: "Changed payload" },
          customerContext,
        )
      ).status,
      400,
    );
    console.log(
      "PASS: idempotency, conflicting replay, forged price ignored, invalid modifiers and production order rejection",
    );
    await staff
      .getByRole("heading", { name: "Demo Acceptance" })
      .first()
      .waitFor({ timeout: 12000 });
    const card = staff.locator(".order-card").filter({ hasText: order.id });
    await card.getByRole("button", { name: "Accepted →" }).click();
    await staff.getByRole("button", { name: /^Accepted \(/ }).click();
    await card.getByRole("button", { name: "Preparing →" }).click();
    await staff.getByRole("button", { name: /^Preparing \(/ }).click();
    await card.getByRole("button", { name: "Ready for Pickup →" }).click();
    await staff.getByRole("button", { name: /^Ready for Pickup \(/ }).click();
    await card.getByRole("button", { name: "Completed →" }).click();
    await staff.getByRole("button", { name: /^Completed \(/ }).click();
    await card.waitFor();
    console.log("PASS: dashboard polling and full kitchen status lifecycle");
    await call("menu", jerk);
    await call("settings", initial.config);
    await customer.goto(origin);
    await customer.getByRole("button", { name: "Explore the menu" }).click();
    await customer.screenshot({ path: ".data/mobile.png", fullPage: true });
    await customer.setViewportSize({ width: 1440, height: 1000 });
    await customer.screenshot({ path: ".data/desktop.png", fullPage: true });
    assert.equal(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await customer.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    writeFileSync(
      ".data/acceptance-order.json",
      JSON.stringify({ id: order.id }, null, 2),
    );
    await staff.getByRole("button", { name: "Sign out", exact: true }).click();
    assert.equal((await call("orders")).status, 401);
    console.log(
      "PASS: responsive widths, receipt refresh, no runtime errors and logout revocation",
    );
  } finally {
    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch {}
    }
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
