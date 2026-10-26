export type Line = {
  id: string;
  quantity: number;
  sides: string[];
  bundle: boolean;
};
export function priceOrder(lines: Line[], menu: any[], config: any) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 40)
    throw Error("Choose between 1 and 40 items.");
  const items = lines.map((line) => {
    const item = menu.find((x) => x.id === line.id);
    if (!item?.available)
      throw Error("An item is unavailable. Please refresh the menu.");
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20
    )
      throw Error("Quantity must be 1–20.");
    if (
      typeof line.bundle !== "boolean" ||
      !Array.isArray(line.sides) ||
      line.sides.some((s) => typeof s !== "string")
    )
      throw Error("Invalid meal selection.");
    if (line.bundle && (item.category !== "Meals" || item.bundlePrice === null))
      throw Error("Meal combination price awaits owner confirmation.");
    if (
      line.bundle
        ? line.sides.length !== 2 || new Set(line.sides).size !== 2
        : line.sides.length !== 0
    )
      throw Error("Choose exactly two different sides for a combination.");
    const sides = line.sides.map((id) => {
      const side = menu.find(
        (x) => x.id === id && x.category === "Sides" && x.available,
      );
      if (!side) throw Error("Selected side is unavailable.");
      return { id, name: side.name, coconut: id === "ricepeas" };
    });
    const unitPrice = line.bundle ? item.bundlePrice : item.price;
    return {
      id: item.id,
      name: item.name,
      quantity: line.quantity,
      sides,
      unitPrice,
      bundle: line.bundle,
      coconut: item.id === "ricepeas" || sides.some((s) => s.coconut),
    };
  });
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const tax = Math.round((subtotal * config.taxBps) / 10000);
  return {
    items,
    subtotal,
    tax,
    fee: config.fee,
    total: subtotal + tax + config.fee,
  };
}
export function localMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      get("weekday"),
    ),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}
export function isOpen(config: any, date = new Date()) {
  const { day, minutes } = localMinutes(date);
  return (
    !config.closed &&
    config.days.includes(day) &&
    minutes >= config.open &&
    minutes < config.close
  );
}
export const statuses = [
  "New Orders",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
];
