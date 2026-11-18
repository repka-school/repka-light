import { describe, expect, it } from "vitest";
import { apply, starter, type Action, type Homestead } from "./rules";
import { cellName, modeLine, saidWords, turnipTitle } from "./words";

function after(home: Homestead, ...actions: Action[]): Homestead {
  return actions.reduce((current, action) => {
    const result = apply(current, action, 5000, "2026-03-04");
    if (!result.ok) throw new Error(`${action.action} refused: ${result.reason}`);
    return result.home;
  }, home);
}

describe("a tile's name", () => {
  const home = after(starter(), { action: "plant", at: [2, 5], seed: "common" }, { action: "grow", at: [2, 5], amount: 50 });

  it("says where the tile is, counting from one, and what stands on it", () => {
    expect(cellName(home, [5, 8])).toBe("ряд 9, место 6: свободно");
    expect(cellName(home, [3, 5])).toBe("ряд 6, место 4: грядка, пустая");
    // Any tile a thing covers names the thing.
    expect(cellName(home, [2, 2])).toBe("ряд 3, место 3: Дом");
  });

  it("says how far a turnip has grown", () => {
    expect(cellName(home, [2, 5])).toBe("ряд 6, место 3: грядка, обычная репка, кустик, 50 из 100 опыта");
    expect(turnipTitle({ type: "rare", given: 0 })).toBe("редкая репка, посажено");
    expect(turnipTitle({ type: "rare", given: 200 })).toBe("редкая репка, созрела");
  });

  it("adds whether a thing being placed may go there", () => {
    expect(cellName(home, [5, 8], true)).toBe("ряд 9, место 6: свободно. Сюда можно.");
    expect(cellName(home, [2, 2], false)).toBe("ряд 3, место 3: Дом. Сюда нельзя.");
  });
});

describe("what is said", () => {
  it("names the tool in hand", () => {
    expect(modeLine({ mode: "seed", type: "epic" })).toBe("Сажаем эпическое семечко. Выбери пустую грядку.");
    expect(modeLine({ mode: "place", kind: "bed", rot: 0 })).toBe("Ставим грядку. Выбери место.");
    expect(modeLine({ mode: "move", from: [1, 1], kind: "house" })).toBe("Переносим дом. Выбери новое место.");
  });

  it("tells a turnip that grew from one that ripened", () => {
    expect(saidWords({ key: "grown", given: 10, stage: 3, ripe: false })).toBe("Репка подросла на 10. Стадия 3 из 10");
    expect(saidWords({ key: "grown", given: 5, stage: 10, ripe: true })).toBe("Репка подросла на 5 и созрела");
  });

  it("tells a purchase from one that fell short, and gives a refusal its reason", () => {
    expect(saidWords({ key: "bought", seed: "rare", left: 50 })).toBe("Куплено редкое семечко, осталось 50 опыта");
    expect(saidWords({ key: "short", lack: 30 })).toBe("Не хватает 30 опыта");
    expect(saidWords({ key: "refused", reason: "tile_taken" })).toBe("Сюда нельзя: место занято.");
    expect(saidWords({ key: "placed", kind: "fence" })).toBe("Забор поставлен");
    expect(saidWords({ key: "stocked", kind: "tree" })).toBe("Дерево на складе");
  });
});
