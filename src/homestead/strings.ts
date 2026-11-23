// The homestead's words, kept with it so they load with its screen. The
// rest of the site's strings are in src/strings.ts. The interface is in Russian.
import { count } from "@/ui/i18n/plural";
import { GROW_STEPS, STAGES, type Kind, type Quality, type Reason } from "./rules";

const amount = (n: number) => n.toLocaleString("ru-RU");

const turnipForms = ["репка", "репки", "репок"] as const;

// The homestead's nouns: a thing's kind as a title and as an object, and a quality as it agrees with «репка» and with «семечко».
const kindNames = { house: "Дом", barn: "Сарай", fence: "Забор", tree: "Дерево", bush: "Куст", bed: "Грядка", cat: "Кот", dog: "Пёс", chicken: "Курица", cow: "Корова", pond: "Пруд с утками" } satisfies Record<Kind, string>;
const kindObjects = { house: "дом", barn: "сарай", fence: "забор", tree: "дерево", bush: "куст", bed: "грядку", cat: "кота", dog: "пса", chicken: "курицу", cow: "корову", pond: "пруд с утками" } satisfies Record<Kind, string>;
const turnipQualities = { common: "обычная", rare: "редкая", epic: "эпическая", legendary: "легендарная" } satisfies Record<Quality, string>;
const seedQualities = { common: "обычное", rare: "редкое", epic: "эпическое", legendary: "легендарное" } satisfies Record<Quality, string>;
const seedTitles = { common: "Обычное", rare: "Редкое", epic: "Эпическое", legendary: "Легендарное" } satisfies Record<Quality, string>;

