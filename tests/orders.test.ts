import { test } from "node:test";
import assert from "node:assert/strict";
import { priceOrder, isOpen } from "../src/lib/orders";
import { hashPassword, verify } from "../src/lib/auth";
import { paypal } from "../src/lib/payments";
const config = {
  days: [2, 3, 4, 5],
  open: 690,
  close: 960,
  closed: false,
  taxBps: 600,
  fee: 100,
};
const menu = [
  {
    id: "jerk",
    name: "Jerk",
    category: "Meals",
    available: true,
    price: 1500,
    bundlePrice: 2100,
  },
  {
    id: "ricepeas",
    name: "Rice & Peas",
    category: "Sides",
    available: true,
    price: 400,
  },
  {
    id: "cabbage",
    name: "Cabbage",
    category: "Sides",
    available: true,
    price: 300,
  },
];
test("integer pricing and coconut survive modifiers", () => {
  const r = priceOrder(
    [{ id: "jerk", quantity: 2, bundle: true, sides: ["ricepeas", "cabbage"] }],
    menu,
    config,
  );
  assert.equal(r.subtotal, 4200);
  assert.equal(r.tax, 252);
  assert.equal(r.total, 4552);
  assert.equal(r.items[0].coconut, true);
});
test("rejects forged quantities, duplicate sides, disabled bundles and unavailable items", () => {
  for (const lines of [
    [{ id: "jerk", quantity: -1, bundle: false, sides: [] }],
    [
      {
        id: "jerk",
        quantity: 1,
        bundle: true,
        sides: ["ricepeas", "ricepeas"],
      },
    ],
    [{ id: "jerk", quantity: 1, bundle: false, sides: ["ricepeas"] }],
    [{ id: "missing", quantity: 1, bundle: false, sides: [] }],
  ])
    assert.throws(() => priceOrder(lines, menu, config));
  assert.throws(() =>
    priceOrder(
      [
        {
          id: "jerk",
          quantity: 1,
          bundle: true,
          sides: ["ricepeas", "cabbage"],
        },
      ],
      [{ ...menu[0], bundlePrice: null }, ...menu.slice(1)],
      config,
    ),
  );
  assert.throws(() =>
    priceOrder(
      [{ id: "jerk", quantity: 1, bundle: false, sides: [] }],
      [{ ...menu[0], available: false }],
      config,
    ),
  );
});
test("Eastern operating boundaries, DST and closure", () => {
  assert.equal(isOpen(config, new Date("2026-10-27T15:29:00Z")), false);
  assert.equal(isOpen(config, new Date("2026-10-27T15:30:00Z")), true);
  assert.equal(isOpen(config, new Date("2026-10-27T20:00:00Z")), false);
  assert.equal(isOpen(config, new Date("2026-11-03T16:30:00Z")), true);
  assert.equal(
    isOpen({ ...config, closed: true }, new Date("2026-10-27T16:00:00Z")),
    false,
  );
});
test("password hashes salted and checked; payments fail closed", async () => {
  const a = hashPassword("test-password-long");
  assert.notEqual(a, hashPassword("test-password-long"));
  assert.equal(verify("test-password-long", a), true);
  assert.equal(verify("wrong", a), false);
  await assert.rejects(paypal.create("test"), /disabled/);
  await assert.rejects(paypal.capture("test"), /disabled/);
});
