# Style guide

How the site looks and how its copy is written. The tokens live in
`src/ui/theme.css`; the screens' styles are in `src/app.css`. When a page needs
something this guide does not cover, add it here in the same change.

## Type

One system font stack (`ui-sans-serif, -apple-system, …`), set in `theme.css`.

### Scale

Every `font-size` is a token. There are no raw sizes in the stylesheets, with
two exceptions, both drawings rather than text: the `.brand` wordmark and the
`→` arrow in primary buttons.

| Token | Size | For |
|---|---|---|
| `--type-xs` | 12px | Meta lines, tags, captions, the footer, eyebrows |
| `--type-label` | 13px | Form labels and legends, chips |
| `--type-sm` | 14px | Secondary text, buttons, list rows |
| `--type-base` | 16px | Body text |
| `--type-lg` | 18px | Task markup by default (`.rich-body`): a plain theory card, a task in the lesson review |
| `--type-xl` | 22px | — (used through the roles below) |
| `--type-2xl` | 28px | — (used through the roles below) |
| `--type-3xl` | 36px | Reserved |

Tailwind's `text-xs`, `text-sm` and `text-lg` in `src/ui/components/ui/` give
the same 12, 14 and 18px.

### Roles

Headings and leads use a role, not a size. A role says what the text is, so
the same kind of heading is the same size on every page.

| Role | Size | Where |
|---|---|---|
| `--type-page-title` | 32–44px, fluid | The one `h1` of every page: index, course list, course, lesson summary, profile, «Такой страницы нет» |
| `--type-task-title` | 28px, 22px on a phone | A theory card's title on the lesson screen |
| `--type-task-text` | 20px, 18px on a phone | The text of the task being solved, in `--foreground`. It is the largest thing on its card: «Задание N» above it is the `h1`, drawn as an eyebrow |
| `--type-section-title` | 22px | An `h2` that heads a section: a module, «Разберём задания», «Прогресс», «Как проходит урок»; also a course's title on its card in the course list |
| `--type-card-title` | 18px | The title inside a card or row: a lesson, a step of «Как проходит урок», the feedback's verdict, the lesson's name above a task, a step or a block's heading in a theory card |
| `--type-lead` | 18px, 16px on a phone | The paragraph under a page title |
| `--type-stat` | 28px | A number that is the point of a block: «3 из 8» in the score ring |

Phone sizes switch at 700px, in `theme.css`, not in each rule.

### Weight, spacing, line height

- Weights are 400 (text), 500 (quiet emphasis: chips, snippets), 600
  (headings, titles, buttons) and 700 (eyebrows, numbers, step marks). No
  550, 650 or 750; the wordmark is the one exception.
- Headings are tracked tighter: `h1` −0.03em, `h2` −0.02em, set once in
  `app.css`. Do not override it per heading. The one exception is «Задание N»
  on the lesson screen, which is an eyebrow.
- Eyebrows (`.eyebrow`) are 12px, 700, uppercase or as written, tracked
  +0.13em.
- Body paragraphs have a line height of 1.65, leads 1.75, task text 1.8.

## Colour

The palette is a warm off-white page with a deep green brand. Use the tokens;
never write a hex value in `app.css`.

| Token | For |
|---|---|
| `--background`, `--card` | The page; anything raised from it |
| `--foreground`, `--card-foreground` | Text |
| `--muted-foreground` | Secondary text: leads, meta, hints |
| `--primary` | Links, the filled button, the active step, a started course's border |
| `--accent` | Soft green panels: «Твой прогресс», a perfect lesson's result |
| `--accent-warm` | Focus outlines, warm highlights in cover backgrounds |
| `--muted` | Chips and quiet fills |
| `--warm-soft` | The riddle panel of a theory card; its heading is `--note-text` |
| `--border` | Card and row borders |

### Results

A task ends in one of three ways, and each has its own colour family. Use the
same family wherever that result shows: the score ring, the legend, the review
list, the task numbers and the progress bars.

| Result | Mark | Strong | Soft fill | Text on fill |
|---|---|---|---|---|
| Right on the first try | ✓ | `--success` | `--success-soft` | `--success-text` |
| Right on the second | 2 | `--second-mark` | `--second-soft` | `--second-text` |
| Wrong on both | ✗ | `--danger` | `--danger-soft` | `--danger-text` |

Progress bars and rings draw answered tasks in a light green and first-try
solves over them in `--progress-fill`.

Timed games use `--progress-fill` for the countdown. Each answer button
shows its number key above the answer. After a choice, the same result
colours mark the correct answer and any wrong choice, with a written verdict.

### Difficulty

A task's difficulty, 1 to 5, colours its experience tag: `--difficulty-N` is
the fill and `--difficulty-N-text` the text on it. The scale runs blue, violet,
magenta as soft fills, then magenta and plum as solid ones. It keeps clear of
the result colours, so a hard task never looks like a wrong answer. The amount
on the tag says the same as the colour.

## Components

- **Cards** have a 1px `--border`, a 14–22px radius (bigger for bigger cards)
  and a soft two-layer shadow from `--shadow-card`. A card that leads
  somewhere is one big target: its title link's `::after` covers it, and it
  lifts 1–2px on hover.
- **Chips** (`.catalog-card-item`) are `--type-label` on `--muted`, fully
  rounded, with a 15px icon in `--primary`.
- **Buttons**: one filled (`primary`) per view, for the next step; the rest are
  outlined (`secondary`). Text is a verb: «Начать урок», «Продолжить»,
  «Решить ошибки заново».
- **The level badge** in the header is the level's number in a 44px ring that
  fills in `--progress-fill` toward the next level. It opens a panel with the
  experience and how it is earned. Experience just earned is written as
  «+20 опыта», in weight 700 and the colour of the text around it.
