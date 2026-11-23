// The site's addresses, on a host that only has files: every screen opens by
// its own address under the sub-path and is found there, links stay inside
// it, and the page asks for nothing outside its origin.
import { coursePath, expect, heading, lessonPath, test } from "./support";

test("every screen opens by its address, and again after a reload", async ({ page, site, baseURL }) => {
  const lesson = site.lessons[0];
  const screens: [address: string, shows: () => Promise<void>][] = [
    ["", () => expect(heading(page)).toContainText("тренажёр для школьников")],
    ["courses", () => expect(heading(page)).toHaveText("Все курсы")],
    ["programs", () => expect(heading(page)).toHaveText("Программы")],
    ...site.index.programs.slice(0, 1).map((program): [string, () => Promise<void>] => [`program/${program.slug}`, () => expect(heading(page)).toHaveText(program.title)]),
    [coursePath(site), () => expect(heading(page)).toHaveText(site.course.title)],
    [lessonPath(site, lesson), () => expect(page.locator(".lesson-title-line")).toHaveText(lesson.title)],
    ["profile", () => expect(heading(page)).toHaveText("Мой профиль")],
    ["homestead", () => expect(heading(page)).toHaveText("Мой огород")],
  ];
  for (const [address, shows] of screens) {
    const response = await page.goto(address);
    // Every address the site has is a file of its own, so the host finds it.
    expect(response?.status(), address).toBe(200);
    await shows();
    await page.reload();
    await shows();
    expect(page.url()).toBe(`${baseURL}${address}`);
  }
});

test("an address the site does not have says so and leads to the courses", async ({ page, site, baseURL }) => {
  // The last three are folders of the built site with no page of their own.
  for (const address of ["no/such/page", "course/no-such-course", "program/no-such-program", `${coursePath(site)}/lesson/no-such-lesson`, "course/no-such-course/lesson/none", "course", `${coursePath(site)}/lesson`, "program"]) {
    const response = await page.goto(address);
    // The host answers with its «not found» page, which is the site.
    expect(response?.status(), address).toBe(404);
    await expect(heading(page)).toHaveText("Такой страницы нет.");
  }
  await page.getByRole("link", { name: "Ко всем курсам" }).click();
  await expect(page).toHaveURL(`${baseURL}courses`);
  await expect(heading(page)).toHaveText("Все курсы");
});

test("links lead from the index to a lesson and back, all inside the sub-path", async ({ page, site, baseURL }) => {
  const lesson = site.lessons[0];
  await page.goto("");
  await page.locator("#nav-courses").click();
  await expect(page).toHaveURL(`${baseURL}courses`);
  await page.locator(`[data-course="${site.course.slug}"] a.course-title`).click();
  await expect(page).toHaveURL(`${baseURL}${coursePath(site)}`);
  await page.locator("#course-primary-start").click();
  await expect(page).toHaveURL(`${baseURL}${lessonPath(site, lesson)}`);
  await page.locator("#to-course").click();
  await expect(page).toHaveURL(`${baseURL}${coursePath(site)}`);
  await page.locator("#nav-profile").click();
  await expect(page).toHaveURL(`${baseURL}profile`);
  await page.locator("#brand").click();
  await expect(page).toHaveURL(baseURL!);
  // The browser's Back goes through the same screens.
  await page.goBack();
  await expect(heading(page)).toHaveText("Мой профиль");
});

test("moving to another screen puts focus on its heading, also when the screen has to load first", async ({ page, site }) => {
  await page.goto("");
  await page.locator("#nav-courses").click();
  await expect(heading(page)).toBeFocused();
  // The course is fetched on this click: its heading is not there yet when the screen changes.
  await page.locator(`[data-course="${site.course.slug}"] a.course-title`).click();
  await expect(heading(page)).toHaveText(site.course.title);
  await expect(heading(page)).toBeFocused();
  await page.locator("#course-primary-start").click();
  await expect(page.locator(".lesson-title-line")).toBeVisible();
  await expect(heading(page)).toBeFocused();

  await page.goto("course/no-such-course");
  await expect(heading(page)).toHaveText("Такой страницы нет.");
  await expect(heading(page)).toBeFocused();
});

test("the page asks for nothing outside its own address, and every picture it shows loads", async ({ page, site, baseURL }) => {
  const asked: string[] = [];
  const failed: string[] = [];
  page.on("request", (request) => asked.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.request().resourceType() !== "document") failed.push(`${response.status()} ${response.url()}`);
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const pictured = site.lessons.find((lesson) => lesson.cards.some((card) => card.kind !== "drill" && card.body.includes("<img"))) ?? site.lessons[0];
  for (const address of ["", "courses", "programs", ...site.index.programs.slice(0, 1).map((program) => `program/${program.slug}`), coursePath(site), lessonPath(site, pictured), "profile"]) {
    await page.goto(address);
    await expect(page.locator("#app")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const broken = await page.locator("img").evaluateAll((images: HTMLImageElement[]) => images.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src));
    expect(broken, `pictures that did not load on «${address}»`).toEqual([]);
  }
  expect(asked.filter((url) => !url.startsWith(baseURL!) && !url.startsWith("data:") && !url.startsWith("blob:"))).toEqual([]);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test("a course's cover is shown in the course list", async ({ page, site }) => {
  test.skip(!site.course.cover, "the first course has no cover");
  await page.goto("courses");
  const cover = page.locator(`[data-course="${site.course.slug}"] .course-cover img`);
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});
