import { expect, STORAGE_KEY, test } from "./support";
import { weatherAt } from "../src/homestead/weather";

/** A saved state with experience to spend and the starter homestead; the experience is under a course of no name, which the homestead counts all the same. */
const earned = (xp: number) => JSON.stringify({ version: 2, profile: { name: "", avatar: null, frame: "none" }, courses: { earned: { xp: { task: xp } } } });
/** How far down the page an element starts, wherever the page is scrolled to. */
const topOf = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

test("a bed is planted, grown, gathered and planted again from its own card, which stays on the screen", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(([key, value]) => localStorage.getItem(key) ?? localStorage.setItem(key, value), [STORAGE_KEY, earned(200)]);
  await page.goto("homestead");
  const title = page.locator("#homestead-card-title");
  const plant = page.getByRole("button", { name: "Посадить обычное семечко" });
  // The cursor starts on the first bed.
  await page.getByRole("grid").press("Enter");
  await expect(title).toHaveText("Грядка");
  await expect(plant).toBeInViewport({ ratio: 1 });
  await plant.click();
  await expect(title).toHaveText("обычная репка, посажено");
  const grow = page.getByRole("button", { name: "Растить +50" });
  await expect(grow).toBeInViewport({ ratio: 1 });
  await grow.click();
  await grow.click();
  await expect(title).toHaveText("обычная репка, созрела");
  const gather = page.getByRole("button", { name: "Собрать в урожай" });
  await expect(gather).toBeInViewport({ ratio: 1 });
  await gather.click();
  await expect(page.locator(".homestead-harvest")).toContainText("Собрано: 1 репка");
  // The bed is empty again and no seed is left: its card leads to the seeds, and comes back when they are closed.
  await expect(title).toHaveText("Грядка");
  await expect(plant).toHaveCount(0);
  await page.locator("#homestead-card-seeds").click();
  await expect(page.locator("#homestead-chooser-title")).toBeFocused();
  await page.locator("#homestead-buy-common").click();
  // «Купить» ignores a double tap's second tap for half a second.
  await page.waitForTimeout(600);
  await page.locator("#homestead-buy-confirm-common").click();
  await expect(page.locator("#homestead-tray-seed-common")).toBeVisible();
  await page.locator("#homestead-chooser-close").click();
  await expect(title).toHaveText("Грядка");
  await expect(plant).toBeFocused();
  await plant.click();
  await expect(title).toHaveText("обычная репка, посажено");
});

test("the tray holds only what is in stock and stays in its place when a tool is picked up", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("homestead");
  await expect(page.getByRole("gridcell")).toHaveCount(144);
  const tray = page.getByRole("group", { name: "Опыт, семечки и склад" });
  const tools = () => tray.getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.id.replace("homestead-tray-", "")));
  expect(await tools()).toEqual(["grow", "seed-common", "chooser", "bed", "bush", "chicken"]);
  const before = await tray.evaluate(topOf);
  await page.locator("#homestead-tray-bed").click();
  await expect(page.locator(".homestead-mode")).toContainText("Ставим грядку.");
  expect(await tray.evaluate(topOf)).toBe(before);
  // The last bed goes onto the ground: it is no tool any more.
  const grid = page.getByRole("grid");
  await grid.press("ArrowDown");
  await grid.press("Enter");
  expect(await tools()).toEqual(["grow", "seed-common", "chooser", "bush", "chicken"]);
});

test("a card never lies over the button the keyboard is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("homestead");
  await page.getByRole("grid").press("Enter");
  await expect(page.locator("#homestead-card-title")).toHaveText("Грядка");
  /** Whether the focused element is the topmost thing at its own centre. */
  const inSight = () =>
    page.evaluate(() => {
      const el = document.activeElement!;
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return !!top && el.contains(top);
    });
  // From the scene by its buttons and the card to the tray's last tool.
  const seen: string[] = [];
  for (let presses = 0; presses < 30 && seen.at(-1) !== "homestead-tray-chicken"; presses++) {
    await page.keyboard.press("Tab");
    seen.push(await page.evaluate(() => document.activeElement!.id));
    expect(await inSight(), `${seen.at(-1)} is in sight`).toBe(true);
  }
  expect(seen).toContain("homestead-plant");
  expect(seen.at(-1)).toBe("homestead-tray-chicken");
});

