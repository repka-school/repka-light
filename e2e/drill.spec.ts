import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { stored } from "./support";

const timesTwo = "course/multiplication/lesson/times-2";
const prompt = (page: Page) => page.locator(".drill-prompt");

async function options(page: Page) {
  const [, a, operation, b] = (await prompt(page).innerText()).match(/^(\d+) ([×÷+−]) (\d+) = \?$/)!;
  const left = Number(a);
  const operand = Number(b);
  const calculated: Record<string, number> = { "+": left + operand, "−": left - operand, "×": left * operand, "÷": left / operand };
  const right = calculated[operation];
  const group = page.getByRole("group", { name: "Варианты ответа" });
  const choices = group.getByRole("button");
  await expect(choices).toHaveCount(3);
  const values = await choices.locator("span").allTextContents();
  expect(new Set(values).size).toBe(3);
  const wrong = values.find((value) => value !== String(right));
  return { right: group.getByRole("button", { name: String(right), exact: true }), wrong: group.getByRole("button", { name: wrong, exact: true }) };
}

test("the multiplication course opens with theory and ends with squares through 20", async ({ page }) => {
  await page.goto("courses");
  await page.getByRole("link", { name: "Таблица умножения", exact: true }).click();
  await expect(page.locator(".lesson-item")).toHaveCount(10);
  await expect(page.locator(".lesson-title").last()).toHaveText("Квадраты чисел до 20");
  await page.locator("#course-primary-start").click();
  await expect(page.getByText("Карточка 1 из 2")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "2 × 10", exact: true })).toBeVisible();
  await page.goto("course/multiplication/lesson/squares-to-20");
  const table = page.getByRole("table");
  await expect(table.getByRole("rowheader")).toHaveCount(20);
  await expect(table.getByRole("row").last()).toHaveText(/20²\s*400/);
});

test("rounds last five seconds and a repeat game grants its own XP", async ({ page, hasTouch }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.goto(timesTwo);
  await page.getByRole("button", { name: "К игре" }).click();
  await expect(page.getByText("Карточка 2 из 2")).toBeVisible();
  await page.clock.runFor(5000);
  await expect(prompt(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Начать игру" }).click();
  await expect(page.getByRole("heading", { name: "Игра на время" })).toBeFocused();

  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const before = await prompt(page).innerText();
    seen.add(before);
    const choice = await options(page);
    if (i === 0) {
      const key = await choice.right.getAttribute("aria-keyshortcuts");
      await page.keyboard.press(key!);
      await page.keyboard.press(key!);
      await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
      await page.clock.runFor(4999);
      await expect(prompt(page)).toHaveText(before);
      await expect(page.getByRole("timer")).toHaveText("1 с");
      await page.clock.runFor(1);
      await expect(prompt(page)).not.toHaveText(before);
      continue;
    }
    if (i === 1) {
      if (hasTouch) await choice.wrong.tap();
      else await choice.wrong.click();
      await expect(page.getByRole("status").filter({ hasText: "Верный ответ" })).toBeVisible();
    } else if (i !== 2) {
      await choice.right.click();
      await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    }
    await page.clock.runFor(5000);
  }
  expect(seen.size).toBe(10);
  await expect(page.getByText("Верных ответов — 8 из 10")).toBeVisible();
  await expect(page.getByText("+8 XP", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Играть ещё" }).click();
  for (let i = 0; i < 10; i++) {
    await (await options(page)).right.click();
    await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    await page.clock.runFor(5000);
  }
  await expect(page.getByText("Верных ответов — 10 из 10")).toBeVisible();
  await expect(page.getByText("+10 XP", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses.multiplication).toMatchObject({
    drills: { "times-2/game": 10 }, xp: { "times-2/game": 18 },
  });

  await page.reload();
  await page.locator("#to-course").click();
  await expect(page.getByText("Лучший результат — 10 из 10")).toBeVisible();
  await expect(page.locator("#course-primary-start")).toContainText("Умножение на 3");
});

test("the theory and the game pass axe", async ({ page }) => {
  await page.goto(timesTwo);
  await expect(page.getByRole("table")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "К игре" }).click();
  await page.getByRole("button", { name: "Начать игру" }).click();
  await expect(prompt(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("the new arithmetic courses open from the catalog and the mixed game awards XP", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  for (const [title, sample] of [["Сложение", "1 + 0"], ["Вычитание", "1 − 1"], ["Деление", "20 ÷ 2"], ["Сложение и вычитание", "1 + 0"]]) {
    await page.goto("courses");
    await page.getByRole("link", { name: title, exact: true }).click();
    await page.locator("#course-primary-start").click();
    await expect(page.getByRole("rowheader", { name: sample, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "К игре" }).click();
    await page.getByRole("button", { name: "Начать игру" }).click();
    if (title !== "Сложение и вычитание") {
      await (await options(page)).right.click();
      await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    }
  }

  const operations: string[] = [];
  for (let i = 0; i < 10; i++) {
    operations.push((await prompt(page).innerText()).split(" ")[1]);
    await (await options(page)).right.click();
    await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    await page.clock.runFor(5000);
  }
  expect(operations.sort()).toEqual([...Array(5).fill("+"), ...Array(5).fill("−")]);
  await expect(page.getByText("+10 XP", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses["addition-subtraction"]).toMatchObject({
    drills: { "within-10/game": 10 }, xp: { "within-10/game": 10 },
  });
});
