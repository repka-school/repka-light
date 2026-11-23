// The programs: a list of its own beside the course list, and a page for each
// program with its topics. A program is a plan, so there is nothing to solve:
// the tests read the built program files, as the page does, and check that
// the page shows what they hold.
import type { Program } from "../src/content/types";
import { expect, heading, test } from "./support";

test("the switch leads from the courses to the programs, and a program's card to its page", async ({ page, site, baseURL }) => {
  test.skip(site.index.programs.length === 0, "no program is published");
  const program = site.index.programs[0];
  await page.goto("courses");
  await expect(page.locator("#switch-courses")).toHaveAttribute("aria-current", "page");
  await page.locator("#switch-programs").click();
  await expect(page).toHaveURL(`${baseURL}programs`);
  await expect(heading(page)).toHaveText("Программы");
  await expect(heading(page)).toBeFocused();
  await expect(page.locator("#switch-programs")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-program]")).toHaveCount(site.index.programs.length);

  await page.locator(`[data-program="${program.slug}"] a.course-title`).click();
  await expect(page).toHaveURL(`${baseURL}program/${program.slug}`);
  await expect(heading(page)).toHaveText(program.title);
  await expect(heading(page)).toBeFocused();
  await page.locator("#program-to-courses").click();
  await expect(page).toHaveURL(`${baseURL}courses`);
  await page.locator("#switch-programs").click();
  await page.locator("#switch-courses").click();
  await expect(heading(page)).toHaveText("Все курсы");
});

test("a program shows its topics in order, and a topic opens to the points it covers", async ({ page, site }) => {
  test.skip(site.index.programs.length === 0, "no program is published");
  const { slug } = site.index.programs[0];
  const program: Program = await (await page.request.get(`content/programs/${slug}.json`)).json();
  await page.goto(`program/${slug}`);
  await expect(heading(page)).toHaveText(program.title);
  await expect(page.locator(".topic-ring-count")).toContainText(String(program.topics.length));
  await expect(page.locator("[data-topic] .topic-title")).toHaveText(program.topics.map((topic) => topic.title));
  // Each topic names its section and shows the section's drawing, when it has them.
  for (const topic of program.topics) {
    const section = program.sections.find((s) => s.slug === topic.section);
    const row = page.locator(`[data-topic="${topic.slug}"]`);
    await expect(row.locator(".topic-section")).toHaveText(section ? [section.title] : []);
    await expect(row.locator(".topic-picture")).toHaveCount(section?.picture ? 1 : 0);
    if (section?.picture) await expect(row.locator(".topic-picture")).toHaveAttribute("data-picture", section.picture);
  }

  const topic = program.topics.find((t) => t.covers.length > 0);
  test.skip(!topic, "no topic of the program lists what it covers");
  const row = page.locator(`[data-topic="${topic!.slug}"]`);
  const points = row.locator(".topic-covers li");
  await expect(points.first()).toBeHidden();
  // The row is a native disclosure: it opens from the keyboard too.
  await row.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(points).toHaveText(topic!.covers);
  await expect(points.first()).toBeVisible();
  // A phone is narrower than the longest point: the page still does not scroll sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await row.locator("summary").click();
  await expect(points.first()).toBeHidden();
});
