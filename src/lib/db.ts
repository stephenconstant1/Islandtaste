import { connectDatabase, type SqlDatabase } from "./database";
const globalDb = globalThis as typeof globalThis & {
  islandDb?: Promise<SqlDatabase>;
};
export const db = (globalDb.islandDb ??= (async () => {
  const database = await connectDatabase();
  await database.transaction(async (d) => {
    await d.lock("island-taste-schema-v1");
    await d.exec(`CREATE TABLE IF NOT EXISTS migrations(version integer PRIMARY KEY, applied_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS menu(id text PRIMARY KEY, data jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(id integer PRIMARY KEY, data jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS staff(username text PRIMARY KEY, hash text NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token text PRIMARY KEY, username text REFERENCES staff(username), expires timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts(key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY, idem text UNIQUE NOT NULL, fingerprint text NOT NULL, data jsonb NOT NULL, created_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id text REFERENCES orders(id), actor text NOT NULL, status text NOT NULL, created_at timestamptz DEFAULT now());
 INSERT INTO migrations(version) VALUES(1) ON CONFLICT DO NOTHING;`);
    const items = [
      [
        "jerk",
        "Jerk Chicken",
        "Meals",
        1500,
        "jerk.jpg",
        "Aromatic island spices and signature jerk flavor.",
      ],
      [
        "shrimp",
        "Grilled Shrimp",
        "Meals",
        2200,
        "shrimp.jpg",
        "Seasoned and grilled with Caribbean flavor.",
      ],
      [
        "salmon",
        "Island Salmon",
        "Meals",
        2000,
        "salmon.jpg",
        "Grilled with island herbs and spices.",
      ],
      [
        "ricepeas",
        "Rice & Peas",
        "Sides",
        400,
        "ricepeas.jpg",
        "Contains coconut.",
      ],
      [
        "whiterice",
        "White Rice",
        "Sides",
        300,
        "whiterice.jpg",
        "Steamed to perfection.",
      ],
      [
        "cabbage",
        "Fried Cabbage",
        "Sides",
        300,
        "cabbage.jpg",
        "Sautéed with island herbs.",
      ],
      [
        "greenbeans",
        "Green Beans",
        "Sides",
        400,
        "greenbeans.jpg",
        "Fresh and flavorful.",
      ],
      [
        "plantains",
        "Fried Plantains",
        "Sides",
        300,
        "plantains.svg",
        "Sweet, golden fried plantains.",
      ],
      [
        "cans",
        "Canned beverages",
        "Drinks",
        300,
        "cans.jpg",
        "Assorted canned beverages.",
      ],
      ["water", "Water", "Drinks", 300, "water.jpg", "Bottled water."],
    ];
    for (const [id, name, category, price, image, description] of items)
      await d.query("INSERT INTO menu VALUES($1,$2) ON CONFLICT DO NOTHING", [
        id,
        JSON.stringify({
          id,
          name,
          category,
          price,
          image,
          description,
          available: true,
          bundlePrice: null,
        }),
      ]);
    await d.query("INSERT INTO settings VALUES(1,$1) ON CONFLICT DO NOTHING", [
      JSON.stringify({
        closed: false,
        advance: true,
        days: [2, 3, 4, 5],
        open: 690,
        close: 960,
        taxBps: 0,
        fee: 0,
        pricingConfirmed: false,
      }),
    ]);
  });
  return database;
})());
export async function menu() {
  return (
    await (
      await db
    ).query<{ data: any }>(
      "SELECT data FROM menu ORDER BY CASE data->>'category' WHEN 'Meals' THEN 0 WHEN 'Sides' THEN 1 ELSE 2 END, id",
    )
  ).rows.map((r) => r.data);
}
export async function settings() {
  return (
    await (
      await db
    ).query<{ data: any }>("SELECT data FROM settings WHERE id=1")
  ).rows[0].data;
}
