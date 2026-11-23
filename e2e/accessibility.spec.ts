// Every screen but the homestead, checked by axe for what a machine can tell
// of accessibility: names, roles, contrast, structure.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { QuestionCard } from "../src/content/types";
import { answer, coursePath, expect, feedback, goToCard, heading, isQuestion, openLesson, passLesson, summary, test, wrongLetters } from "./support";

/** The page's violations, each as its rule and the elements that break it. */
async function violations(page: Page) {
  // A card's pieces fade in one after another; halfway through, their colours are not the ones to judge.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

test("the index page, the course list, a course and the profile pass axe", async ({ page, site }) => {
  const screens: [address: string, title: string | RegExp][] = [
    ["", /тренажёр для школьников/],
    ["courses", "Все курсы"],
    [coursePath(site), site.course.title],
    ["profile", "Мой профиль"],
  ];
  for (const [address, title] of screens) {
    await page.goto(address);
    await expect(heading(page)).toHaveText(title);
    expect(await violations(page), `on «${address}»`).toEqual([]);
  }
});

test("the program list and a program with an open topic pass axe", async ({ page, site }) => {
  await page.goto("programs");
  await expect(heading(page)).toHaveText("Программы");
  expect(await violations(page), "on the program list").toEqual([]);
  test.skip(site.index.programs.length === 0, "no program is published");
  const program = site.index.programs[0];
  await page.goto(`program/${program.slug}`);
  await expect(heading(page)).toHaveText(program.title);
  const topic = page.locator("details.topic").first();
  if (await topic.count()) await topic.locator("summary").click();
  expect(await violations(page), "on a program").toEqual([]);
});

test("a lesson passes axe on a theory card, on a question, after a wrong try and in the summary", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const theory = lesson.cards.findIndex((card) => !isQuestion(card));
  const question = lesson.cards.findIndex(isQuestion);
  await openLesson(page, site, lesson);
  if (theory >= 0) {
    await goToCard(page, lesson, theory);
    expect(await violations(page), "on a theory card").toEqual([]);
  }
  await goToCard(page, lesson, question);
  expect(await violations(page), "on a question").toEqual([]);
  await answer(page, [wrongLetters(lesson.cards[question] as QuestionCard)[0]]);
  await expect(feedback(page)).toBeVisible();
  expect(await violations(page), "after a wrong try").toEqual([]);

  // From the first card to the end; the question tried above is solved on its second try.
  await goToCard(page, lesson, 0);
  await passLesson(page, lesson);
  await expect(summary(page)).toBeVisible();
  await page.locator(".review-item").first().locator("summary").click();
  expect(await violations(page), "in the summary").toEqual([]);
});
