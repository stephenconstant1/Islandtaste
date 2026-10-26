const { readFileSync } = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const origin = "http://127.0.0.1:4321";
  const credentials = JSON.parse(
    readFileSync(".data/demo-access.json", "utf8"),
  );
  const login = await fetch(origin + "/api/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const r = await fetch(origin + "/api/orders", {
    headers: { Cookie: cookie },
  });
  assert.equal(r.status, 200);
  const { id } = JSON.parse(
    readFileSync(".data/acceptance-order.json", "utf8"),
  );
  const order = (await r.json()).orders.find((o) => o.id === id);
  assert.ok(order);
  assert.equal(order.status, "Completed");
  assert.equal(order.paymentStatus, "demo_unpaid");
  assert.equal(order.items[0].quantity, 2);
  console.log(
    "PASS: completed order, immutable item snapshot and unpaid test status survive Node server restart",
  );
  await fetch(origin + "/api/logout", {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
