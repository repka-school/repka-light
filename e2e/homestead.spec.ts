import { expect, test } from "./support";
import { weatherAt } from "../src/homestead/weather";

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
