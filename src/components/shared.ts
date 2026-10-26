export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export async function api(path: string, body?: any) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Request failed. Please try again.");
  return data;
}
export type Item = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  available: boolean;
  bundlePrice: number | null;
};
export type CartLine = {
  id: string;
  quantity: number;
  sides: string[];
  bundle: boolean;
};