/** A saved day, YYYY-MM-DD, as «18 ноября». */
function dayWords(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export const w = {
  title: "Мой огород",
  toCourses: "К курсам",
  kinds: kindNames,
  /** A turnip's growth stages, by stage number − 1. */
  stages: ["посажено", "проклюнулось", "росток", "первые листья", "кустик", "завязь", "наливается", "крупнеет", "почти созрела", "созрела"],
  tray: {
    label: "Опыт, семечки и склад",
    grow: "Растить",
    xp: (n: number) => `${amount(n)} опыта`,
    seed: (type: Quality) => `${seedQualities[type]} семечко`,
    count: (n: number) => `×${n}`,
  },
  modes: {
    grow: `Выбери репку, чтобы дать ей до ${GROW_STEPS[0]} опыта.`,
    seed: (type: Quality) => `Сажаем ${seedQualities[type]} семечко. Выбери пустую грядку.`,
    place: (kind: Kind) => `Ставим ${kindObjects[kind]}. Выбери место.`,
    move: (kind: Kind) => `Переносим ${kindObjects[kind]}. Выбери новое место.`,
    here: (ok: boolean) => (ok ? "Сюда можно." : "Сюда нельзя."),
    cancel: "Отмена",
    rotate: "Повернуть",
    cancelled: "Отменено.",
  },
  scene: {
    label: "Огород",
    hint: "Тяни огород, чтобы осмотреться; колёсико или два пальца — ближе и дальше. Выбранную вещь можно перетащить.",
    /** The same on a screen that is only touched: no wheel. */
    hintTouch: "Тяни огород, чтобы осмотреться; двумя пальцами — ближе и дальше. Выбранную вещь можно перетащить.",
    keys: "Стрелками выбирай клетку, Enter — выбрать или применить, Escape — отмена, плюс и минус — ближе и дальше, 0 — весь огород, R — повернуть забор.",
    position: (x: number, y: number) => `ряд ${y + 1}, место ${x + 1}`,
    free: "свободно",
    emptyBed: "грядка, пустая",
    turnip: (type: Quality, stage: string, given: number, total: number) => `грядка, ${turnipQualities[type]} репка, ${stage}, ${given} из ${total} опыта`,
    cell: (position: string, content: string) => `${position}: ${content}`,
  },
  card: {
    close: "Закрыть",
    turnip: (type: Quality, stage: string) => `${turnipQualities[type]} репка, ${stage}`,
    stageOf: (stage: number) => `стадия ${stage} из ${STAGES}`,
    toNext: (since: number, span: number) => `до следующей стадии ${since}/${span}`,
    total: (given: number, total: number) => `всего ${given}/${total} опыта`,
    grow: (n: number) => `Растить +${n}`,
    emptyBed: "Грядка пустая. Посади в неё семечко.",
    emptyBedNoSeed: "Грядка пустая, а семечек нет.",
    plant: (type: Quality) => `Посадить ${seedQualities[type]} семечко`,
    ripe: "созрела",
    ripenedOn: (day: string) => `Созрела ${dayWords(day)}`,
    gather: "Собрать в урожай",
    move: "Передвинуть",
    rotate: "Повернуть",
    stock: "Убрать на склад",
  },
  said: {
    grown: (n: number, stage: number) => `Репка подросла на ${n}. Стадия ${stage} из ${STAGES}`,
    ripened: (n: number) => `Репка подросла на ${n} и созрела`,
    planted: (type: Quality) => `Посажено: ${seedQualities[type]} семечко`,
    gathered: "Репка собрана в урожай",
    gatheredShort: "Репка собрана",
    stocked: (kind: Kind) => `${kindNames[kind]} на складе`,
    placed: { house: "Дом поставлен", barn: "Сарай поставлен", fence: "Забор поставлен", tree: "Дерево поставлено", bush: "Куст поставлен", bed: "Грядка поставлена", cat: "Кот в огороде", dog: "Пёс в огороде", chicken: "Курица в огороде", cow: "Корова в огороде", pond: "Пруд с утками на месте" } satisfies Record<Kind, string>,
    rotated: "Забор повёрнут",
  },
  /** Why a change was refused. */
  reasons: {
    no_xp: "Свободного опыта нет: реши новое задание.",
    not_enough_xp: "Не хватает опыта.",
    no_seed: "Семечек такого вида нет.",
    not_in_stock: "На складе такого нет.",
    outside_ground: "Сюда нельзя: это за краем огорода.",
    tile_taken: "Сюда нельзя: место занято.",
    bed_planted: "На грядке уже растёт репка.",
    bed_empty: "Грядка пустая.",
    turnip_ripe: "Репка уже созрела.",
    not_ripe: "Репка ещё не созрела.",
    not_rotatable: "Поворачивать можно только забор.",
    unknown_thing: "Такой вещи в огороде нет.",
  } satisfies Record<Reason, string>,
  harvest: {
    title: "Урожай",
    total: (n: number) => `Собрано: ${count(n, turnipForms)}`,
    row: (type: Quality, n: number) => `${turnipQualities[type]} ×${n}`,
    latest: (day: string) => `последняя ${dayWords(day)}`,
    empty: "Здесь будут собранные репки",
  },
  empty: {
    line: "Семечки покупают за опыт, а опыт дают за решённые задания.",
    pick: "Выбрать семечко",
  },
  firstSeed: "Посадить первое семечко",
  toTasks: "К заданиям",
  chooser: {
    title: "Семечки за опыт",
    close: "Закрыть",
    balance: (n: number) => `Свободно: ${amount(n)} опыта`,
    name: seedTitles,
    /** A row's button: «Купить за 25 опыта». */
    action: (n: number) => `Купить за ${n} опыта`,
    /** What a seed takes to grow, under its name. */
    takes: (n: number) => `растёт за ${n} опыта`,
    /** Said, and described on the row's button, when a seed costs more than there is. */
    short: (n: number) => `Не хватает ${n} опыта`,
    buy: "Купить",
    cancel: "Отмена",
    bedsFull: "Свободных грядок нет — семечко подождёт.",
    bought: (type: Quality, left: number) => `Куплено ${seedQualities[type]} семечко, осталось ${amount(left)} опыта`,
  },
  weather: { sunny: "Солнечно", rain: "Дождь" },
  zoom: {
    label: "Вид огорода",
    in: "Приблизить",
    out: "Отдалить",
    all: "Показать всё",
    pan: "Сдвинуть огород",
    left: "Сдвинуть влево",
    right: "Сдвинуть вправо",
    up: "Сдвинуть вверх",
    down: "Сдвинуть вниз",
  },
};
