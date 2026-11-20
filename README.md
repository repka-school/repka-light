# Репка: practice site

A static practice site: an index page that says what the site is, a list of
courses, a course page with its lessons, lessons worked through one task
at a time, and a homestead where the experience earned grows turnips. It runs
entirely in the browser. There is no server and no sign-in; a learner's
profile, task results, experience, level and homestead are kept in that
browser's `localStorage` and nowhere else.

## Run it

Node 22 or later.

```sh
npm install
npm run dev        # builds the content, then serves the site with reload
npm test           # unit tests
make test-e2e      # local browser tests (see below)
npm run build      # content, typecheck and the production build in dist/
npm run preview    # serves dist/
```

### Browser tests

`make test-e2e` builds the site and goes through it in a real browser with
[Playwright](https://playwright.dev): on a desktop, on a phone, and on the
same phone in WebKit, Safari's engine. The first run needs the browsers:
`npx playwright install chromium webkit`.

The tests (`e2e/`) run on the published courses and name no task: they read
the built course files, as the page does, and take the right answers from
there, so editing a course does not break them. They cover a lesson from its
first card to the summary, the two tries, a reload in the middle, the course
list and the level, the profile, the reset and the backup file, every screen
opened by its own address, and an accessibility check by axe. The homestead
has no browser tests yet.

The site under test is built for a sub-path (`/repka-light/`) and served the
way GitHub Pages serves it: plain files, and `404.html` for any other address
(`e2e/site.mjs`). The build, the traces and the report go to `.e2e/`, which is
not committed. A failed test leaves a screenshot and a trace there:
`npx playwright show-report .e2e/report`.

## Layout

| Path | What it holds |
|---|---|
| `courses/` | Course content, as packs (see below). |
| `scripts/build-content.mjs` | Turns the packs into `public/content/` (generated, not committed). |
| `src/screens/` | The six screens: index page, course list, course, lesson (question and summary), profile, homestead. |
| `src/lesson/` | The rules of a lesson run: two tries per task, progress, the summary. No DOM. |
| `src/store/` | What is saved in `localStorage`, the hook the screens read it with, and the rules of experience and levels. |
| `src/homestead/` | The homestead: its rules and saved form (no DOM), the isometric scene, its panels, drawings, animals, styles and words. It is loaded when the page is first opened. |
| `src/content/` | Types of the built course files and their loader. |
| `src/ui/` | Shared pieces: design tokens, answer tiles, task text, avatars and frames. |
| `src/strings.ts` | Every user-visible string but the homestead's, which are in `src/homestead/strings.ts`. The interface is in Russian. |
| `e2e/` | The browser tests, and the script that builds and serves the site for them. |
| `docs/style-guide.md` | Type scale, colours, components and how the copy is written. |

Routes are plain paths (`/course/math-olympiad-2`) under the path the site is
served from. A static host has no file for most of them, so the build also
writes `404.html`, a copy of the page: GitHub Pages serves it for any address
it does not know, and the app shows the right screen.

| Route | Screen |
|---|---|
| `/` | The index page: what the site is, a button into the courses, sample tasks. |
| `/courses` | The course list. |
| `/course/<course>` | A course and its lessons. |
| `/course/<course>/lesson/<lesson>` | A lesson. |
| `/profile` | The profile. |
| `/homestead` | The homestead. |

The index page's main button leads back into the unfinished course practised
last, into the only course when nothing is started, and otherwise to the
course list. Its sample tasks are written for the page (`samples` in
`src/strings.ts`) and are in no course.

## Content

`courses/bundle.yaml` lists the packs to publish. A pack is a directory:

```
courses/packs/<pack>/
  pack.yaml                 # id and title
  courses/<course>.yaml     # title, description, cover, modules → lessons → task ids
  tasks/<group>/<task>.yaml # one theory card or one question per file
  images/                   # pictures the course and its tasks name
```

The `sources` list in `courses/bundle.yaml` provides the textbook citations
on course pages. Add future adaptations under the same book's `courses` map
with the corresponding section links.

A question has `single` or `multi` choice options, one or more marked
`correct`, and optionally a hint and a worked solution. `answer.hide: true`
keeps options hidden until the learner asks for them when the tiles carry
the full answers. Repka's `answer.options[].label` keeps a written label with
its option ID when the options are reordered.

To format an answer, keep its plain text in `answer.options[].text` and
write the formatted answer lines in `question.html`, starting each with a
bold label such as `<strong>А)</strong>`. The build moves a complete run of
labelled options into the answer tiles and preserves its HTML and MathML.
For a single image showing all options, use `answer.picture.file` and
omit each option's `text`. The image appears in the question and the
learner selects by label.

The build accepts Repka courses with modules, top-level lessons, or a flat
`tasks` list. A flat list becomes one lesson. A member such as
`other-pack:group:task` resolves to a question in another pack listed in
the bundle. Draft, voided, and retired tasks are skipped.

A theory card (`kind: theory`) opens a lesson. Its title is `learning.title`.
It shows plain text or markup from `question`, a list of `blocks`, or both.
Blocks make a card a young learner will read: short lines with a drawing each,
and something to try.

```yaml
kind: theory
status: active
learning:
  title: Читай как сыщик
blocks:
  - kind: says            # the guide says it, in a speech bubble
    text: В задачах прячутся ловушки.
  - kind: steps           # numbered steps, each with a drawing
    items:
      - picture: reread
        title: Прочитай два раза
        text: Представь, что происходит.
  - kind: facts           # the same rows without numbers: rules, not an order
    title: Каждый герой — рыцарь или лжец
    items:
      - picture: shield
        title: Рыцарь
        text: Всегда говорит правду.
  - kind: tiles           # things side by side
    title: Что поможет
    items:
      - picture: pencil
        title: Рисуй
  - kind: image           # a picture of the pack, opened full-size on a click
    file: images/sets-regions.png
  - kind: try             # a riddle; the answer opens on a button
    title: Разминка       # optional, «Попробуй» when absent
    text: У листа бумаги 4 угла. Один уголок отрезали. Сколько углов стало?
    answer: 5 углов!
    picture: corner       # optional, shown with the answer
  - kind: tip             # one line with a drawing
    picture: cup
    text: Хочется отдохнуть? Сделай перерыв.
```

Block text is plain. The `title` of `steps`, `facts` and `tiles` and the
`text` of their items are optional. A `picture` is the name of one of the
drawings in `src/ui/pictures/TheoryPicture.tsx` (`book`, `magnifier`, `check`,
`pencil`, `scales`, `clock`, …). A new drawing is added there and to
`THEORY_PICTURES` in the content build; a test keeps the two lists equal.

The build writes only what a lesson shows: task text, options, the right
answer, hint and solution. Other fields of a task file are not published. It
fails on a missing task or picture, a question without a right answer, a
theory block it does not know or one that names an unknown drawing, and
MathML outside Repka's presentation subset. Questions, theory, hints,
solutions and formatted answer lines can use native MathML. The build
keeps Repka's HTML tags, including `div`, `span`, `u`, `s`, `hr` and
`tfoot`, and filters out unsupported markup and attributes.

An inline `<img>` can reference a pack file or the `original_url` of a
listed image. The build keeps it in place, appends any other listed images
and serves them from the local pack.

Answers are checked in the browser, so the right answers are in the published
files.

## Saved data

One key, `repka-light.v1`:

```json
{
  "version": 1,
  "profile": { "name": "Маша", "avatar": "kitten", "frame": "stars" },
  "results": {
    "math-olympiad-2/reading/sweets": { "outcome": "first", "choices": [3], "at": "2026-01-01T10:00:00.000Z" }
  },
  "runs": {
    "math-olympiad-2/read-carefully": {
      "cards": ["math-olympiad-2/reading/read-twice", "math-olympiad-2/reading/sweets"],
      "index": 1,
      "phase": "solving",
      "entries": [
        { "first": null, "final": null, "seen": true, "opened": false },
        { "first": [1], "final": null, "seen": false, "opened": false }
      ]
    }
  },
  "xp": { "math-olympiad-2/reading/sweets": 10 },
  "homestead": {
    "spent": 215,
    "seeds": { "rare": 1 },
    "things": [["house", 1, 1], ["fence", 0, 0], ["fence", 4, 3, 1], ["bed", 2, 5], ["bed", 3, 5, "rare", 40], ["bed", 4, 5, "common", 100, "2026-01-02"]],
    "harvest": { "common": [2, "2026-01-01"] }
  }
}
```

`results` is what progress counts. `outcome` is how a task ended: `first`
(right on the first try), `second` (right on the second) or `wrong`. A better
outcome replaces a worse one and never the reverse, so a task once solved on
the first try stays solved. Progress bars count every answered task, with the
`first` ones drawn darker; a lesson or course is finished when every task is
`first`. A course with any result is listed as started.

`runs` is the latest pass through each lesson, saved at every step, so a
reload shows the lesson exactly as it was left: wrong answers, a pending
second try and the summary included. A pass is dropped if the lesson's cards
or options have changed since. Opening a lesson always brings its pass back:
an unfinished one where it was left, a finished one as its summary. From the
summary, «Решить ошибки заново» starts a pass that keeps the tasks solved on
the first try and asks the rest again; «Повторить урок» starts from scratch.

`xp` is the experience each task has given; see below.

`homestead` is the homestead in a short form; see below. It is absent until
something in the homestead is changed.

«Сбросить прогресс» on the profile page clears `results` and `runs` and keeps
the profile, `xp` and `homestead`.

«Скачать файл» on the profile page saves the profile, `results`, `runs`,
`xp` and `homestead` as a backup file, and «Загрузить файл» replaces everything
saved with one, after asking. The file has its own version, apart from the
key's:

```json
{ "format": "repka-light-backup", "version": 3, "exportedAt": "…", "profile": {}, "results": {}, "runs": {}, "xp": {}, "homestead": {} }
```

A change to its shape bumps `BACKUP_VERSION` in `src/store/backup.ts` and adds
a step to `upgrades` there, so every file ever written still loads. A file
from a newer version is refused. Version 1 had no `xp`, version 2 no
`homestead`.

## Experience and levels

Every task gives experience, once: 10 for each of its points (a task's points
are its difficulty, 1 to 5; a task without points counts as 1) when it is
solved on the first try, half of that on the second try, nothing when missed.
A task's card shows that amount as a tag, «+20 опыта», coloured by the
difficulty; points themselves are not shown.
A task solved better later gets the rest, so each task gives its full amount
at most. `xp` keeps what each task has given; the total is their sum. It never
goes down: a reset keeps it, and a task solved again after a reset gives
nothing more. Results saved before experience was counted earn theirs when
their course is next opened.

The level is read off the total. Level 2 takes 100 experience, about one
lesson, and each next level takes 2 more than the one before, so early levels
come a little faster. Level 100 starts at 19 602; from there every level takes
the same 298, and there is no top level. The numbers are in `src/store/xp.ts`,
sized by the first course: its first lesson brings level 2, its 35 lessons
(3 720 experience) level 30, and level 100 takes about five courses of that
size.

The header shows the level in a ring that fills toward the next one and opens
the details. A checked answer shows the experience it added, and a lesson's
summary shows the pass's total and a new level reached in it. Experience that
arrives while the badge is on screen animates it: the ring fills and the
amount shows under it, and a new level is named there.

## Homestead

«Мой огород» is where experience is spent. It is a 10×10 ground seen from
above at an angle, with a fixed set of things to arrange: a house, a barn, ten
fences, two trees, three bushes and four beds, one of which starts in stock.
A thing is moved, a fence turned, and anything but a planted bed put back in
stock; no two things share a tile.

Experience buys seeds and grows turnips. What can be spent is the *free*
experience: the total earned less what the homestead has spent. Spending never
lowers the total, so a level never goes down.

| Seed | Price | Experience to ripen |
|---|---|---|
| Common | 25 | 100 |
| Rare | 50 | 200 |
| Epic | 100 | 300 |
| Legendary | 200 | 400 |

Everyone starts with one free common seed. A seed is planted in an empty bed
and grows only by the experience given to it, 10 or 50 at a press, never more
than is free and never more than it still needs. It passes ten stages, each
with its own drawing, and is ripe at its total. A ripe turnip is gathered into
the harvest, which frees the bed. A common turnip costs 125 in all, about one
lesson; a legendary one 600; the first course pays for some thirty common
turnips or six legendary ones. A purchase is confirmed with a second tap,
because experience cannot be earned twice.

The numbers are in `src/homestead/rules.ts`: `SEEDS`, `OWNED`, `GROW_STEPS`.

What is saved is only what cannot be worked out again (`src/homestead/saved.ts`):

- `spent`: the experience spent on seeds and on growing.
- `seeds`: the seeds held, by quality.
- `things`: what stands on the ground, each as `[kind, x, y]`, followed by `1`
  for a turned fence or by a bed's turnip: its quality, the experience given
  to it and, once ripe, the day it ripened. Whatever is owned and not listed
  is in stock.
- `harvest`: by quality, how many turnips were gathered and the latest day one
  of them ripened.

Stock, stages and prices are not saved. A saved thing that cannot stand where
it is saved (off the ground, on a taken tile, one more than is owned) is left
out when the data is read, which puts it back in stock.

The scene is one grid for a keyboard and a screen reader: arrow keys move over
the tiles, Enter selects or uses the tool in hand, Escape cancels, and every
tile is named by its place and what stands on it. A drag pans and the wheel
or a pinch zooms; buttons over the scene and the `+`, `−` and `0` keys do the
same, and the ground cannot be dragged out of sight. The selected thing is
moved by dragging it, or with «Передвинуть» on its card; `R` turns a fence.

The ground is drawn as a slab of earth under a sky, lit from the left: every
thing casts a shadow, free tiles carry tufts, flowers and pebbles, and a ripe
turnip has an arrow over it. A cat and a dog wander the free tiles and bees
hover over the bushes and trees (`src/homestead/pets.ts`, `Critters.tsx`).
They only decorate: they are not saved, take no tap and keep still for a
reader who asked for less motion.

## Deploy

`.github/workflows/pages.yml` runs the unit tests, builds the site and publishes
`dist/` to GitHub Pages on every push to `main`. Run the browser tests locally
with `make test-e2e`. In the repository settings, set Pages' source to
"GitHub Actions".

The build has to know the path the site is served from, because page and
picture addresses start with it. It reads `BASE_PATH` (`/` when unset); the
workflow takes the value from the Pages settings. To try a build made for a
sub-path locally: `BASE_PATH=/repka-light npm run build && npm run preview`.

The published build carries the Google Tag Manager and Cloudflare Web
Analytics scripts; their ids are at the top of `vite.config.ts`. They are
added only when `ANALYTICS=1` is set for the build, which the workflow does,
so `npm run dev` and a plain `npm run build` have none. Google Analytics tags
are configured inside Google Tag Manager.

## Licence

- **Code** — everything outside `courses/`: [MIT](LICENSE).
- **Course content** — tasks, hints, solutions, theory and illustrations in
  `courses/` and their built copy in `public/content/`:
  [CC BY-NC-SA 4.0](courses/LICENSE.md). The course credits identify the
  contributors and the source of the graph theory adaptation.
- **Bundled libraries** keep their own licences. The build writes them, with
  their full texts, to `third-party-licenses.txt` next to the page.

The site's footer links both licences.
