// A lesson in the browser: its cards one at a time, two tries per question,
// the summary, and the pass kept through a reload.
import type { QuestionCard } from "../src/content/types";
import { answer, coursePath, expect, expectNumber, feedback, findCard, goToCard, inCourse, isQuestion, onCard, openLesson, option, passLesson, primary, questionsOf, rightLetters, solve, stored, summary, test, tile, wrongLetters, xpOf, amount } from "./support";

test("a lesson solved on the first try ends in a perfect summary and is marked finished in the course", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const questions = questionsOf(lesson);
  const earned = questions.reduce((sum, q) => sum + xpOf(q, "first"), 0);
  await openLesson(page, site, lesson);
  await passLesson(page, lesson);

  await expect(page.locator("#screen-title")).toHaveText("Отлично!");
  await expect(page.locator(".score-ring-value strong")).toHaveText(`${questions.length} из ${questions.length}`);
  await expect(page.locator("#lesson-xp")).toContainText(`За урок: +${amount(earned)} опыта`);
  await expect(page.locator("#retry-mistakes")).toHaveCount(0);

  // Out of the lesson, the course shows it done.
  await page.getByRole("link", { name: "К курсу" }).click();
  await expect(page).toHaveURL(new RegExp(`/${coursePath(site)}$`));
  const row = page.locator(`[data-lesson="${lesson.slug}"]`);
  await expect(row).toHaveClass(/is-finished/);
  await expect(row.getByRole("link")).toHaveText("Повторить");
});

test("a right first answer gives the task's experience at once", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await expect(primary(page)).toBeDisabled();
  await tile(page, rightLetters(card)[0]).click();
  await expect(primary(page)).toHaveText(/Проверить ответ/);
  await primary(page).click();

  await expect(feedback(page)).toContainText("Верно! Отличный шаг вперёд.");
  await expect(feedback(page)).toContainText(`+${amount(xpOf(card, "first"))} опыта`);
  await expect(page.getByRole("heading", { name: "Разбор решения" })).toBeVisible();
  await expectNumber(page, index, "first");
  expect((await stored(page)).courses[site.course.slug]).toMatchObject({
    results: { [inCourse(site, card.id)]: ["f", ...card.correct] },
    xp: { [inCourse(site, card.id)]: xpOf(card, "first") },
  });
});

test("a wrong first answer gets a hint and one more try, with its letter locked", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  const [wrong] = wrongLetters(card);
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await answer(page, [wrong]);

  await expect(feedback(page)).toContainText("Неверно");
  await expect(feedback(page)).toContainText("Попробуй ещё раз.");
  // The right answer is not given away yet.
  await expect(feedback(page)).not.toContainText("Правильный ответ");
  await expect(page.getByRole("heading", { name: "Подсказка" })).toBeVisible();
  await expect(option(page, wrong)).toBeDisabled();
  await expect(primary(page)).toHaveText(/Проверить ещё раз/);
  await expect(primary(page)).toBeDisabled();
  await expectNumber(page, index, "waiting");
  // Nothing is settled, so no result is saved.
  expect((await stored(page)).courses[site.course.slug].results).toBeUndefined();

  await answer(page, rightLetters(card));
  await expect(feedback(page)).toContainText("Верно со второй попытки");
  await expect(feedback(page)).toContainText(`+${amount(xpOf(card, "second"))} опыта`);
  await expectNumber(page, index, "second");
  expect((await stored(page)).courses[site.course.slug].results[inCourse(site, card.id)][0]).toBe("s");
});

test("two wrong answers settle the task: the solution shows and there is no third try", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await solve(page, card, "wrong");

  await expect(feedback(page)).toContainText("Неверно. Разберёмся вместе.");
  await expect(feedback(page)).toContainText(`Правильный ответ: ${rightLetters(card).join(", ")}`);
  await expect(feedback(page)).not.toContainText("опыта");
  await expect(page.getByRole("heading", { name: "Разбор решения" })).toBeVisible();
  for (const choice of card.choices) await expect(option(page, choice.label)).toBeDisabled();
  await expect(primary(page)).toHaveText(/Следующее задание/);
  await expectNumber(page, index, "wrong");
});

