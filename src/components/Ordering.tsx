import {
  HeritageRibbon,
  TropicalDecor,
  Palm,
  FlavorStrip,
  Community,
  FooterWave,
} from "./Heritage";
import React, { useEffect, useRef, useState } from "react";
import { api, money, type Item, type CartLine } from "./shared";
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal"
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-top">
          <h2>{title}</h2>
          <button
            onClick={close}
            aria-label="Close dialog"
            className="secondary"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function Ordering() {
  const [items, setItems] = useState<Item[]>([]),
    [config, setConfig] = useState<any>(null),
    [open, setOpen] = useState(false),
    [category, setCategory] = useState("All"),
    [cart, setCart] = useState<CartLine[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [chosen, setChosen] = useState<Item | null>(null),
    [preview, setPreview] = useState<Item | null>(null),
    [hoverPreview, setHoverPreview] = useState<Item | null>(null),
    [sides, setSides] = useState<string[]>([]),
    [bundle, setBundle] = useState(false),
    [view, setView] = useState("menu"),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const key = useRef("");
  useEffect(() => {
    api("menu")
      .then((d) => {
        setItems(d.items);
        setConfig(d.config);
        setOpen(d.open);
      })
      .catch((e) => setError(e.message));
    try {
      const saved = JSON.parse(sessionStorage.getItem("island-cart") || "[]");
      if (Array.isArray(saved)) setCart(saved);
      const receipt = JSON.parse(
        sessionStorage.getItem("island-receipt") || "null",
      );
      if (receipt) {
        setOrder(receipt);
        setView("confirmation");
      }
      key.current =
        sessionStorage.getItem("island-checkout-key") || crypto.randomUUID();
      sessionStorage.setItem("island-checkout-key", key.current);
    } catch {
      key.current = crypto.randomUUID();
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) sessionStorage.setItem("island-cart", JSON.stringify(cart));
  }, [cart, loaded]);
  const lines = cart
    .map((l, index) => ({
      ...l,
      index,
      item: items.find((i) => i.id === l.id),
    }))
    .filter((l) => l.item);
  const subtotal = lines.reduce(
    (sum, l) =>
      sum +
      (l.bundle ? (l.item!.bundlePrice ?? 0) : l.item!.price) * l.quantity,
    0,
  );
  const tax = Math.round((subtotal * (config?.taxBps || 0)) / 10000),
    fee = cart.length ? config?.fee || 0 : 0,
    total = subtotal + tax + fee,
    count = cart.reduce((sum, l) => sum + l.quantity, 0);
  function add() {
    if (!chosen) return;
    setCart((c) => {
      const existing = c.findIndex(
        (l) =>
          l.id === chosen.id &&
          l.bundle === bundle &&
          JSON.stringify([...l.sides].sort()) ===
            JSON.stringify([...sides].sort()),
      );
      if (existing < 0)
        return [
          ...c,
          { id: chosen.id, quantity: 1, sides: bundle ? sides : [], bundle },
        ];
      return c.map((l, i) =>
        i === existing ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l,
      );
    });
    setChosen(null);
  }
  function update(index: number, quantity: number) {
    setCart((c) =>
      c.flatMap((l, i) =>
        i === index
          ? quantity > 0
            ? [{ ...l, quantity: Math.min(20, quantity) }]
            : []
          : [l],
      ),
    );
  }
  const totals = (
    <div className="totals">
      <div>
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <div>
        <span>Demo tax ({(config?.taxBps || 0) / 100}%)</span>
        <span>{money(tax)}</span>
      </div>
      <div>
        <span>Demo service fee</span>
        <span>{money(fee)}</span>
      </div>
      <div className="grand">
        <span>Total</span>
        <span>{money(total)}</span>
      </div>
      <p className="notice">
        {config?.pricingConfirmed
          ? "Demo pricing configured by staff."
          : "Tax and fees are placeholders awaiting owner confirmation. No real payments."}
      </p>
    </div>
  );
  const cartContent = (
    <>
      {lines.map((l) => (
        <div className="cart-line" key={l.index}>
          <strong>
            {l.item!.name} {l.bundle ? "· 2-side meal" : ""}
          </strong>
          <small>
            {l.sides
              .map((id) => items.find((i) => i.id === id)?.name)
              .join(" · ")}
          </small>
          {(l.id === "ricepeas" || l.sides.includes("ricepeas")) && (
            <div className="notice">Rice & Peas contains coconut</div>
          )}
          <div>
            {money(
              (l.bundle ? (l.item!.bundlePrice ?? 0) : l.item!.price) *
                l.quantity,
            )}
          </div>
          <div className="quantity">
            <button
              aria-label={`Decrease ${l.item!.name}`}
              onClick={() => update(l.index, l.quantity - 1)}
              className="secondary"
            >
              −
            </button>
            <span aria-live="polite">{l.quantity}</span>
            <button
              aria-label={`Increase ${l.item!.name}`}
              onClick={() => update(l.index, l.quantity + 1)}
              className="secondary"
            >
              +
            </button>
            <button className="remove" onClick={() => update(l.index, 0)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {!cart.length ? (
        <div className="cart-empty">
          Good food is on the way.
          <br />
          Choose something delicious to begin.
        </div>
      ) : (
        totals
      )}
    </>
  );
  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const pickup = new Date(String(f.get("pickup")));
      const response = await api("orders", {
        mode: "demo",
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        pickup: pickup.toISOString(),
        notes,
        lines: cart,
        idempotencyKey: key.current,
      });
      setOrder(response.order);
      sessionStorage.setItem("island-receipt", JSON.stringify(response.order));
      setCart([]);
      setView("confirmation");
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ordering-site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="demo-banner">
        DEMONSTRATION ONLY · No real orders or payments · Owner review in
        progress
      </div>
      <HeritageRibbon />
      <header className="site-header">
        <a className="brand" href="/" aria-label="Island Taste home">
          <img src="/images/favicon.svg" alt="Island Taste logo" />
          Island Taste
        </a>
        <button
          className="site-menu-toggle"
          aria-expanded={navOpen}
          aria-controls="primary-nav"
          onClick={() => setNavOpen((v) => !v)}
        >
          Menu
        </button>
        <nav
          id="primary-nav"
          className={"site-nav" + (navOpen ? " open" : "")}
          aria-label="Main navigation"
          onClick={() => setNavOpen(false)}
        >
          <a href="/#menu" onClick={() => setView("menu")}>
            Our menu
          </a>
          <a href="/#mission" onClick={() => setView("menu")}>
            Our Mission
          </a>
          <a href="/#visit" onClick={() => setView("menu")}>
            Visit
          </a>
          <a href="tel:4107149033">(410) 714-9033</a>
          <a
            className="btn btn-gold"
            href="/#menu"
            onClick={() => setView("menu")}
          >
            Order Online
          </a>
        </nav>
      </header>
      <main id="main">
        {error && (
          <div className="wrap">
            <div role="alert" className="error">
              {error}
              <button className="secondary" onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        {view === "menu" && (
          <div className="wrap">
            <section className="hero heritage-hero" id="top">
              <TropicalDecor />
              <div className="hero-inner">
                <div className="hero-copy">
                  <div className="tags">
                    <span className="tag red tilt-l">CARIBBEAN FLAVORS</span>
                    <span className="tag gold tilt-r indent">GOOD FOOD</span>
                    <span className="tag green tilt-l2">ISLAND VIBES</span>
                  </div>
                  <h1>
                    Taste the Afro-Caribbean{" "}
                    <span className="script">paradise.</span>
                  </h1>
                  <p>
                    Authentic jerk, rice &amp; peas and sweet plantains, with
                    recipes from Cape Verde and Montserrat. Every plate helps
                    fund student scholarships.
                  </p>
                  <div className="flavor-stamp">
                    <b>JERK WITH A BUILD</b>
                    <span>
                      Fresh herbs · warm spice · smoky sweetness · pepper heat
                    </span>
                  </div>
                  <div className="actions">
                    <a className="btn btn-red" href="#menu">
                      Order Online
                    </a>
                    <a className="btn btn-outline-light" href="#visit">
                      Tue – Fri, 11:30 – 4:00
                    </a>
                  </div>
                  <p
                    className={
                      "open-status " + (open ? "is-open" : "is-closed")
                    }
                    role="status"
                  >
                    <span className="dot" />
                    <span>
                      {config
                        ? open
                          ? "Open now · pickup in Easton"
                          : "Currently closed · See pickup availability"
                        : "Loading restaurant hours…"}
                    </span>
                  </p>
                </div>
                <div className="hero-plate">
                  <img
                    src="/images/jerk.jpg"
                    alt="Island Taste jerk chicken with rice and peas and cabbage"
                    width="360"
                    height="360"
                    fetchPriority="high"
                  />
                  {items.find((i) => i.id === "jerk") && (
                    <div className="price-badge">
                      <span>JERK</span>
                      <strong>
                        {money(items.find((i) => i.id === "jerk")!.price)}
                      </strong>
                      <small>À LA CARTE</small>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <FlavorStrip />
            <section id="menu">
              <div className="section-head">
                <div>
                  <span className="tag gold tilt-l">
                    FRESH FROM OUR KITCHEN
                  </span>
                  <h2 className="big red-text">OUR MENU</h2>
                  <small>Pickup at 209 Port Street · All prices in USD</small>
                </div>
                <span className="status-pill">Test ordering experience</span>
              </div>
              <div className="tabs" role="group" aria-label="Menu categories">
                {["All", "Meals", "Sides", "Drinks"].map((c) => (
                  <button
                    key={c}
                    className={c === category ? "active" : ""}
                    aria-pressed={c === category}
                    onClick={() => setCategory(c)}
                  >
                    {c === "All" ? "Full menu" : c}
                  </button>
                ))}
              </div>
              <div className="order-layout">
                <div>
                  {!config && <p role="status">Loading the menu…</p>}
                  <div className="menu-groups">
                    {["Meals", "Sides", "Drinks"]
                      .filter(
                        (group) => category === "All" || group === category,
                      )
                      .map((group) => (
                        <section
                          key={group}
                          className={
                            "category-group category-" + group.toLowerCase()
                          }
                          aria-label={group}
                        >
                          <h3 className="category-title">
                            {group.toUpperCase()}
                          </h3>
                          <div className="menu-grid">
                            {items
                              .filter((i) => i.category === group)
                              .map((item) => (
                                <article
                                  className={"food-card food-" + item.id}
                                  data-category={item.category}
                                  key={item.id}
                                >
                                  <button
                                    className="photo"
                                    aria-label={`Preview ${item.name}`}
                                    onMouseEnter={() => {
                                      if (
                                        window.matchMedia("(hover: hover)")
                                          .matches
                                      )
                                        setHoverPreview(item);
                                    }}
                                    onMouseLeave={() => setHoverPreview(null)}
                                    onClick={() => {
                                      setHoverPreview(null);
                                      setPreview(item);
                                    }}
                                  >
                                    <img
                                      src={"/images/" + item.image}
                                      alt={item.name}
                                      loading="lazy"
                                    />
                                    {item.category === "Meals" && (
                                      <>
                                        <Palm className="card-palm" />
                                        <span className="meal-name-art">
                                          {item.id === "jerk"
                                            ? "Jerk"
                                            : item.id === "shrimp"
                                              ? "Shrimp"
                                              : item.id === "salmon"
                                                ? "Salmon"
                                                : item.name}
                                        </span>
                                      </>
                                    )}
                                    <span className="preview-label">
                                      View dish ↗
                                    </span>
                                  </button>
                                  <div className="food-content">
                                    <small className="eyebrow">
                                      {item.category}
                                    </small>
                                    <h3>{item.name}</h3>
                                    <p>{item.description}</p>
                                    {item.id === "ricepeas" && (
                                      <div className="notice">
                                        Contains coconut
                                      </div>
                                    )}
                                    <footer>
                                      <strong>{money(item.price)}</strong>
                                      <button
                                        disabled={!item.available}
                                        onClick={() => {
                                          setChosen(item);
                                          setBundle(false);
                                          setSides([]);
                                        }}
                                      >
                                        {item.available
                                          ? "Customize +"
                                          : "Unavailable"}
                                      </button>
                                    </footer>
                                    {item.category === "Meals" && (
                                      <small style={{ marginTop: 12 }}>
                                        À la carte ·{" "}
                                        {item.bundlePrice === null
                                          ? "Meal combination pricing awaiting owner confirmation."
                                          : `Two-side meal ${money(item.bundlePrice)}`}
                                      </small>
                                    )}
                                  </div>
                                </article>
                              ))}
                          </div>
                        </section>
                      ))}
                  </div>
                </div>
                <aside className="cart" id="cart" aria-label="Your cart">
                  <h2>
                    Your order <small>({count})</small>
                  </h2>
                  <small>Pickup · Easton</small>
                  {cartContent}
                  <button
                    className="full"
                    disabled={!cart.length}
                    onClick={() => {
                      setView("checkout");
                      setError("");
                      window.scrollTo(0, 0);
                    }}
                  >
                    Review test order →
                  </button>
                </aside>
              </div>
            </section>
            <Community />
          </div>
        )}
        {view === "checkout" && (
          <section className="checkout">
            <button className="secondary" onClick={() => setView("menu")}>
              ← Back to menu
            </button>
            <div className="eyebrow" style={{ marginTop: 24 }}>
              Pickup · Easton
            </div>
            <h1>A good meal awaits.</h1>
            <p>
              This is a test checkout. Your order goes to the demonstration
              kitchen only.
            </p>
            {cartContent}
            <form onSubmit={checkout}>
              <h2 style={{ marginTop: 30 }}>Your details</h2>
              <div className="checkout-grid">
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength={30}
                  />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Pickup time (your device’s timezone)
                  <input name="pickup" type="datetime-local" required />
                </label>
              </div>
              <p className="muted">
                Restaurant hours are in Eastern Time. Choose an open time at
                least 15 minutes ahead
                {config?.advance
                  ? ", up to 7 days ahead"
                  : ", today only"}.{" "}
                {config?.closed
                  ? "Restaurant temporarily closed. Staff must reopen demo scheduling."
                  : ""}
              </p>
              <label>
                Order notes / dietary requests
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <p className="notice">
                Rice & Peas contains coconut. For allergies, contact staff
                directly before placing a real order.
              </p>
              <div className="payment">
                <strong>Pay with PayPal</strong>
                <p className="muted">
                  Coming after owner approval. PayPal is not connected.
                </p>
                <button disabled type="button" className="secondary full">
                  PayPal unavailable
                </button>
              </div>
              <label>
                <input type="checkbox" required />I understand this is a test
                order, with no payment or real meal reservation.
              </label>
              {error && (
                <div role="alert" className="error">
                  {error}
                </div>
              )}
              <button className="full" disabled={busy || !cart.length}>
                {busy
                  ? "Saving your test order…"
                  : "Submit test order · " + money(total)}
              </button>
            </form>
          </section>
        )}
        {view === "confirmation" && order && (
          <section className="checkout">
            <div className="eyebrow">Saved to the demonstration kitchen</div>
            <h1>
              Thanks for trying
              <br />a taste of the islands.
            </h1>
            <div className="success">
              <strong>TEST ORDER · NOT PAID</strong>
              <p>
                No payment was processed. This does not reserve a real meal.
              </p>
            </div>
            <p style={{ marginTop: 20 }}>
              Reference:{" "}
              <strong style={{ overflowWrap: "anywhere" }}>{order.id}</strong>
            </p>
            <p>
              {order.customer.name} · Pickup{" "}
              {new Date(order.pickup).toLocaleString("en-US", {
                timeZone: "America/New_York",
              })}{" "}
              Eastern
            </p>
            {order.items.map((i: any, index: number) => (
              <p key={index}>
                {i.quantity} × {i.name}
                {i.sides.length
                  ? " · " + i.sides.map((s: any) => s.name).join(", ")
                  : ""}
                {i.coconut ? " · Contains coconut" : ""}
              </p>
            ))}
            <p>
              <strong>Demo total: {money(order.total)}</strong>
            </p>
            <p className="muted">
              The kitchen can now review this stored test order. Preparation
              status starts at New Orders.
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem("island-receipt");
                key.current = crypto.randomUUID();
                sessionStorage.setItem("island-checkout-key", key.current);
                setOrder(null);
                setView("menu");
              }}
            >
              Explore the menu
            </button>
          </section>
        )}
      </main>
      <FooterWave />
      <footer className="site-footer" id="contact">
        <div>
          <a className="brand" href="/">
            Island Taste
          </a>
          <p>Afro-Caribbean cuisine from Cape Verde &amp; Montserrat.</p>
          <a href="/story.html">Our mission & community →</a>
        </div>
        <div>
          <strong>Come hungry. Leave happy.</strong>
          <p>
            209 Port Street, Easton, MD 21601
            <br />
            Tuesday–Friday · 11:30 AM–4:00 PM Eastern
          </p>
          <a href="tel:4107149033">(410) 714-9033</a> ·{" "}
          <a href="https://www.google.com/maps/search/?api=1&query=209+Port+Street+Easton+MD">
            Directions
          </a>
        </div>
        <small style={{ color: "#d3ded3" }}>
          © {new Date().getFullYear()} Island Taste · A DBA of Polaris Village
          Ministries
          <br />
          Demonstration environment · <a href="/staff">Staff sign in</a>
        </small>
      </footer>
      {view === "menu" && count > 0 && (
        <button
          className="mobile-cart"
          onClick={() =>
            document
              .getElementById("cart")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span>View order ({count})</span>
          <span>{money(total)}</span>
        </button>
      )}
      {hoverPreview && (
        <div className="hover-preview" aria-hidden="true">
          <img src={"/images/" + hoverPreview.image} alt="" />
          <strong>{hoverPreview.name}</strong>
        </div>
      )}
      {preview && (
        <Modal title={preview.name} close={() => setPreview(null)}>
          <img src={"/images/" + preview.image} alt={preview.name} />
          <p style={{ marginTop: 15 }}>{preview.description}</p>
        </Modal>
      )}
      {chosen && (
        <Modal title={chosen.name} close={() => setChosen(null)}>
          <img src={"/images/" + chosen.image} alt={chosen.name} />
          <p style={{ marginTop: 15 }}>{chosen.description}</p>
          <label>
            Meal style
            <select
              value={bundle ? "bundle" : "single"}
              onChange={(e) => {
                setBundle(e.target.value === "bundle");
                setSides([]);
              }}
            >
              <option value="single">À la carte · {money(chosen.price)}</option>
              {chosen.category === "Meals" && (
                <option value="bundle" disabled={chosen.bundlePrice === null}>
                  {chosen.bundlePrice === null
                    ? "Meat + two sides · price awaiting owner confirmation"
                    : `Meat + two sides · ${money(chosen.bundlePrice)}`}
                </option>
              )}
            </select>
          </label>
          {bundle && (
            <fieldset>
              <legend>Choose exactly two different sides</legend>
              {items
                .filter((i) => i.category === "Sides" && i.available)
                .map((i) => (
                  <label key={i.id}>
                    <input
                      type="checkbox"
                      checked={sides.includes(i.id)}
                      disabled={!sides.includes(i.id) && sides.length >= 2}
                      onChange={(e) =>
                        setSides((s) =>
                          e.target.checked
                            ? [...s, i.id]
                            : s.filter((id) => id !== i.id),
                        )
                      }
                    />
                    {i.name}
                    {i.id === "ricepeas" ? " — contains coconut" : ""}
                  </label>
                ))}
            </fieldset>
          )}
          <button
            className="full"
            disabled={bundle && sides.length !== 2}
            onClick={add}
          >
            Add to order · {money(bundle ? chosen.bundlePrice! : chosen.price)}
          </button>
        </Modal>
      )}
    </div>
  );
}
