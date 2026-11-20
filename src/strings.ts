// Every user-visible string. The interface is in Russian.
import { count } from "@/ui/i18n/plural";
import { STEADY_LEVEL } from "@/store/xp";

const taskForms = ["задание", "задания", "заданий"] as const;
const taskOfForms = ["задания", "заданий", "заданий"] as const;
const theoryForms = ["теория", "теории", "теорий"] as const;
const lessonForms = ["урок", "урока", "уроков"] as const;
const lessonOfForms = ["урока", "уроков", "уроков"] as const;
const courseForms = ["курс", "курса", "курсов"] as const;

const amount = (n: number) => n.toLocaleString("ru-RU");

/** «2 класс», «2–4 класс», or nothing when no grade is named. */
const gradesLine = (grades: string[]) => (grades.length === 0 ? "" : grades.length === 1 ? `${grades[0]} класс` : `${grades[0]}–${grades[grades.length - 1]} класс`);

export const t = {
  brand: "репка",
  brandLabel: "Репка — на главную",
  brandNote: "Растём с каждой задачей",
  footerNote: "Прогресс и профиль хранятся только в этом браузере.",
  footerContent: "Задания и иллюстрации",
  footerCode: "код",
  loading: "Загружаем…",
  loadError: "Не удалось загрузить страницу.",
  retry: "Попробовать снова",
  notFound: "Такой страницы нет.",
  toCatalog: "Ко всем курсам",
  close: "Закрыть",

  navCourses: "Курсы",
  navHomestead: "Огород",

  // The index page. Its words address no one, so a parent and a child read them alike.
  landingEyebrow: "ШКОЛЬНЫЕ И ОЛИМПИАДНЫЕ ЗАДАЧИ · БЕЗ РЕГИСТРАЦИИ",
  // A no-break space keeps the dash on the line of «Репка», as Russian typesetting wants.
  landingTitle: "Репка\u00A0— тренажёр для школьников",
  landingLead: "Курсы со школьными и олимпиадными задачами. Уроки короткие, ответ проверяется сразу, а после ошибки есть подсказка и вторая попытка.",
  landingStart: "Начать заниматься",
  landingContinue: "Продолжить",
  landingAll: "Все курсы",
  landingCurrent: (title: string) => `Начатый курс: «${title}»`,
  landingNote: "Начать можно сразу. Результаты сохраняются в этом браузере.",
  /** What there is to practise: «3 курса · 48 заданий · 6 уроков · 2–4 класс»; a single course is not counted. */
  landingReach: (courses: number, tasks: number, lessons: number, grades: string[]): string =>
    [courses > 1 ? count(courses, courseForms) : "", tasks ? count(tasks, taskForms) : "", count(lessons, lessonForms), gradesLine(grades)].filter(Boolean).join(" · "),
  landingGardenTitle: "От семечка до репки",
  landingGardenText: "В своём огороде можно посадить семечко и вырастить репку. Для роста нужен опыт, а его дают за решённые задачи.",
  landingGardenOpen: "Открыть огород",
  landingStepsTitle: "Как проходит урок",
  landingSteps: [
    { title: "Короткие уроки", text: "В уроке — короткое объяснение и несколько заданий на одну тему." },
    { title: "Две попытки", text: "Ответ проверяется сразу. После ошибки появляется подсказка, и можно ответить ещё раз." },
    { title: "Разбор решений", text: "В конце урока видно, какие задания получились, и к каждому можно открыть решение." },
    { title: "Прогресс сохраняется", text: "Результаты хранятся в этом браузере. После урока ошибки можно решить заново — остальное останется решённым." },
  ],
  // The sample tasks beside it.
  samplesCaption: "Пример задания",
  samplesTrack: "Примеры заданий",
  samplesRole: "карусель",
  sampleRole: "пример",
  samplesPause: "Остановить примеры",
  samplesPlay: "Листать примеры",
  samplesDots: "Выбор примера",
  sampleLetters: ["А", "Б", "В", "Г", "Д"] as const,

  catalogTitle: "Все курсы",
  catalogIntro: "Выбери курс и решай задачи урок за уроком. Прогресс сохраняется сам.",
  openCourse: "Открыть курс",
  continueCourse: "Продолжить",
  startedCourses: "Начатые курсы",
  otherCourses: "Другие курсы",
  courseFinished: "Пройден",
  tasks: (n: number) => count(n, taskForms),
  lessonsCount: (n: number) => count(n, lessonForms),
  grades: gradesLine,
  progressLabel: (title: string) => `Прогресс по курсу «${title}»`,
  /** Answered tasks of all, and how many of them went right on the first try when that is not all of them. */
  progressLine: (answered: number, total: number, first: number) => `${answered} из ${count(total, taskOfForms)}${first < answered ? ` · ${first} с первого раза` : ""}`,

  courseEyebrow: "КУРС",
  courseSource: "Источник курса",
  courseEdition: (edition: number, year: number) => `${edition}-е издание, ${year}`,
  courseAdaptation: "Русская адаптация Repka по лицензии",
  courseNextNew: "С чего начать",
  courseNextStarted: "Твой прогресс",
  courseNextDone: "Курс пройден!",
  lessonCounts: (theory: number, questions: number) => (theory ? `${count(theory, theoryForms)}, ${count(questions, taskForms)}` : count(questions, taskForms)),
  lessonProgress: (done: number, total: number) => `${done} из ${total}`,
  lessonFinished: "Пройден",
  startLesson: "Начать урок",
  continueLesson: "Продолжить",
  repeatLesson: "Повторить",

  drill: {
    title: "Игра на время",
    next: "К игре",
    start: "Начать игру",
    replay: "Играть ещё",
    instructions: (rounds: number, seconds: number) => `${count(rounds, taskForms)} за игру. На ответ — ${seconds} секунд. В конце игры получишь 1 XP за каждый верный ответ.`,
    controls: "Выбери один из трёх ответов или нажми 1, 2 или 3.",
    time: (seconds: number) => `${seconds} с`,
    remaining: "Время на ответ",
    correct: "Верно!",
    wrong: (answer: number) => `Верный ответ — ${answer}.`,
    result: "Результат игры",
    score: (correct: number, rounds: number) => `Верных ответов — ${correct} из ${rounds}`,
    xp: (score: number) => `+${score} XP`,
    lessonMeta: "Таблица и игра на время",
    best: (score: number, rounds: number) => `Лучший результат — ${score} из ${rounds}`,
    progress: (played: number, total: number, perfect: number) => `${played} из ${count(total, lessonOfForms)} сыграно · ${perfect} без ошибок`,
    saved: (total: number) => `Уроков с результатом игры — ${total}.`,
  },

  backToCourse: "К курсу",
  theory: "Теория",
  theoryRule: "Правило",
  theoryWarning: "Предупреждение",
  theoryNext: "Дальше",
  theoryTry: "Попробуй",
  theoryShowAnswer: "Показать ответ",
  theoryHideAnswer: "Скрыть ответ",
  question: (n: number) => `Задание ${n}`,
  cardPosition: (n: number, total: number) => `Карточка ${n} из ${total}`,
  cardsDone: (n: number, total: number) => `Пройдено ${n} из ${total}`,
  cardsDoneShort: (n: number) => `Пройдено ${n}`,
  navigation: "Задания урока",
  questionJump: "Номера заданий",
  choose: "Выбери ответ",
  chooseAll: "Выбери все верные ответы",
  sameSet: "Такой ответ уже был. Измени выбор.",
  revealOptions: "Показать варианты",
  submit: "Проверить ответ",
  submitAgain: "Проверить ещё раз",
  next: "Следующее задание",
  results: "Посмотреть результат",
  tryAgain: "Попробуй ещё раз.",
  hint: "Подсказка",
  solution: "Разбор решения",
  noExplanation: "У этого задания пока нет объяснения.",
  correct: "Верно! Отличный шаг вперёд.",
  incorrect: "Неверно. Разберёмся вместе.",
  right: "Верно",
  rightSecond: "Верно со второй попытки",
  incorrectStatus: "Неверно",
  waitingStatus: "Ещё одна попытка",
  unanswered: "Без ответа",
  choiceMine: "твой ответ",
  choiceRight: "верно",
  choiceWrong: "неверно",
  yourAnswer: (l: string) => `Твой ответ: ${l}`,
  yourAnswers: (first: string, second: string) => `Твои ответы: ${first}, затем ${second}`,
  correctAnswer: (l: string) => `Правильный ответ: ${l}`,
  labelSet: (...labels: string[]) => (labels.length < 2 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} и ${labels[labels.length - 1]}`),
  optionsLabel: "Варианты ответа",

  lessonDone: "Урок пройден",
  lessonDoneText: "Вот что получилось в заданиях урока. Разбери ошибки — так они запомнятся.",
  lessonPerfect: "Отлично!",
  lessonPerfectText: "Все задания урока решены с первой попытки.",
  score: (n: number, total: number) => `${n} из ${total}`,
  scoreLabel: "с первой попытки",
  legendFirst: "С первой попытки",
  legendSecond: "Со второй попытки",
  legendWrong: "Не получилось",
  secondShort: "Со второй",
  review: "Разберём задания",
  reviewHint: "Открой задание, чтобы увидеть ответ и решение.",
  nextLesson: "Следующий урок",
  againLesson: "Повторить урок",
  retryMistakes: "Решить ошибки заново",

  // Experience and levels: the header's badge and what a lesson adds.
  level: (n: number) => `Уровень ${n}`,
  levelLabel: (n: number) => `Уровень ${n}, твой опыт`,
  xpAmount: (n: number) => `${amount(n)} опыта`,
  xpGain: (n: number) => `+${amount(n)} опыта`,
  levelProgressLabel: "Опыт до следующего уровня",
  levelProgress: (earned: number, needed: number) => `${amount(earned)} из ${amount(needed)}`,
  levelRemaining: (n: number) => `До следующего уровня\u00A0— ${amount(n)} опыта.`,
  levelHow: "Как растёт уровень?",
  levelRules: [
    "На каждом задании написано, сколько опыта оно даёт: чем сложнее задание, тем больше.",
    "Верный ответ с первой попытки приносит весь опыт, со второй\u00A0— половину.",
    "Задание с ошибкой можно решить заново и получить остальной опыт. За повтор решённого задания опыт не добавляется.",
    "В игре на время каждый верный ответ даёт 1 XP, в том числе в повторных играх.",
    `Первые уровни идут быстрее: каждый следующий требует чуть больше опыта. После ${STEADY_LEVEL}-го уровня все уровни требуют одинаково.`,
    "Опыт можно тратить в огороде: на семечки и на рост репок. Уровень от этого не уменьшается.",
    "Опыт хранится в этом браузере и остаётся после сброса прогресса.",
  ],
  /** In the level's panel: the experience left to spend, and the way to where it is spent. */
  xpFree: (n: number) => `Свободно для огорода: ${amount(n)} опыта`,
  toHomestead: "В огород",
  levelNew: (n: number) => `Новый уровень: ${n}`,
  lessonXp: (n: number) => `За урок: +${amount(n)} опыта`,

  profileEyebrow: "ПРОФИЛЬ",
  profileTitle: "Мой профиль",
  profileLabel: (name: string) => `${name}, профиль`,
  guest: "Гость",
  nickname: "Никнейм",
  nicknameHint: "Придуманное имя, до 32 символов. Его видно в шапке сайта.",
  pictureLegend: "Картинка",
  frameLegend: "Рамка",
  progressHeading: "Прогресс",
  solvedTotal: (n: number) => (n === 0 ? "Пока нет решённых заданий." : `Сохранено результатов: ${n}.`),
  resetProgress: "Сбросить прогресс",
  resetTitle: "Сбросить весь прогресс?",
  resetText: "Результаты всех заданий и игр будут удалены из этого браузера. Профиль, опыт, уровень и огород останутся.",
  resetConfirm: "Сбросить",
  resetCancel: "Отмена",
  resetDone: "Прогресс сброшен.",
  backupText: "Перенеси прогресс, профиль и огород в другой браузер или на другое устройство.",
  backupExport: "Скачать файл",
  backupImport: "Загрузить файл",
  backupDone: "Файл с прогрессом скачан.",
  importTitle: "Заменить сохранённое?",
  importText: (name: string, n: number, date: string) =>
    `В файле${date ? ` от ${date}` : ""}: профиль «${name}», результатов: ${n}. Всё, что сохранено в этом браузере сейчас, вместе с огородом, заменится данными из файла.`,
  importConfirm: "Заменить",
  importDone: "Прогресс и профиль загружены из файла.",
  importErrors: {
    notJson: "Этот файл не удалось прочитать. Выбери файл, скачанный на этой странице.",
    notBackup: "Это не файл с прогрессом. Выбери файл, скачанный на этой странице.",
    tooNew: "Файл сделан в более новой версии сайта. Обнови страницу и попробуй ещё раз.",
    tooLarge: "Файл слишком большой для файла с прогрессом.",
  },

  illustration: "Иллюстрация",
  illustrationLarger: "Крупнее",
  illustrationWhole: "Целиком",
  zoom: "Открыть",
  brokenIllustration: "Иллюстрация не загрузилась.",
  table: "Таблица",
  formula: "Формула",
};

export const avatarNames: Record<string, string> = {
  "girl-braids": "Девочка с косичками",
  "girl-puffs": "Девочка с кудрявыми пучками",
  "girl-bob": "Девочка с каре",
  "girl-ponytail": "Девочка с хвостиком",
  "boy-side": "Мальчик с чёлкой набок",
  "boy-curls": "Мальчик с кудрями",
  "boy-glasses": "Мальчик в очках",
  "boy-cap": "Мальчик в кепке",
  "woman-bun": "Женщина с пучком",
  "woman-long": "Женщина с длинными волосами",
  "man-beard": "Мужчина с бородой",
  "man-glasses": "Мужчина в очках",
  kitten: "Котёнок",
  puppy: "Щенок",
  "fox-cub": "Лисёнок",
  hedgehog: "Ёжик",
  bunny: "Зайчонок",
  "bear-cub": "Медвежонок",
  owlet: "Совёнок",
  panda: "Панда",
  raccoon: "Енотик",
  frog: "Лягушонок",
  penguin: "Пингвинёнок",
  squirrel: "Бельчонок",
};

export const frameNames: Record<string, string> = {
  none: "Без рамки",
  forest: "Лесная",
  sea: "Морская",
  sun: "Солнечная",
  berry: "Ягодная",
  stars: "Звёздная",
};

export const silhouetteName = "Пока без картинки";

export const illustrationDialogLabels = { title: t.illustration, close: t.close, larger: t.illustrationLarger, whole: t.illustrationWhole, broken: t.brokenIllustration };
export const bodyLabels = { zoomLabel: t.zoom, brokenLabel: t.brokenIllustration, formulaLabel: t.formula, tableLabel: t.table };

/** One sample task of the index page, shown already answered. It is written for the page and is in no course. */
export type Sample = {
  /** The theme, shown above the card; it also names the card for a screen reader. */
  theme: string;
  /** The name of the card's dot. */
  dot: string;
  number: number;
  points: number;
  statement: string;
  /** The five options, А to Д. */
  options: [string, string, string, string, string];
  /** The right letter, one of `sampleLetters`. */
  right: string;
  verdict: string;
};

export const samples: Sample[] = [
  {
    theme: "Читаем условие внимательно",
    dot: "Пример: читаем условие внимательно",
    number: 3,
    points: 1,
    statement: "У Маши три кошки. У каждой кошки по четыре котёнка. Сколько всего хвостов у кошек и котят?",
    options: ["7", "12", "15", "16", "4"],
    right: "В",
    verdict: "Верно! 3 кошки и 12 котят — 15 хвостов.",
  },
  {
    theme: "Перебираем варианты",
    dot: "Пример: перебираем варианты",
    number: 5,
    points: 2,
    statement: "У Пети три карандаша: красный, синий и зелёный. Он берёт с собой два. Сколько разных пар карандашей он может выбрать?",
    options: ["6", "5", "4", "3", "2"],
    right: "Г",
    verdict: "Верно! Пары такие: красный и синий, красный и зелёный, синий и зелёный.",
  },
  {
    theme: "Рассуждаем по шагам",
    dot: "Пример: рассуждаем по шагам",
    number: 8,
    points: 2,
    statement: "Гусеница ползёт от земли вверх по столбу высотой 5 метров. За день она поднимается на 3 метра, а за ночь сползает на 2 метра. На какой день гусеница доберётся до верха?",
    options: ["на 2-й", "на 3-й", "на 4-й", "на 5-й", "на 6-й"],
    right: "Б",
    verdict: "Верно! К утру третьего дня гусеница на высоте 2 метра, а за день поднимается ещё на 3.",
  },
];

/** A sample tile's name for a screen reader: its letter and option, and «верно» on the right one. */
export const sampleChoiceName = (letter: string, option: string, right: boolean) => `${letter}: ${option}${right ? ", верно" : ""}`;