test("a reload brings the lesson back as it was left", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  const [wrong] = wrongLetters(card);
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await answer(page, [wrong]);

  await page.reload();
  await onCard(page, lesson, index);
  await expect(feedback(page)).toContainText("Попробуй ещё раз.");
  await expect(option(page, wrong)).toBeDisabled();
  await answer(page, rightLetters(card));
  await expect(feedback(page)).toContainText("Верно со второй попытки");

  // And the course says the lesson is under way.
  await page.goto(coursePath(site));
  await expect(page.locator(`[data-lesson="${lesson.slug}"]`).getByRole("link")).toHaveText("Продолжить");
});

test("the summary keeps through a reload; mistakes can be solved again, and the lesson started over", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const questions = questionsOf(lesson);
  const [missed, second] = questions;
  const place = (card: QuestionCard) => lesson.cards.indexOf(card);
  await openLesson(page, site, lesson);
  await passLesson(page, lesson, (card) => (card === missed ? "wrong" : card === second ? "second" : "first"));

  await expect(page.locator("#screen-title")).toHaveText("Урок пройден");
  const legend = page.locator(".score-legend strong");
  await expect(legend).toHaveText([String(questions.length - 2), "1", "1"]);
  await page.reload();
  await expect(summary(page)).toBeVisible();
  await expect(legend).toHaveText([String(questions.length - 2), "1", "1"]);

  // The review opens a task with the learner's answers and the right one.
  const review = page.locator(".review-item").first();
  await review.locator("summary").click();
  await expect(review.locator(".answer-comparison")).toContainText(`Правильный ответ: ${rightLetters(missed).join(", ")}`);

  // Only the two mistakes are asked again; the rest stay solved.
  await page.locator("#retry-mistakes").click();
  await onCard(page, lesson, place(missed));
  await expectNumber(page, place(questions[2]), "first");
  await solve(page, missed);
  // Solved better than before: the rest of its experience is given now.
  await expect(feedback(page)).toContainText(`+${amount(xpOf(missed, "first"))} опыта`);
  await primary(page).click();
  await onCard(page, lesson, place(second));
  await solve(page, second);
  await expect(feedback(page)).toContainText(`+${amount(xpOf(second, "first") - xpOf(second, "second"))} опыта`);
  await primary(page).click();
  await expect(page.locator("#screen-title")).toHaveText("Отлично!");

  // «Повторить урок» starts from the first card with nothing answered, and a repeat gives no experience.
  await page.locator("#again").click();
  await onCard(page, lesson, 0);
  await goToCard(page, lesson, place(missed));
  await expect(feedback(page)).toHaveCount(0);
  await solve(page, missed);
  await expect(feedback(page)).toContainText("Верно!");
  await expect(feedback(page)).not.toContainText("опыта");
});

test("the next lesson is one press from the summary", async ({ page, site }) => {
  const [lesson, next] = site.lessons;
  await openLesson(page, site, lesson);
  await passLesson(page, lesson);
  await page.locator("#next-lesson").click();
  await expect(page.locator(".lesson-title-line")).toHaveText(next.title);
  await onCard(page, next, 0);
});

