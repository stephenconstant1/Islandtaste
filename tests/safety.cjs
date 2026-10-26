const { readFileSync } = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const origin = "http://127.0.0.1:4321";
  let cookie = "";
  async function api(path, data) {
    const r = await fetch(origin + "/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const b = await r.json();
    return { status: r.status, body: b, headers: r.headers };
  }
  const login = await api(
    "login",
    JSON.parse(readFileSync(".data/demo-access.json", "utf8")),
  );
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  const initial = (await api("menu")).body,
    jerk = initial.items.find((i) => i.id === "jerk");
  const config = { ...initial.config, advance: true, taxBps: 600, fee: 100 };
  try {
    assert.equal((await api("settings", config)).status, 200);
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
    const body = {
      mode: "demo",
      name: "Safety Test",
      email: "test@example.test",
      phone: "4105550100",
      pickup: pickup.toISOString(),
      notes: "Automated safety check, not a real order.",
      lines: [{ id: "jerk", quantity: 1, bundle: false, sides: [] }],
      idempotencyKey: crypto.randomUUID(),
    };
    assert.equal(
      (await api("orders", { ...body, email: "invalid" })).status,
      400,
    );
    assert.equal(
      (await api("orders", { ...body, phone: "........" })).status,
      400,
    );
    assert.equal(
      (await api("orders", { ...body, pickup: new Date().toISOString() }))
        .status,
      400,
    );
    assert.equal(
      (
        await api("orders", {
          ...body,
          lines: [
            {
              id: "jerk",
              quantity: 1,
              bundle: true,
              sides: ["ricepeas", "cabbage"],
            },
          ],
        })
      ).status,
      400,
    );
    await api("menu", { ...jerk, available: false });
    assert.equal((await api("orders", body)).status, 400);
    await api("menu", jerk);
    await api("settings", { ...config, closed: true });
    assert.equal((await api("orders", body)).status, 400);
    await api("settings", config);
    const created = await api("orders", body);
    assert.equal(created.status, 201);
    const order = created.body.order;
    assert.equal(order.total, 1690);
    assert.equal(
      (
        await api("status", {
          id: order.id,
          status: "Completed",
          expectedStatus: "New Orders",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api("status", {
          id: order.id,
          status: "Cancelled",
          expectedStatus: "New Orders",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api("status", {
          id: order.id,
          status: "Accepted",
          expectedStatus: "Cancelled",
        })
      ).status,
      400,
    );
    const saved = (await api("orders")).body.orders.find(
      (o) => o.id === order.id,
    );
    assert.equal(saved.status, "Cancelled");
    assert.equal(saved.paymentStatus, "demo_unpaid");
    console.log(
      "PASS: contact validation, pickup lead time, unconfirmed bundles, unavailable items, temporary closure, server tax/fee calculation, sequential transitions and safe cancellation",
    );
  } finally {
    await api("menu", jerk);
    await api("settings", initial.config);
    await api("logout", {});
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
