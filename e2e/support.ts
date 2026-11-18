// What the browser tests share. They run on the courses the site publishes,
// so nothing here names a task or its answer: the tests read the built course
// files, as the page does, and take the right letters from there.
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import type { Card, Course, CourseIndex, Lesson, QuestionCard } from "../src/content/types";
import { taskXp } from "../src/store/xp";

/** The key the site keeps everything under in localStorage. */
export const STORAGE_KEY = "repka-light.v1";

/** The published courses: the index, the first course whole, and its lessons in order. */
export type Site = { index: CourseIndex; course: Course; lessons: Lesson[] };

export const test = base.extend<object, { site: Site }>({
  site: [
    async ({ playwright }, use, info) => {
      const api = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
      const index: CourseIndex = await (await api.get("content/index.json")).json();
      const course: Course = await (await api.get(`content/${index.courses[0].slug}.json`)).json();
      await api.dispose();
      await use({ index, course, lessons: course.modules.flatMap((module) => module.lessons) });
    },
    { scope: "worker" },
  ],
});
export { expect };

export const isQuestion = (card: Card): card is QuestionCard => card.kind === "question";
export const questionsOf = (lesson: Lesson) => lesson.cards.filter(isQuestion);
export const coursePath = (site: Site) => `course/${site.course.slug}`;
export const lessonPath = (site: Site, lesson: Lesson) => `${coursePath(site)}/lesson/${lesson.slug}`;

/** The first card of the course that fits, with its lesson and its place there. */
export function findCard(site: Site, fits: (card: Card) => boolean): { lesson: Lesson; index: number; card: Card } {
  for (const lesson of site.lessons) {
    const index = lesson.cards.findIndex(fits);
    if (index >= 0) return { lesson, index, card: lesson.cards[index] };
  }
  throw new Error("the published courses have no such card");
}

export const rightLetters = (card: QuestionCard) => card.choices.filter((c) => card.correct.includes(c.id)).map((c) => c.label);
export const wrongLetters = (card: QuestionCard) => card.choices.filter((c) => !card.correct.includes(c.id)).map((c) => c.label);
/** What a question gives for the way it was solved. */
export const xpOf = (card: QuestionCard, outcome: "first" | "second") => taskXp(card.points, outcome);
/** An amount of experience as the page writes it. */
export const amount = (n: number) => n.toLocaleString("ru-RU");

export const primary = (page: Page) => page.locator("#primary-action");
export const feedback = (page: Page) => page.locator("#task-feedback");
export const heading = (page: Page) => page.locator("#screen-title");
export const summary = (page: Page) => page.locator(".summary-shell");
/** An option's tile, by its letter. */
export const tile = (page: Page, letter: string): Locator => page.locator("label.choice", { has: page.locator(`input[value="${letter}"]`) });
export const option = (page: Page, letter: string): Locator => page.locator(`label.choice input[value="${letter}"]`);
/** A card's number among the lesson's numbers. */
export const number = (page: Page, index: number) => page.locator(`#question-number-${index}`);

/** Waits for the lesson to show the card at `index`. */
export async function onCard(page: Page, lesson: Lesson, index: number) {
  await expect(page.locator(".progress-position")).toHaveText(`Карточка ${index + 1} из ${lesson.cards.length}`);
}

/** Opens a lesson at whatever card it opens at. */
export async function openLesson(page: Page, site: Site, lesson: Lesson) {
  await page.goto(lessonPath(site, lesson));
  await expect(page.locator(".lesson-title-line")).toHaveText(lesson.title);
}

/** Goes to a card by its number: in the rail on a wide screen, in the «Номера заданий» window on a narrow one. */
export async function goToCard(page: Page, lesson: Lesson, index: number) {
  const jump = page.locator("#question-jump");
  if (await jump.isVisible()) await jump.click();
  await number(page, index).click();
  await onCard(page, lesson, index);
}

/** Checks how a card's number shows the card stands; on a narrow screen the numbers are looked up in their window. */
export async function expectNumber(page: Page, index: number, state: "unanswered" | "waiting" | "first" | "second" | "wrong" | "theory") {
  const jump = page.locator("#question-jump");
  const narrow = await jump.isVisible();
  if (narrow) await jump.click();
  await expect(number(page, index)).toHaveAttribute("data-state", state);
  if (!narrow) return;
  await page.keyboard.press("Escape");
  await expect(page.locator(".numbers-panel")).toBeHidden();
}

/** Picks the letters on the card on screen and checks the answer; hidden options are asked for first. */
export async function answer(page: Page, letters: string[]) {
  const reveal = page.getByRole("button", { name: "Показать варианты" });
  if (await reveal.isVisible()) await reveal.click();
  for (const letter of letters) await tile(page, letter).click();
  await primary(page).click();
  await expect(feedback(page)).toBeVisible();
}

/** How a question is to be solved: on the first try, on the second, or missed on both. */
export type Plan = "first" | "second" | "wrong";

/** Solves the question on screen as planned. */
export async function solve(page: Page, card: QuestionCard, plan: Plan = "first") {
  const [wrong, other] = wrongLetters(card);
  if (plan !== "first") await answer(page, [wrong]);
  await answer(page, plan === "wrong" ? [other] : rightLetters(card));
}

/** Goes through a lesson from its first card to its summary, solving each question as `plan` says. */
export async function passLesson(page: Page, lesson: Lesson, plan: (card: QuestionCard) => Plan = () => "first") {
  for (const [index, card] of lesson.cards.entries()) {
    await onCard(page, lesson, index);
    if (isQuestion(card)) await solve(page, card, plan(card));
    await primary(page).click();
  }
  await expect(summary(page)).toBeVisible();
}

/** What the browser holds for the site, as it is stored. */
export const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), STORAGE_KEY);

/** A task's or a pass's key inside its course, as the stored form keeps it. */
export const inCourse = (site: Site, id: string) => id.slice(site.course.slug.length + 1);
