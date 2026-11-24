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
  const unusedCourses = ["course/no-such-course"];
  if (!site.index.courses.some((course) => course.slug === "index")) unusedCourses.push("course/index");
  // The last three are folders of the built site with no page of their own.
  for (const address of ["no/such/page", ...unusedCourses, "program/no-such-program", `${coursePath(site)}/lesson/no-such-lesson`, "course/no-such-course/lesson/none", "course", `${coursePath(site)}/lesson`, "program"]) {
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

for (const chunkName of ["ProfileScreen", "dialog"]) {
  test(`secondary screen code loads on demand and a failed ${chunkName} download can be retried`, async ({ page }) => {
    const chunk = new RegExp(`/assets/${chunkName}-[^/]+\\.js$`);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("");
    await expect(heading(page)).toContainText("тренажёр для школьников");
    expect(requests.some((url) => chunk.test(url))).toBe(false);

    let unavailable = true;
    await page.route(chunk, (route) => unavailable ? route.fulfill({ status: 503, body: "" }) : route.continue());
    await page.locator("#nav-profile").click();
    await expect(heading(page)).toHaveText("Не удалось загрузить страницу.");
    await expect(heading(page)).toBeFocused();
    unavailable = false;
    await page.getByRole("button", { name: "Попробовать снова" }).click();
    await expect(heading(page)).toHaveText("Мой профиль");
  });
}

test("opening a course starts at the top and Back restores the catalog position", async ({ page }) => {
  await page.goto("courses");
  const link = page.locator(".catalog-card .course-title").last();
  await link.scrollIntoViewIfNeeded();
  const title = await link.innerText();
  const scrollY = () => page.evaluate(() => window.scrollY);
  const catalogPosition = await scrollY();
  expect(catalogPosition).toBeGreaterThan(0);

  await link.click();
  await expect(heading(page)).toHaveText(title);
  await expect(heading(page)).toBeInViewport();
  await expect.poll(scrollY).toBe(0);

  await page.goBack();
  await expect(heading(page)).toHaveText("Все курсы");
  await expect.poll(scrollY).toBeCloseTo(catalogPosition, 0);
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

test("the course outline loads without card bodies and opening a lesson loads only that lesson", async ({ page, site }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.includes("/content/lessons/")) requested.push(pathname);
  });
  await page.goto(coursePath(site));
  await expect(heading(page)).toHaveText(site.course.title);
  expect(requested).toEqual([]);
  const lesson = site.lessons[0];
  await page.locator("#course-primary-start").click();
  await expect(page.locator(".lesson-title-line")).toHaveText(lesson.title);
  expect(requested).toEqual([expect.stringContaining(`/content/lessons/${site.course.slug}/${lesson.slug}.json`)]);
});

test("missing or malformed data for a listed lesson can be repaired and retried", async ({ page, site }) => {
  const lesson = site.lessons[0];
  const file = `**/content/lessons/${site.course.slug}/${lesson.slug}.json`;
  await page.route(file, (route) => route.fulfill({ json: { ...lesson, cards: [null] } }), { times: 1 });
  await page.route(file, (route) => route.fulfill({ status: 404, body: "" }), { times: 1 });
  await page.goto(lessonPath(site, lesson));
  await expect(heading(page)).toHaveText("Не удалось загрузить страницу.");
  const malformed = page.waitForResponse((response) => response.url().endsWith(`/${lesson.slug}.json`) && response.ok());
  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await malformed;
  await expect(heading(page)).toHaveText("Не удалось загрузить страницу.");
  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await expect(page.locator(".lesson-title-line")).toHaveText(lesson.title);
});
