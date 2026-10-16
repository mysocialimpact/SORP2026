import { test, expect, chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
test.skip(
  process.env.ONBOARDING_FIXTURE_TESTS !== "true",
  "Requires isolated fixture services.",
);
test("E: real MediaRecorder and audio-level rendering, retry, editable transcription and Send", async ({}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Chromium audio device test runs once.",
  );
  const wav = Buffer.alloc(44 + 48000 * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(48000, 24);
  wav.writeUInt32LE(96000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < 48000; i++)
    wav.writeInt16LE(
      Math.sin((i * 2 * Math.PI * 440) / 48000) * 15000,
      44 + i * 2,
    );
  const file = path.join(tmpdir(), "sorp-onboarding-test.wav");
  await writeFile(file, wav);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-audio-capture=${file}`,
    ],
  });
  try {
    const page = await browser.newPage();
    let attempts = 0;
    await page.route("**/api/onboarding/transcribe/", async (route) => {
      attempts++;
      await new Promise((r) => setTimeout(r, 700));
      if (attempts === 1)
        await route.fulfill({
          status: 502,
          json: { error: "Synthetic transcription failure" },
        });
      else await route.continue();
    });
    await page.goto("http://127.0.0.1:3000/get-started/");
    await page.getByRole("button", { name: "Start a conversation" }).click();
    await page.getByRole("button", { name: "Record your answer" }).click();
    await expect(page.locator(".voice-recording")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".voice-wave i")
          .evaluateAll((bars) =>
            bars.some((b) => parseFloat((b as HTMLElement).style.height) > 4),
          ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.locator(".voice-transcribing")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry transcription" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry transcription" }).click();
    await expect(page.locator(".voice-transcript")).toBeVisible();
    const answer = page.getByRole("textbox", {
      name: "Your answer",
      exact: true,
    });
    await expect(answer).toContainText("Sarah Jones");
    await answer.fill(
      "I’m Sarah Jones, a chartered accountant at Burton Sweet. My email is sarah@example.com.",
    );
    await page.getByRole("button", { name: "Send", exact: false }).click();
    await expect(
      page.locator(".onboarding-profile input[name=name]"),
    ).toHaveValue("Sarah Jones");
    await expect(
      page.locator(".onboarding-profile input[name=email]"),
    ).toHaveValue("sarah@example.com");
    expect(attempts).toBe(2);
  } finally {
    await browser.close();
  }
});