test("a wide page shows the whole tray without scrolling it sideways @desktop", async ({ page }) => {
  await page.goto("homestead");
  await expect(page.getByRole("gridcell")).toHaveCount(144);
  const tray = page.getByRole("group", { name: "Опыт, семечки и склад" });
  // Everything goes to stock, so the tray holds a tool for every kind.
  for (let left = await page.locator("[data-thing]").count(); left > 0; left--) {
    await page.locator("[data-thing]").first().dispatchEvent("click");
    await page.getByRole("button", { name: "Убрать на склад" }).click();
    await expect(page.locator("[data-thing]")).toHaveCount(left - 1);
  }
  await expect(tray.getByRole("button")).toHaveCount(14);
  expect(await tray.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("pollinators shelter during a passing shower", async ({ page }) => {
  // Start at a period boundary, before its shower, and advance the browser clock.
  const start = new Date("2026-11-20T10:00:00Z");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { start: shower, end } = weatherAt(+start);
  await page.clock.install({ time: start });
  await page.goto("homestead");
  await expect(page.getByRole("gridcell")).toHaveCount(144);
  await expect(page.locator(".homestead-butterfly svg").first()).toBeVisible();
  await expect(page.locator(".homestead-bee svg").first()).toBeVisible();
  const pets = page.locator(".roaming-pet");
  const positions = () => pets.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
  const yard = await positions();
  const insects = page.locator(".homestead-insect");
  const opacities = () => insects.evaluateAll((nodes) => nodes.map((node) => Number(getComputedStyle(node).opacity)));
  const yardInsectOpacities = await opacities();
  await page.clock.pauseAt(new Date(shower));
  await page.clock.fastForward(4000);
  const partlyVisible = async () => (await opacities()).some((opacity) => opacity > 0 && opacity < 1);
  await expect.poll(partlyVisible).toBe(true);
  expect(new Set(await opacities()).size).toBeGreaterThan(1);
  await page.clock.fastForward(6000);
  await expect.poll(opacities).toEqual(yardInsectOpacities.map(() => 0));
  await expect.poll(async () => (await positions()).every((position, i) => position !== yard[i])).toBe(true);
  const sheltered = await positions();
  expect(sheltered).toHaveLength(2);
  await page.clock.resume();
  await page.reload();
  await expect(page.locator(".homestead-rain")).toBeVisible();
  await expect(page.locator("[data-thing=pond] .pond-bird")).toHaveCount(3);
  expect(await positions()).toEqual(sheltered);
  await page.clock.pauseAt(new Date(end - 7000));
  await expect.poll(partlyVisible).toBe(true);
  await page.clock.fastForward(7000);
  await expect(page.locator(".homestead-rain")).toHaveCount(0);
  await expect.poll(positions).toEqual(yard);
  await expect.poll(opacities).toEqual(yardInsectOpacities);
  await expect(page.locator(".homestead-butterfly svg").first()).toBeVisible();
  await expect(page.locator(".homestead-bee svg").first()).toBeVisible();
});

test("a wandering pet is selectable away from home and returns for rain @desktop", async ({ page }) => {
  test.setTimeout(65_000);
  const morning = +new Date("2026-11-20T10:00:00Z");
  const shower = weatherAt(morning).next;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install({ time: new Date(morning) });
  await page.addInitScript(() => { Math.random = () => .35; });
  await page.goto("homestead");
  const cat = page.locator('.roaming-pet[data-pet="cat"]');
  await expect(cat).toHaveAttribute("data-tile", "4,7");
  await page.getByRole("button", { name: "Показать всё" }).click();
  await page.clock.pauseAt(new Date(morning + 8000));
  await page.clock.runFor(13500);
  await expect(cat).not.toHaveAttribute("data-tile", "4,7");
  await cat.locator("circle.p-cat").click();
  await expect(page.locator("#homestead-card-title")).toHaveText("Кот");
  await page.clock.fastForward(shower - morning - 21500);
  await expect(page.locator(".homestead-rain")).toBeVisible();
  await page.clock.runFor(24000);
  await expect(page.locator(".roaming-pet[data-sheltered]")).toHaveCount(2);
});

test("both illustrated pets swing diagonal leg pairs and sit for reduced motion", async ({ page }) => {
  const morning = new Date("2026-11-20T10:00:00Z");
  await page.clock.install({ time: morning });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Math.random = () => .35; });
  await page.goto("homestead");
  await expect(page.locator(".roaming-pet svg")).toHaveCount(2);
  await page.clock.pauseAt(new Date(+morning + 8000));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // The page hears of the change a moment later, and the pets set off only then: the clock waits for it.
  await page.evaluate(() => new Promise<void>((heard) => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) reduced.addEventListener("change", () => heard(), { once: true });
    else heard();
  }));
  await page.clock.runFor(6500);

  for (const kind of ["cat", "dog"]) {
    const pet = page.locator(`.roaming-pet[data-pet="${kind}"]`);
    await expect(pet.locator(".p-leg")).toHaveCount(4);
    const angles = await pet.locator(".p-leg").evaluateAll((legs) => {
      const animations = legs.map((leg) => leg.getAnimations()[0]);
      return [0, 320].map((time) => {
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = time;
        }
        return legs.map((leg) => Math.sign(new DOMMatrix(getComputedStyle(leg).transform).b));
      });
    });
    expect(angles).toEqual([[-1, 1, 1, -1], [1, -1, -1, 1]]);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".roaming-pet .p-leg")).toHaveCount(0);
  await expect(page.locator(".roaming-pet .p-tail")).toHaveCount(2);
  for (const tail of await page.locator(".roaming-pet .p-tail").all()) {
    await expect(tail).toHaveCSS("animation-name", "none");
  }
});

