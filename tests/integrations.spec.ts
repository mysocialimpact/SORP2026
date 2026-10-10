import { test, expect } from "@playwright/test";

test("payment return only confirms payment after a paid response", async ({
  page,
}) => {
  let state = "pending";
  await page.route("**/api/sorp-payments/status**", (route) =>
    route.fulfill({
      json: {
        status: state,
        paymentType: "voluntary_support",
        amountMinor: 500,
        email: "qa@example.invalid",
      },
    }),
  );
  await page.goto(
    "/are-you-sorp-ready/payment/return/?session_id=cs_test_fixture",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "haven’t marked this as paid",
  );
  state = "expired";
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "haven’t marked this as paid",
  );
  state = "paid";
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Thank you",
  );
  await expect(page.getByText("Payment confirmed · £5.00")).toBeVisible();
  await page.goto("/are-you-sorp-ready/payment/return/?status=cancelled");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "No payment was taken.",
  );
});

for (const service of ["free", "readiness", "wider"])
  test(`safe ${service} booking simulation carries current review details and handles response`, async ({
    page,
  }) => {
    const slot = {
      start: "2026-12-01T10:00:00.000Z",
      end: "2026-12-01T11:00:00.000Z",
    };
    const writes: { url: string; data: Record<string, unknown> }[] = [];
    await page.route("https://js.stripe.com/**", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.Stripe=()=>({initEmbeddedCheckout:async({onComplete})=>({mount(el){const b=document.createElement('button');b.textContent='Simulate test payment';b.onclick=onComplete;el.appendChild(b)},destroy(){}})});`,
      }),
    );
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/availability"))
        return route.fulfill({ json: { slots: [slot] } });
      const data = route.request().postDataJSON();
      writes.push({ url, data });
      if (url.includes("/payment/create"))
        return route.fulfill({
          json: {
            presentation: "embedded",
            id: "cs_test_fixture",
            clientSecret: "test_fixture_secret",
          },
        });
      if (url.includes("/free") || url.includes("/payment/finalise"))
        return route.fulfill({
          json: {
            session: "QA consultation",
            start: slot.start,
            priceMinor:
              service === "free" ? 0 : service === "readiness" ? 5000 : 10000,
            paid: service !== "free",
            invitationSent: false,
          },
        });
      return route.fulfill({ json: { ok: true } });
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "msi-sorp-canonical-methodology-v1",
        JSON.stringify({
          sessionId: "qa-current-review",
          name: "QA Reviewer",
          email: "qa@example.invalid",
          candidate: { name: "QA charity" },
        }),
      ),
    );
    await page.goto(`/are-you-sorp-ready/review/booking/?session=${service}`);
    await page
      .getByRole("button", {
        name:
          service === "free"
            ? "BOOK A FREE 10-MINUTE CALL →"
            : service === "readiness"
              ? "BOOK MY £50 REVIEW →"
              : "BOOK MY £100 REVIEW →",
        exact: true,
      })
      .click();
    await page.locator(".sorp-slot-day button").first().click();
    await expect(page.getByLabel("NAME", { exact: true })).toHaveValue(
      "QA Reviewer",
    );
    await expect(page.getByLabel("EMAIL", { exact: true })).toHaveValue(
      "qa@example.invalid",
    );
    await page.locator(".sorp-meeting-confirm").click();
    if (service !== "free")
      await page.getByRole("button", { name: "Simulate test payment" }).click();
    await expect(page.locator(".sorp-booking-confirmed")).toBeVisible();
    await expect(page.locator(".sorp-booking-confirmed")).not.toContainText(
      "invitation has been sent",
    );
    expect(writes[0].data.reviewSessionId).toBe("qa-current-review");
    expect(writes[0].data.serviceId).toBe(service);
    if (service !== "free")
      expect(writes.some((x) => x.url.includes("/payment/finalise"))).toBe(
        true,
      );
  });
