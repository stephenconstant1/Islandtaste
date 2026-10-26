const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const { readFileSync } = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    for (const path of ["/", "/staff"]) {
      await page.goto("http://127.0.0.1:4321" + path);
      await page.waitForTimeout(700);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      if (results.violations.length)
        throw Error(
          JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.target),
            })),
            null,
            2,
          ),
        );
      console.log("PASS: accessibility scan " + path);
    }
    const c = JSON.parse(readFileSync(".data/demo-access.json", "utf8"));
    await page.getByLabel("Username", { exact: true }).fill(c.username);
    await page.getByLabel("Password", { exact: true }).fill(c.password);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await page.getByRole("heading", { name: "Restaurant dashboard" }).waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length)
      throw Error(
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          null,
          2,
        ),
      );
    console.log("PASS: authenticated dashboard accessibility scan");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