test("the illustrated duck family swims and pauses for reduced motion", async ({ page }) => {
  const morning = new Date("2026-11-20T10:00:00Z");
  await page.clock.install({ time: morning });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("homestead");
  const pond = page.locator('[data-thing="pond"]');
  const ducks = pond.locator("svg .pond-bird");
  await expect(ducks).toHaveCount(3);
  for (const duck of await ducks.all()) await expect(duck).toBeVisible();
  await expect(pond.locator("svg .pond-wake")).toHaveCount(3);
  await expect(pond.locator("canvas")).toHaveCount(0);
  const positions = () => pond.locator(".pond-bird, .pond-wake").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("transform")),
  );
  await page.clock.pauseAt(new Date(+morning + 1000));
  const still = await positions();
  await page.clock.runFor(600);
  expect(await positions()).toEqual(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(600);
  expect((await positions()).every((position, index) => position !== still[index])).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(100);
  const paused = await positions();
  await page.clock.runFor(600);
  expect(await positions()).toEqual(paused);
});

test("stocked animals, bushes and the duck pond return to the garden", async ({ page }) => {
  await page.goto("homestead");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const grid = page.getByRole("grid");
  for (const [kind, name, shape] of [["cat", "Кот", "circle.p-cat"], ["dog", "Пёс", ".p-dog"], ["bush", "Куст", ".g-berry"], ["cow", "Корова", ".cow-head ellipse"], ["chicken", "Курица", ".hen-body circle"], ["pond", "Пруд с утками", "path[fill^=url]"]]) {
    await page.getByRole("button", { name: "Показать всё" }).click();
    await expect(page.locator(".homestead-pan")).toBeHidden();
    const items = page.locator(`[data-thing="${kind}"]`);
    const count = await items.count();
    // A tap on the actual drawing selects the item, including on a touch screen.
    const drawing = kind === "cat" || kind === "dog" ? page.locator(`.roaming-pet[data-pet="${kind}"]`) : items.first();
    const shapeBox = await drawing.locator(shape).first().boundingBox();
    if (!shapeBox) throw new Error(`Missing drawing for ${kind}`);
    await page.mouse.click(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2);
    await expect(page.locator("#homestead-card-title")).toHaveText(name);
    await page.getByRole("button", { name: "Убрать на склад" }).click();
    await expect(items).toHaveCount(count - 1);
    await page.reload();
    await expect(items).toHaveCount(count - 1);
    await page.locator(`#homestead-tray-${kind}`).click();
    // From the first bed (2,5), place each item at (0,9), then put it away.
    await grid.press("ArrowLeft");
    await grid.press("ArrowLeft");
    for (let i = 0; i < 4; i++) await grid.press("ArrowDown");
    await grid.press("Enter");
    await expect(items).toHaveCount(count);
    await grid.press("Enter");
    await page.getByRole("button", { name: "Убрать на склад" }).click();
  }
});
