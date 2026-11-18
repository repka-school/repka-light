// What the learner has done, as the rest of the site shows it: the index
// page, the course list, the course, the level in the header; and what is
// already saved in a browser, read by the page as it loads.
import type { QuestionCard } from "../src/content/types";
import { standingOf } from "../src/store/xp";
import { amount, coursePath, expect, feedback, goToCard, heading, isQuestion, openLesson, passLesson, questionsOf, solve, STORAGE_KEY, stored, test, xpOf } from "./support";

test("the index page leads into the courses, and back into a started one", async ({ page, site, baseURL }) => {
  const only = site.index.courses.length === 1;
  await page.goto("");
  await expect(page.locator("#landing-start")).toHaveText("Начать заниматься");
  await expect(page.locator(".landing-reach")).toContainText(String(site.index.courses.reduce((sum, course) => sum + course.questions.length, 0)));
  await page.locator("#landing-start").click();
  // The only course is opened at once; several are chosen from the list.
  await expect(page).toHaveURL(`${baseURL}${only ? coursePath(site) : "courses"}`);

  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await solve(page, lesson.cards[index] as QuestionCard, "wrong");

  await page.locator("#brand").click();
  await expect(page.locator("#landing-start")).toHaveText("Продолжить");
  await expect(page.locator(".landing-line")).toHaveText(`Начатый курс: «${site.course.title}»`);
  await page.locator("#landing-start").click();
  await expect(page).toHaveURL(`${baseURL}${coursePath(site)}`);
});

test("the course list and the course count what is answered", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const questions = questionsOf(lesson);
  const total = site.index.courses[0].questions.length;
  await page.goto("courses");
  const card = page.locator(`[data-course="${site.course.slug}"]`);
  await expect(card).not.toHaveClass(/is-started/);
  await expect(page.getByRole("heading", { name: "Начатые курсы" })).toHaveCount(0);

  await openLesson(page, site, lesson);
  await passLesson(page, lesson, (question) => (question === questions[0] ? "second" : "first"));

  await page.locator("#nav-courses").click();
  await expect(page.getByRole("heading", { name: "Начатые курсы" })).toBeVisible();
  await expect(card).toHaveClass(/is-started/);
  await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuetext", new RegExp(`^${questions.length} из ${total} .* · ${questions.length - 1} с первого раза$`));
  await card.getByRole("link", { name: /^Продолжить/ }).click();

  // In the course: the lesson is not finished while one task took two tries, and it stays the next thing to do.
  await expect(heading(page)).toHaveText(site.course.title);
  await expect(page.locator(".course-next-title")).toHaveText("Твой прогресс");
  const row = page.locator(`[data-lesson="${lesson.slug}"]`);
  await expect(row).toHaveClass(/is-partial/);
  await expect(row.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `${questions.length} из ${questions.length}`);
  await expect(page.locator("#course-primary-start")).toContainText(lesson.title);
});

test("the level in the header grows with the experience earned", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const earned = questionsOf(lesson).reduce((sum, question) => sum + xpOf(question, "first"), 0);
  const standing = standingOf(earned);
  await openLesson(page, site, lesson);
  await expect(page.locator("#nav-level")).toHaveText("1");
  await passLesson(page, lesson);

  await expect(page.locator("#nav-level")).toHaveText(String(standing.level));
  if (standing.level > 1) await expect(page.locator("#lesson-xp")).toContainText(`Новый уровень: ${standing.level}`);
  await page.locator("#nav-level").click();
  const details = page.locator(".level-details");
  await expect(details.locator(".level-total")).toHaveText(`${amount(earned)} опыта`);
  await expect(details).toContainText(`До следующего уровня — ${amount(standing.remaining)} опыта.`);
});

test("what an earlier version of the site saved is read, and its tasks get their experience", async ({ page, site }) => {
  const [solved, second, missed] = questionsOf(site.lessons[0]);
  // The first shape the site wrote: every id in full, a time on every result, no experience yet.
  const old = {
    profile: { name: "Маша", avatar: "kitten", frame: "sea" },
    results: {
      [solved.id]: { outcome: "first", choices: solved.correct, at: "2026-01-01T10:00:00.000Z" },
      [second.id]: { outcome: "second", choices: second.correct, at: "2026-01-02T10:00:00.000Z" },
      [missed.id]: { outcome: "wrong", choices: [missed.choices.find((c) => !missed.correct.includes(c.id))!.id], at: "2026-01-03T10:00:00.000Z" },
    },
  };
  await page.addInitScript(([key, value]) => localStorage.getItem(key) ?? localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(old)]);

  await page.goto(coursePath(site));
  await expect(page.locator("#nav-profile")).toHaveAccessibleName("Маша, профиль");
  await expect(page.locator(`[data-lesson="${site.lessons[0].slug}"]`)).toHaveClass(/is-partial/);
  const earned = xpOf(solved, "first") + xpOf(second, "second");
  await page.locator("#nav-level").click();
  await expect(page.locator(".level-details .level-total")).toHaveText(`${amount(earned)} опыта`);

  // It is kept in the short form from then on, the course's last practice taken from the latest result.
  const now = await stored(page);
  expect(now).toMatchObject({ version: 2, profile: old.profile });
  expect(now.courses[site.course.slug].last).toBe("2026-01-03T10:00:00.000Z");
  expect(Object.keys(now.courses[site.course.slug].results)).toHaveLength(3);
});

test("a second tab of the site follows what the first one saves", async ({ page, context, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  await page.goto(coursePath(site));
  const other = await context.newPage();
  await openLesson(other, site, lesson);
  await goToCard(other, lesson, index);
  await solve(other, card);
  await expect(feedback(other)).toContainText("Верно!");

  // No reload in the first tab.
  await expect(page.locator(`[data-lesson="${lesson.slug}"]`)).toHaveClass(/is-partial/);
  await expect(page.locator(".course-next-title")).toHaveText("Твой прогресс");
});
