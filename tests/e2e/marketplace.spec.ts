import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { finalizeEvent, nip44 } from "nostr-tools";
import { buyer, buyerKey, seller } from "../fixtures";
test("real relay listing, search, product, saved finds and persisted cart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good finds. Great independence." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await page.getByLabel("Search products", { exact: true }).fill("handcraft");
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page
    .getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" })
    .click();
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await expect(
    page.getByText("TEST ONLY Workshop", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("private buyer request creates an order without initiating payment", async ({
  page,
}) => {
  await page.exposeFunction("testSign", async (e: unknown) =>
    finalizeEvent(e as any, buyerKey),
  );
  await page.exposeFunction("testEncrypt", async (p: string, t: string) =>
    nip44.v2.encrypt(t, nip44.v2.utils.getConversationKey(buyerKey, p)),
  );
  await page.exposeFunction("testDecrypt", async (p: string, t: string) =>
    nip44.v2.decrypt(t, nip44.v2.utils.getConversationKey(buyerKey, p)),
  );
  await page.addInitScript(
    ({ buyer }) => {
      (window as any).nostr = {
        getPublicKey: async () => buyer,
        signEvent: (e: any) => (window as any).testSign(e),
        nip44: {
          encrypt: (p: string, t: string) => (window as any).testEncrypt(p, t),
          decrypt: (p: string, t: string) => (window as any).testDecrypt(p, t),
        },
      };
    },
    { buyer },
  );
  await page.goto(`/product/${seller}/test-lamp`);
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await page.goto("/checkout");
  await page
    .getByRole("button", { name: "Connect messaging identity" })
    .click();
  await page.getByRole("button", { name: "Connect Nostr extension" }).click();
  await expect(page.getByText(buyer, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Request merchant confirmation" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Private purchase requests sent",
  );
  await page
    .getByRole("link", { name: "View your orders", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TEST ONLY — Handcrafted reading lamp" }),
  ).toBeVisible();
  await expect(page.getByText("requested", { exact: true })).toBeVisible();
});
test("critical routes are usable and mainnet activation is disabled", async ({
  page,
}) => {
  for (const [url, title] of [
    ["/seller/onboarding", "Your store starts with you."],
    ["/seller/dashboard", "Make something of your own."],
    ["/seller/listings/new", "Bring something good."],
    ["/seller/media", "Give your products their best light."],
    ["/pricing", "One membership. Your whole store."],
    ["/rfq", "Put your sourcing request out there."],
    ["/privacy", "Your data has a home. With you."],
  ]) {
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  }
  await page.goto("/pricing");
  await expect(
    page.getByRole("button", { name: "Get a live signed quote" }),
  ).toBeDisabled();
});
test("homepage keyboard navigation and WCAG AA checks", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good finds. Great independence." }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
});