- **Experience in motion**: when experience arrives, the ring fills from where
  it stood, the badge swells once and the amount shows under it in a small
  bubble for a moment. A new level sends a ripple in `--accent-warm` from the
  badge, refills the ring from empty and names the level in a `--primary`
  bubble for about three seconds. The amount under a checked answer and a new
  level on the lesson's summary pop in. The bubbles only decorate: the lesson's
  live region says the same. With reduced motion the bubbles show without
  moving and nothing else animates.
- **The experience tag** on a task's card says what the task gives, «+20
  опыта», and its fill says how hard the task is (see Difficulty).
- **Covers** are 192px squares. Never draw one larger than 192px; give it room
  with a tinted panel or blob behind it instead.

## Theory cards

A theory card is the first thing a lesson shows, often to a seven-year-old. It
is built from blocks (see the README), not from a page of text.

- **Title**: the card's own, as the `h1`, under a small «ТЕОРИЯ» label. Make it
  a hook («Читай как сыщик»), not the lesson's title again: that one is already
  in view.
- **The guide** is the owlet, 64px (52px on a phone), with what it says in an
  `--accent` bubble. One to three short sentences.
- **Steps** are rows on `--tile` with a 64px drawing, a number on its corner,
  a title and one line. Two columns from 860px, one below. Keep to four or
  fewer. Use them for things done in order.
- **Facts** are the same rows without numbers, for rules and definitions.
- **Tiles** sit side by side and wrap, a drawing over a few words: tools and
  choices, five at most.
- **A picture of the pack** is shown whole and opens full-size, like one in a
  task.
- **A riddle** sits on a `--warm-soft` panel. Its answer stays closed until
  «Показать ответ» and opens on `--card` under the button.
- **Tips** are a 48px drawing and one line, with no frame.
- **Drawings** are flat inline SVG on a tinted rounded square, in the avatars'
  manner, and only decorate: the words beside them say the same.
- **Words**: a title of two or three, a line of one sentence. No past-tense
  verbs about the learner («нашёл», «устал»): they pick a gender.
- Blocks arrive one after another and the guide hops once; with reduced motion
  everything is simply there.

## Copy

The interface is in Russian, and all of it is in `src/strings.ts`.

- **Address the learner as «ты»**: «Выбери ответ», «Твой прогресс», «Обнови
  страницу». The index page may speak impersonally («Начать можно сразу»), but
  never «вы».
- **Say it once.** A screen does not repeat what is already in view: no
  section labels over obvious groups, no captions that restate the picture.
- **Course-neutral.** Site-wide text is true of every course; a course's own
  words belong in its pack.
- **Typography:**
  - Dash: an em dash with spaces, and a no-break space before it, so it never
    starts a line: `Репка — тренажёр` (`&nbsp;—` in HTML).
  - Quotes: «ёлочки»; „лапки“ inside them.
  - Always write ё: «ещё», «решённых».
  - Numbers and their nouns agree through `count()` in `strings.ts`: «1
    урок», «2 урока», «5 уроков».
  - Ranges and scores: «3 из 8».
  - Lists in a line are joined with « · ».

## Homestead

The homestead is a drawn scene, so it has a palette of its own: the
`--homestead-*` tokens for the sky, the ground and its slab of earth,
buildings, trees, fences, beds and animals, and `--turnip-<quality>-*` for a
turnip of each quality. Its styles are in `src/homestead/homestead.css`, which
loads with the page.

- **Light** comes from the left. A face turned to the light takes the lighter
  of a pair of tokens (`--homestead-wall`), the one turned away the darker
  (`--homestead-wall-side`). Soft light and shade are laid over a face with
  `--homestead-lit` and `--homestead-dim`, never with a new colour. Every
  thing casts a shadow to the right, all of them drawn as one sheet in
  `--homestead-shadow`.
- **Motion** is small and slow: smoke, a swaying crown, drifting clouds, the
  animals, a thing settling where it is put, the view gliding after a button
  or a key. All of it stops under `prefers-reduced-motion`, and nothing that
  moves by itself carries information.

- **Quality** is never told by colour alone: a rare turnip or seed carries a
  diamond on a tag, an epic one a star, a legendary one a crown, a common one
  nothing.
- **Marks on the ground** reuse the result colours: a tile a thing fits on, or
  a bed the tool in hand can be used on, is `--success-soft` with a diagonal
  hatch; a tile it does not fit on is `--danger-soft` with a cross hatch and an
  outline over the drawings. The selected thing and a bed to act on are ringed
  along their own outline, and the selected thing's tiles are tinted with
  `--primary`. A thing being moved is faint where it stood.
- **Growth** is a strip in `--homestead-strip`, a warm colour that stands off
  the grass: a small one over a growing turnip, and two on its card, toward the
  next stage and toward ripeness. A ripe turnip has an `--accent-warm` arrow
  over it.
- **The buttons over the scene** are one strip (closer, farther, the whole
  ground) and one pad of arrows, on a translucent `--card`. The pad shows only
  while part of the scene is out of view.
- **The panels** (what is held, the tool's line, a thing's card, the seed
  chooser, the tray, the harvest) are cards on `--card` with a 1px `--border`.
  Their text is `--type-sm`; a card's title is `--type-card-title`. Every
  button is at least 44px high.
- **A tool in the tray** is pressed (`--selected`) while it is in hand, and
  dashed on `--muted` when there is none of it left; it stays focusable then.
- **Copy** speaks of «опыт» and «свободный опыт», never of money. Prices read
  «Купить за 25 опыта»; the growing buttons read «Растить +10».