test("hidden options show when asked for, and stay shown after a reload", async ({ page, site }) => {
  const { lesson, index } = findCard(site, (card) => isQuestion(card) && card.hideOptions);
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  await expect(page.locator("label.choice")).toHaveCount(0);
  await expect(primary(page)).toBeDisabled();
  await page.getByRole("button", { name: "Показать варианты" }).click();
  await expect(page.locator("label.choice")).toHaveCount((lesson.cards[index] as QuestionCard).choices.length);

  await page.reload();
  await onCard(page, lesson, index);
  await expect(page.locator("label.choice").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Показать варианты" })).toHaveCount(0);
});

test("a theory riddle keeps its answer until asked", async ({ page, site }) => {
  const { lesson, index, card } = findCard(site, (card) => !isQuestion(card) && card.blocks.some((block) => block.kind === "try"));
  const riddle = !isQuestion(card) && card.blocks.find((block) => block.kind === "try");
  if (!riddle || riddle.kind !== "try") throw new Error("no riddle");
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  const section = page.locator(".theory-try").first();
  await expect(section.locator(".theory-answer")).toBeEmpty();
  await section.getByRole("button", { name: "Показать ответ" }).click();
  await expect(section.locator(".theory-answer")).toContainText(riddle.answer);
  await section.getByRole("button", { name: "Скрыть ответ" }).click();
  await expect(section.locator(".theory-answer")).toBeEmpty();
});

test("theory HTML distinguishes warnings, rules and definitions and shows list markers", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const cards = lesson.cards.map((card, index) => index === 0 ? {
    id: card.id,
    kind: "theory",
    title: "Теория",
    body: [
      "<blockquote><p><strong>!</strong> Длину пути считай по рёбрам.</p></blockquote>",
      "<blockquote><p><strong>Кратчайший путь</strong> имеет наименьшую длину.</p></blockquote>",
      "<blockquote><p><strong>Запомни:</strong> Цикл замыкается.</p></blockquote>",
      "<ol><li>Сосчитай рёбра.</li></ol>",
      "<ul><li>Проверь ответ.</li></ul>",
    ].join(""),
    blocks: [],
  } : card);
  const [module, ...rest] = site.course.modules;
  const course = { ...site.course, modules: [{ ...module, lessons: [{ ...lesson, cards }, ...module.lessons.slice(1)] }, ...rest] };
  await page.route(`**/content/${site.course.slug}.json`, (route) => route.fulfill({ json: course }));
  await openLesson(page, site, lesson);

  const warning = page.getByRole("group", { name: "Предупреждение" });
  const rule = page.getByRole("group", { name: "Правило" });
  const definition = page.locator(".rich-body blockquote").filter({ hasText: "Кратчайший путь" });
  await expect(warning.locator("strong[aria-hidden=true]")).toHaveText("!");
  await expect(rule.locator("strong[aria-hidden=true]")).toHaveText("✓");
  await expect(warning).toHaveCSS("background-color", "rgb(255, 240, 207)");
  await expect(rule).toHaveCSS("background-color", "rgb(220, 234, 248)");
  await expect(definition).toHaveCSS("background-color", "rgb(230, 240, 234)");
  await expect(page.locator(".rich-body ol")).toHaveCSS("list-style-type", "decimal");
  await expect(page.locator(".rich-body ul")).toHaveCSS("list-style-type", "disc");
});

test("an illustration opens in a window of its own and closes back to the card", async ({ page, site }) => {
  const { lesson, index } = findCard(site, (card) => isQuestion(card) && card.body.includes("<img"));
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  const picture = page.locator(".question-body .illustration-button");
  // The picture's address starts with the site's sub-path, and it loads.
  await expect.poll(() => picture.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await picture.click();
  const opened = page.locator("dialog.illustration-dialog");
  await expect(opened).toBeVisible();
  await expect.poll(() => opened.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth > 0 && img.width > 0)).toBe(true);
  await opened.getByRole("button", { name: "Закрыть" }).click();
  await expect(opened).toBeHidden();
  await expect(picture).toBeFocused();
});

