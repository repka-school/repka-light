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

test("correct answers cap the wait at two seconds and a repeat game on the same day adds only what it scores above the first", async ({ page, hasTouch }) => {
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
      await expect(page.getByRole("timer")).toHaveText("2 с");
      await page.clock.runFor(1999);
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
    } else if (i === 2 || i === 9) {
      await page.clock.runFor(5000);
      await expect(page.getByRole("timer")).toHaveText("0 с");
      await expect(page.getByRole("status").filter({ hasText: "Выбери ответ, чтобы продолжить" })).toBeVisible();
      await page.clock.runFor(15000);
      await expect(prompt(page)).toHaveText(before);
      if (i === 2) {
        await page.keyboard.press((await choice.right.getAttribute("aria-keyshortcuts"))!);
        await expect(page.getByRole("status").filter({ hasText: "Верно! Время вышло — 0 XP." })).toBeVisible();
      } else {
        await choice.wrong.click();
        await expect(page.getByRole("status").filter({ hasText: /Верный ответ.*0 XP/ })).toBeVisible();
      }
      await expect(page.getByRole("timer")).toHaveText("0 с");
    } else {
      if (i === 3) await page.clock.runFor(4200);
      await choice.right.click();
      await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    }
    const remaining = i === 1 ? 5000 : i === 3 ? 800 : 2000;
    await page.clock.runFor(remaining - 1);
    await expect(prompt(page)).toHaveText(before);
    await page.clock.runFor(1);
  }
  expect(seen.size).toBe(10);
  await expect(page.getByText("Верных ответов — 7 из 10")).toBeVisible();
  await expect(page.getByText("+7 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Время на ответы — 44,2 с.")).toBeVisible();
  await expect(page.getByText("Первый рекорд!")).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses.multiplication).toMatchObject({
    drills: { "times-2/game": 7 }, bestAnswerTimeTenths: { "times-2/game": 442 }, xp: { "times-2/game": 7 },
  });

  await page.getByRole("button", { name: "Играть ещё" }).click();
  for (let i = 0; i < 10; i++) {
    await page.clock.runFor(135);
    await (await options(page)).right.click();
    await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();
    await page.clock.runFor(2000);
  }
  await expect(page.getByText("Верных ответов — 10 из 10")).toBeVisible();
  await expect(page.getByText("+3 XP. Сегодня эта игра уже дала 7 XP.", { exact: true })).toBeVisible();
  await expect(page.getByText("Время на ответы — 1,4 с.")).toBeVisible();
  await expect(page.getByText("Новый рекорд! Раньше было 7 из 10.")).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses.multiplication).toMatchObject({
    drills: { "times-2/game": 10 }, bestAnswerTimeTenths: { "times-2/game": 14 }, xp: { "times-2/game": 10 }, drillDays: { "times-2/game": [expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 10] },
  });

  // A quick game with mistakes is not a record, and the day's ten XP are already given.
  await page.getByRole("button", { name: "Играть ещё" }).click();
  for (let i = 0; i < 10; i++) {
    await page.clock.runFor(50);
    const choice = await options(page);
    await (i === 0 ? choice.wrong : choice.right).click();
    await page.clock.runFor(5000);
  }
  await expect(page.getByText("Верных ответов — 9 из 10")).toBeVisible();
  await expect(page.getByText("Рекорд — 10 из 10 (1,4 с).")).toBeVisible();
  await expect(page.getByText("Сегодня эта игра уже дала 10 XP — больше за день не бывает.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses.multiplication).toMatchObject({
    drills: { "times-2/game": 10 }, bestAnswerTimeTenths: { "times-2/game": 14 }, xp: { "times-2/game": 10 },
  });

  await page.reload();
  await page.locator("#to-course").click();
  await expect(page.getByText("Лучший результат — 10 из 10 (1,4 с)", { exact: true })).toBeVisible();
  await expect(page.locator("#course-primary-start")).toContainText("Умножение на 3");
});

