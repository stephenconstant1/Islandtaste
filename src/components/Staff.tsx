import React, { useEffect, useRef, useState } from "react";
import { api, money, type Item } from "./shared";
const statuses = [
  "New Orders",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
];
export default function Staff() {
  const [user, setUser] = useState<string | null>(null),
    [checking, setChecking] = useState(true),
    [orders, setOrders] = useState<any[]>([]),
    [items, setItems] = useState<Item[]>([]),
    [config, setConfig] = useState<any>(null),
    [tab, setTab] = useState("Orders"),
    [status, setStatus] = useState("New Orders"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [kitchen, setKitchen] = useState(false),
    [sound, setSound] = useState(false),
    [updated, setUpdated] = useState("");
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  async function refresh() {
    const d = await api("orders");
    if (
      sound &&
      seen.current &&
      d.orders.some((o: any) => !seen.current!.has(o.id))
    ) {
      const a = audio.current;
      if (a) {
        await a.resume();
        const osc = a.createOscillator(),
          gain = a.createGain();
        osc.connect(gain);
        gain.connect(a.destination);
        gain.gain.value = 0.08;
        osc.frequency.value = 660;
        osc.start();
        osc.stop(a.currentTime + 0.2);
      }
    }
    seen.current = new Set(d.orders.map((o: any) => o.id));
    setOrders(d.orders);
    setUpdated(new Date().toLocaleTimeString());
  }
  async function loadMenu() {
    const d = await api("menu");
    setItems(d.items);
    setConfig(d.config);
  }
  useEffect(() => {
    api("session")
      .then((d) => setUser(d.username))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    refresh().catch((e) => setError(e.message));
    loadMenu().catch((e) => setError(e.message));
    const id = setInterval(
      () => refresh().catch((e) => setError(e.message)),
      5000,
    );
    return () => clearInterval(id);
  }, [user, sound]);
  async function run(fn: () => Promise<void>, success = "Saved.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(async () => {
      await api("login", {
        username: f.get("username"),
        password: f.get("password"),
      });
      const d = await api("session");
      setUser(d.username);
    }, "Signed in.");
  }
  return (
    <>
      <div className="demo-banner">
        ISLAND TASTE · DEMONSTRATION KITCHEN · All orders are unpaid tests
      </div>
      <header className="site-header">
        <a className="brand" href="/">
          <img src="/images/favicon.svg" alt="Island Taste logo" />
          Island Taste
        </a>
        <a href="/">← Customer menu</a>
      </header>
      {checking ? (
        <p className="wrap" role="status">
          Checking your session…
        </p>
      ) : !user ? (
        <main className="checkout">
          <div className="eyebrow">Restaurant operations</div>
          <h1>Welcome back.</h1>
          <p>
            Sign in to your staff account to manage the demonstration kitchen.
          </p>
          <form onSubmit={login}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={80}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 20 }}>
            Accounts are created by the environment administrator. There is no
            public registration or shared default password.
          </p>
        </main>
      ) : (
        <main className={"dashboard" + (kitchen ? " kitchen" : "")}>
          <div className="eyebrow">Easton · {user}</div>
          <h1>{kitchen ? "Kitchen view" : "Restaurant dashboard"}</h1>
          <div className="dashboard-bar">
            <button className="secondary" onClick={() => setTab("Orders")}>
              Orders
            </button>
            <button
              className="secondary"
              onClick={() => {
                setTab("Menu");
                loadMenu();
              }}
            >
              Menu management
            </button>
            <button
              className="secondary"
              onClick={() => {
                setTab("Settings");
                loadMenu();
              }}
            >
              Hours & settings
            </button>
            <button className="secondary" onClick={() => setKitchen((v) => !v)}>
              {kitchen ? "Standard view" : "Large kitchen view"}
            </button>
            <label>
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => {
                  if (e.target.checked) {
                    audio.current ??= new AudioContext();
                    audio.current.resume();
                  }
                  setSound(e.target.checked);
                }}
              />
              New-order sound
            </label>
            <button
              className="secondary"
              onClick={() =>
                run(async () => {
                  await api("logout", {});
                  setUser(null);
                }, "Signed out.")
              }
            >
              Sign out
            </button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          {tab === "Orders" && (
            <>
              <div className="tabs" role="group" aria-label="Order status">
                {statuses.map((s) => (
                  <button
                    key={s}
                    className={status === s ? "active" : ""}
                    onClick={() => setStatus(s)}
                  >
                    {s} ({orders.filter((o) => o.status === s).length})
                  </button>
                ))}
              </div>
              <p className="muted">
                Updates every 5 seconds · Last refreshed {updated || "…"} ·
                Latest 300 orders
              </p>
              <div className="board">
                {orders
                  .filter((o) => o.status === status)
                  .map((o) => (
                    <article className="order-card" key={o.id}>
                      <div className="eyebrow">TEST · NOT PAID</div>
                      <h3>{o.customer.name}</h3>
                      <small style={{ overflowWrap: "anywhere" }}>
                        #{o.id}
                      </small>
                      <p>
                        <strong>
                          Pickup:{" "}
                          {new Date(o.pickup).toLocaleString("en-US", {
                            timeZone: "America/New_York",
                          })}{" "}
                          ET
                        </strong>
                      </p>
                      {!kitchen && (
                        <p>
                          <a href={"tel:" + o.customer.phone}>
                            {o.customer.phone}
                          </a>
                          <br />
                          <a href={"mailto:" + o.customer.email}>
                            {o.customer.email}
                          </a>
                        </p>
                      )}
                      <ul>
                        {o.items.map((i: any, index: number) => (
                          <li key={index}>
                            <strong>
                              {i.quantity} × {i.name}
                            </strong>
                            {i.bundle && " · Meal"}
                            {i.sides.length > 0 && (
                              <div>
                                {i.sides.map((s: any) => s.name).join(" · ")}
                              </div>
                            )}
                            {i.coconut && (
                              <div className="notice">Contains coconut</div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="notice">Notes: {o.notes}</p>}
                      <p>
                        Total: <strong>{money(o.total)}</strong> · {o.status}
                      </p>
                      <small>
                        Placed {new Date(o.createdAt).toLocaleString()}
                        <br />
                        Updated {new Date(o.updatedAt).toLocaleString()}
                        <br />
                        Payment:{" "}
                        {o.status === "Cancelled"
                          ? "Cancelled test · no charge or refund"
                          : o.mode + " · " + o.status + " · " + o.paymentStatus}
                      </small>
                      {!["Completed", "Cancelled"].includes(o.status) && (
                        <div className="dashboard-bar">
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api("status", {
                                  id: o.id,
                                  status:
                                    statuses[statuses.indexOf(o.status) + 1],
                                  expectedStatus: o.status,
                                });
                                await refresh();
                              }, "Order updated.")
                            }
                          >
                            {statuses[statuses.indexOf(o.status) + 1]} →
                          </button>
                          <button
                            className="danger"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api("status", {
                                  id: o.id,
                                  status: "Cancelled",
                                  expectedStatus: o.status,
                                });
                                await refresh();
                              }, "Test order cancelled. No payment was collected.")
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
              </div>
              {!orders.some((o) => o.status === status) && (
                <div className="cart-empty">
                  No {status.toLowerCase()} yet. Test orders will appear here
                  automatically.
                </div>
              )}
            </>
          )}
          {tab === "Menu" && (
            <>
              <h2>Your menu, your way.</h2>
              <p className="muted">
                Prices are in cents. Combination price is the total for one meat
                and exactly two sides. Leave blank until owner confirmed.
                Existing orders keep their original prices.
              </p>
              <div className="admin-grid">
                {items.map((item) => (
                  <form
                    className="editor"
                    key={item.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run(async () => {
                        await api("menu", {
                          ...item,
                          name: f.get("name"),
                          description: f.get("description"),
                          category: f.get("category"),
                          image: f.get("image"),
                          price: Number(f.get("price")),
                          bundlePrice:
                            f.get("bundlePrice") === ""
                              ? null
                              : Number(f.get("bundlePrice")),
                          available: f.get("available") === "on",
                        });
                        await loadMenu();
                      }, "Menu item saved.");
                    }}
                  >
                    <h3>{item.name}</h3>
                    <label>
                      Name
                      <input
                        name="name"
                        defaultValue={item.name}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        defaultValue={item.description}
                        required
                        maxLength={500}
                      />
                    </label>
                    <label>
                      Category
                      <select name="category" defaultValue={item.category}>
                        {["Meals", "Sides", "Drinks"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      À la carte price (cents)
                      <input
                        name="price"
                        type="number"
                        min={0}
                        max={100000}
                        step={1}
                        defaultValue={item.price}
                        required
                      />
                    </label>
                    <label>
                      Confirmed meal total (cents)
                      <input
                        name="bundlePrice"
                        type="number"
                        min={0}
                        max={100000}
                        step={1}
                        defaultValue={item.bundlePrice ?? ""}
                      />
                    </label>
                    <label>
                      Local image
                      <select name="image" defaultValue={item.image}>
                        {[
                          "jerk.jpg",
                          "shrimp.jpg",
                          "salmon.jpg",
                          "ricepeas.jpg",
                          "whiterice.jpg",
                          "cabbage.jpg",
                          "greenbeans.jpg",
                          "plantains.svg",
                          "cans.jpg",
                          "water.jpg",
                        ].map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        name="available"
                        type="checkbox"
                        defaultChecked={item.available}
                      />
                      Available to order
                    </label>
                    <button disabled={busy} className="full">
                      Save item
                    </button>
                  </form>
                ))}
              </div>
            </>
          )}
          {tab === "Settings" && config && (
            <form
              className="editor"
              style={{ maxWidth: 650 }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(async () => {
                  await api("settings", {
                    days: f.getAll("days").map(Number),
                    open: Number(f.get("open")),
                    close: Number(f.get("close")),
                    closed: f.get("closed") === "on",
                    advance: f.get("advance") === "on",
                    taxBps: Number(f.get("taxBps")),
                    fee: Number(f.get("fee")),
                    pricingConfirmed: f.get("pricingConfirmed") === "on",
                  });
                  await loadMenu();
                }, "Restaurant settings saved.");
              }}
            >
              <h2>Hours & availability</h2>
              <p className="muted">
                All operating hours use America/New_York. Demo orders follow
                these hours too. Enable advance scheduling to test future open
                days.
              </p>
              <fieldset>
                <legend>Open days</legend>
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((d, i) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      name="days"
                      value={i}
                      defaultChecked={config.days.includes(i)}
                    />
                    {d}
                  </label>
                ))}
              </fieldset>
              <label>
                Open time (minutes after midnight, Eastern)
                <input
                  name="open"
                  type="number"
                  min={0}
                  max={1439}
                  defaultValue={config.open}
                  required
                />
              </label>
              <label>
                Close time (minutes after midnight, Eastern)
                <input
                  name="close"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={config.close}
                  required
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="closed"
                  defaultChecked={config.closed}
                />
                Temporary closure
              </label>
              <label>
                <input
                  type="checkbox"
                  name="advance"
                  defaultChecked={config.advance}
                />
                Allow advance pickup (up to 7 days)
              </label>
              <label>
                Demo tax rate (basis points: 600 = 6%)
                <input
                  type="number"
                  name="taxBps"
                  min={0}
                  max={2500}
                  defaultValue={config.taxBps}
                  required
                />
              </label>
              <label>
                Demo fee (cents)
                <input
                  type="number"
                  name="fee"
                  min={0}
                  max={10000}
                  defaultValue={config.fee}
                  required
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="pricingConfirmed"
                  defaultChecked={config.pricingConfirmed}
                />
                Owner has confirmed tax and fees
              </label>
              <button disabled={busy}>Save settings</button>
              <p className="notice">
                Production payments remain disabled regardless of these
                settings.
              </p>
            </form>
          )}
        </main>
      )}
    </>
  );
}