test("Repka formulas and picture options work through answering and review", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const image = site.course.cover;
  if (!image) throw new Error("the course fixture needs a local picture");
  const fraction = "<mfrac><mn>1</mn><mn>2</mn></mfrac>";
  const wideFormula = `<math display="block"><mrow>${"<mi>x</mi><mo>+</mo>".repeat(70)}<mi>y</mi></mrow></math>`;
  const cards: QuestionCard[] = [
    {
      id: "compatibility/formula", kind: "question", answerKind: "single", hideOptions: true, points: null,
      body: `<p>Выбери дробь.</p>${wideFormula}`,
      choices: [
        { id: 9, label: "Б", text: "1/2", html: `<span class="formula"><math><semantics>${fraction}<annotation encoding="application/x-tex">fraction-source</annotation></semantics></math></span>` },
        { id: 3, label: "А", text: "x2", html: "<u>x<sup>2</sup></u>" },
      ],
      correct: [9], hint: null, explanation: `<p>Решение.</p><math display="block">${fraction}</math>`,
    },
    {
      id: "compatibility/picture", kind: "question", answerKind: "multi", hideOptions: false, points: null,
      body: `<p>Выбери рисунки.</p><img src="${image}" alt="Изображение вариантов ответа А–В">`,
      choices: [
        { id: 4, label: "В", text: "", html: "" },
        { id: 2, label: "А", text: "", html: "" },
        { id: 7, label: "Б", text: "", html: "" },
      ],
      correct: [4, 2], hint: null, explanation: null,
    },
  ];
  const [module] = site.course.modules;
  await page.route(`**/content/${site.course.slug}.json`, (route) => route.fulfill({
    json: { ...site.course, modules: [{ ...module, lessons: [{ ...lesson, cards }] }] },
  }));
  await openLesson(page, site, lesson);

  const formula = page.locator(".question-body .formula-display");
  await expect(formula).toHaveAttribute("tabindex", "0");
  await expect(formula.getByRole("math")).toBeVisible();
  await expect(option(page, "Б")).toHaveCount(0);
  await page.getByRole("button", { name: "Показать варианты" }).click();
  await expect(option(page, "Б")).toHaveAccessibleName("Б: 1/2");
  await expect(tile(page, "Б").locator("mfrac")).toBeVisible();
  await expect(tile(page, "Б").locator("annotation")).toBeHidden();
  await expect(tile(page, "А").locator("u > sup")).toHaveText("2");
  await answer(page, ["Б"]);
  await expect(page.locator(".explanation mfrac")).toBeVisible();
  await primary(page).click();

  const picture = page.getByRole("button", { name: "Открыть: Изображение вариантов ответа А–В" });
  await expect(picture).toBeVisible();
  await picture.click();
  await expect(page.locator("dialog.illustration-dialog img")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть" }).click();
  await expect(picture).toBeFocused();
  await expect(page.locator(".choices")).toHaveAttribute("data-fit", "letters");
  await expect(option(page, "В")).toHaveAccessibleName("В");
  await answer(page, ["В", "А"]);
  await primary(page).click();

  await expect(summary(page)).toBeVisible();
  const review = summary(page).locator(".review-item");
  await review.nth(0).locator("summary").click();
  await expect(review.nth(0).locator(".review-options .is-correct mfrac")).toBeVisible();
  await review.nth(1).locator("summary").click();
  await expect(review.nth(1).getByRole("button", { name: "Открыть: Изображение вариантов ответа А–В" })).toBeVisible();
  await expect(review.nth(1)).toContainText("Правильный ответ");
});

test("a question is answered from the keyboard @desktop", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const index = lesson.cards.findIndex(isQuestion);
  const card = lesson.cards[index] as QuestionCard;
  const letters = card.choices.map((c) => c.label);
  const right = rightLetters(card)[0];
  await openLesson(page, site, lesson);
  await goToCard(page, lesson, index);
  // Arrows walk the letters as one radio group; Enter on the action checks.
  await option(page, letters[0]).focus();
  await page.keyboard.press("Space");
  for (let at = 0; at < letters.indexOf(right); at++) await page.keyboard.press("ArrowDown");
  await expect(option(page, right)).toBeChecked();
  await primary(page).focus();
  await page.keyboard.press("Enter");
  await expect(feedback(page)).toContainText("Верно!");
});