test("a wrong answer just before the deadline still shows the right one for two seconds", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.goto(timesTwo);
  await page.getByRole("button", { name: "К игре" }).click();
  await page.getByRole("button", { name: "Начать игру" }).click();
  const before = await prompt(page).innerText();
  const choice = await options(page);
  await page.clock.runFor(4800);
  await expect(page.getByRole("timer")).toHaveText("1 с");
  await choice.wrong.click();
  await expect(page.getByRole("status").filter({ hasText: /^Верный ответ — \d+\.$/ })).toBeVisible();
  // The timer does not climb back while the answer stays on screen.
  await expect(page.getByRole("timer")).toHaveText("1 с");
  await page.clock.runFor(1999);
  await expect(prompt(page)).toHaveText(before);
  await expect(page.getByRole("timer")).toHaveText("1 с");
  await page.clock.runFor(1);
  await expect(prompt(page)).not.toHaveText(before);
  await expect(page.getByRole("timer")).toHaveText("5 с");
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
    await page.clock.runFor(2000);
  }
  expect(operations.sort()).toEqual([...Array(5).fill("+"), ...Array(5).fill("−")]);
  await expect(page.getByText("+10 XP", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).courses["addition-subtraction"]).toMatchObject({
    drills: { "within-10/game": 10 }, xp: { "within-10/game": 10 },
  });
});

test("algebra drills show simplified expressions and solutions to equations", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.goto("courses");
  await page.getByRole("link", { name: "Выражения, корни и уравнения в уме", exact: true }).click();
  await expect(page.locator(".lesson-item")).toHaveCount(6);
  await page.locator("#course-primary-start").click();
  await expect(page.locator(".theory-card p mfrac").first()).toBeVisible();
  await expect(page.getByRole("table").locator("mfrac").first()).toBeVisible();
  const shadedFormula = page.getByRole("table").locator("tbody tr:nth-child(2) .formula");
  await expect(shadedFormula).toHaveCSS("background-image", "none");
  await expect(shadedFormula).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(shadedFormula).toHaveCSS("overflow-y", "visible");
  await page.getByRole("button", { name: "К игре" }).click();
  await page.getByRole("button", { name: "Начать игру" }).click();
  const fraction = prompt(page).locator("mfrac");
  await expect(fraction.locator("mrow > mo").first()).toHaveText("·");
  await expect(prompt(page).locator(".formula")).toHaveCSS("overflow-y", "visible");
  const factors = await fraction.locator("mrow > mn").allTextContents();
  const divisor = await fraction.locator(":scope > mn").textContent();
  const coefficient = factors.reduce((total, factor) => total * Number(factor), 1) / Number(divisor);
  const simplified = coefficient === 1 ? "x" : `${coefficient}x`;
  const choices = page.getByRole("group", { name: "Варианты ответа" });
  await choices.getByRole("button", { name: simplified, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();

  await page.goto("course/mental-algebra/lesson/root-quotients");
  await expect(page.locator(".theory-card p mfrac > msqrt").first()).toBeVisible();
  await page.getByRole("button", { name: "К игре" }).click();
  await page.getByRole("button", { name: "Начать игру" }).click();
  const operands = await fraction.locator(":scope > *").evaluateAll((nodes) =>
    nodes.map((node) => node.localName === "msqrt" ? Math.sqrt(Number(node.textContent)) : Number(node.textContent)));
  const quotient = operands[0] / operands[1];
  await choices.getByRole("button", { name: String(quotient), exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Верно!" })).toBeVisible();

  await page.goto("course/mental-algebra/lesson/one-step");
  await page.getByRole("button", { name: "К игре" }).click();
  await page.getByRole("button", { name: "Начать игру" }).click();
  const equation = (await prompt(page).innerText()).replaceAll("−", "-");
  const [a, b] = equation.match(/-?\d+/g)!.map(Number);
  const solution = equation.startsWith("x +") ? b - a : equation.endsWith(`x - ${b}`) ? a + b : b / a;
  const label = `x = ${String(solution).replace("-", "−")}`;
  const wrong = choices.getByRole("button").filter({ hasNotText: new RegExp(`${label}$`) }).first();
  await wrong.click();
  await expect(page.getByRole("status").filter({ hasText: `Верный ответ — ${label}.` })).toBeVisible();
});
