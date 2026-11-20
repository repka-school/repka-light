// The profile: a nickname and a picture saved as they change, the reset of
// saved results, and the backup file that carries everything to another browser.
import fs from "node:fs";
import type { Page } from "@playwright/test";
import type { QuestionCard } from "../src/content/types";
import { amount, coursePath, expect, goToCard, isQuestion, openLesson, solve, STORAGE_KEY, stored, test, xpOf, type Site } from "./support";

/** Solves the first lesson's first question on the first try; returns it. */
async function solveOne(page: Page, site: Site): Promise<QuestionCard> {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await solve(page, card);
  return card;
}

const file = (text: string) => ({ name: "progress.json", mimeType: "application/json", buffer: Buffer.from(text) });

test("a nickname and a picture are saved as they change and shown in the header", async ({ page }) => {
  await page.goto("profile");
  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Гость, профиль");
  await page.locator("#nickname").fill("  Маша   К.  ");
  // Kept as one trimmed line, whatever was typed.
  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Маша К., профиль");
  await page.locator("label.picture-choice", { has: page.locator('input[value="kitten"]') }).click();
  await page.locator("label.picture-choice", { has: page.locator('input[value="sea"]') }).click();
  expect((await stored(page)).profile).toEqual({ name: "Маша К.", avatar: "kitten", frame: "sea" });

  await page.reload();
  await expect(page.locator("#nickname")).toHaveValue("Маша К.");
  await expect(page.locator('input[name="avatar"][value="kitten"]')).toBeChecked();
  await expect(page.locator('input[name="frame"][value="sea"]')).toBeChecked();
  await expect(page.locator(".picture-preview-name")).toHaveText("Маша К.");
});

test("a nickname stops at its longest length", async ({ page }) => {
  await page.goto("profile");
  await page.locator("#nickname").fill("я".repeat(40));
  await expect(page.locator("#nickname")).toHaveValue("я".repeat(32));
  expect((await stored(page)).profile.name).toBe("я".repeat(32));
});

test("the reset takes the saved results and leaves the profile and the experience", async ({ page, site }) => {
  const card = await solveOne(page, site);
  await page.locator("#nav-profile").click();
  await page.locator("#nickname").fill("Петя");
  await expect(page.locator(".settings-row-text").first()).toHaveText("Сохранено результатов: 1.");

  // Cancelled, it changes nothing.
  await page.locator("#reset-progress").click();
  await page.getByRole("dialog").getByRole("button", { name: "Отмена" }).click();
  // The window takes a moment to fade out; it is asked for again once it has gone.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".settings-row-text").first()).toHaveText("Сохранено результатов: 1.");

  await page.locator("#reset-progress").click();
  await expect(page.getByRole("dialog")).toContainText("Сбросить весь прогресс?");
  await page.locator("#reset-confirm").click();
  await expect(page.locator(".settings-row-text").first()).toHaveText("Пока нет решённых заданий.");
  await expect(page.locator("#reset-progress")).toBeDisabled();
  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Петя, профиль");
  await page.locator("#nav-level").click();
  await expect(page.locator(".level-details .level-total")).toHaveText(`${amount(xpOf(card, "first"))} опыта`);
  await page.keyboard.press("Escape");

  // The course is as new, and solving the task again adds no experience.
  await page.goto(coursePath(site));
  await expect(page.locator(`[data-lesson="${site.lessons[0].slug}"]`)).toHaveClass(/is-new/);
  await solveOne(page, site);
  await expect(page.locator("#task-feedback")).not.toContainText("опыта");
});

test("a backup downloaded in one browser brings everything to another", async ({ page, site }) => {
  const card = await solveOne(page, site);
  await page.locator("#nav-profile").click();
  await page.locator("#nickname").fill("Маша");
  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Маша, профиль");
  const before = await stored(page);

  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#backup-export").click()]);
  expect(download.suggestedFilename()).toMatch(/^repka-progress-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
  const text = fs.readFileSync(await download.path(), "utf8");
  expect(JSON.parse(text)).toMatchObject({ format: "repka-light-backup", version: 5, profile: { name: "Маша" }, courses: before.courses });

  // Another browser: nothing saved yet.
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.locator(".settings-row-text").first()).toHaveText("Пока нет решённых заданий.");

  await page.locator('input[type="file"]').setInputFiles(file(text));
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("профиль «Маша», результатов: 1");
  // Nothing is replaced before it is confirmed.
  expect(await stored(page)).toBeNull();
  await page.locator("#import-confirm").click();

  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Маша, профиль");
  await expect(page.locator("#nickname")).toHaveValue("Маша");
  await expect(page.locator(".settings-row-text").first()).toHaveText("Сохранено результатов: 1.");
  expect(await stored(page)).toEqual(before);
  await page.goto(coursePath(site));
  await expect(page.locator(`[data-lesson="${site.lessons[0].slug}"]`)).toHaveClass(/is-partial/);
  await page.locator("#nav-level").click();
  await expect(page.locator(".level-details .level-total")).toHaveText(`${amount(xpOf(card, "first"))} опыта`);
});

test("a file that is not a backup is refused with its reason, and nothing saved is touched", async ({ page, site }) => {
  await solveOne(page, site);
  await page.locator("#nav-profile").click();
  const before = await stored(page);
  const refused: [text: string, reason: RegExp][] = [
    ["{oops", /Этот файл не удалось прочитать/],
    ['{"profile":{"name":"Чужой"}}', /Это не файл с прогрессом/],
    [JSON.stringify(before), /Это не файл с прогрессом/],
    ['{"format":"repka-light-backup","version":99,"profile":{"name":"Чужой"}}', /Файл сделан в более новой версии сайта/],
  ];
  for (const [text, reason] of refused) {
    await page.locator('input[type="file"]').setInputFiles(file(text));
    await expect(page.locator("#backup-error")).toHaveText(reason);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(await stored(page)).toEqual(before);
});

test("a loaded file can be declined", async ({ page, site }) => {
  await solveOne(page, site);
  await page.locator("#nav-profile").click();
  const before = await stored(page);
  await page.locator('input[type="file"]').setInputFiles(file('{"format":"repka-light-backup","version":4,"exportedAt":"2026-03-04T05:06:07.000Z","profile":{"name":"Чужой","avatar":null,"frame":"none"},"courses":{}}'));
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("профиль «Чужой», результатов: 0");
  await dialog.getByRole("button", { name: "Отмена" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
});
