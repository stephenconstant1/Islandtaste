import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";
import tailwind from "@tailwindcss/vite";
const origins = [
  "http://127.0.0.1:4321",
  "http://localhost:4321",
  ...(process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : []),
].map((value) => {
  const u = new URL(value);
  return {
    protocol: u.protocol.slice(0, -1),
    hostname: u.hostname,
    port: u.port,
  };
});
export default defineConfig({
  security: { allowedDomains: origins },
  output: "server",
  adapter:
    process.env.NETLIFY === "true" ? netlify() : node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwind()] },
});
