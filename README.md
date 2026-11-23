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
list and the level, the profile, the reset and the backup file, the homestead,
every screen opened by its own address, and an accessibility check by axe.

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
| `src/homestead/` | The homestead game. |
| `src/content/` | Types of the built course files and their loader. |
| `src/ui/` | Shared pieces: design tokens, answer tiles, task text, avatars and frames. |
| `src/strings.ts` | Every user-visible string but the homestead's, which are in `src/homestead/strings.ts`. The interface is in Russian. |
| `e2e/` | The browser tests, and the script that builds and serves the site for them. |
| `docs/style-guide.md` | Type scale, colours, components and how the copy is written. |

Routes are plain paths under the path the site is
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
the full answers. `answer.options[].label` keeps a written label with
its option ID when the options are reordered.

To format an answer, keep its plain text in `answer.options[].text` and
write the formatted answer lines in `question.html`, starting each with a
bold label such as `<strong>А)</strong>`. The build moves a complete run of
labelled options into the answer tiles and preserves its HTML and MathML.
For a single image showing all options, use `answer.picture.file` and
omit each option's `text`. The image appears in the question and the
learner selects by label.

The build accepts courses with modules, top-level lessons, or a flat
`tasks` list. A flat list becomes one lesson. A member such as
`other-pack:group:task` resolves to a question in another pack listed in
the bundle. Draft, voided, and retired tasks are skipped.

A timed lesson uses `drill` in place of `tasks`. The build generates the
theory table and game questions from the same pool. The supported drill
settings are defined in [the drill builder](scripts/drill-content.mjs).
Use `intro` for a plain-text introduction or `intro.html` for one with MathML.
A course can use a built-in illustration as its cover with `cover.picture`.

Each game draws ten questions. A correct answer given before the deadline
advances the game within two seconds. A wrong answer shows the right one
until the deadline, and for at least two seconds. If time runs out before the
learner answers, the question stays open. A late answer receives feedback and
earns zero points.

A theory card (`kind: theory`) uses `learning.title` for its heading.
It can contain text or markup in `question`, structured `blocks`, or both.

| Block | Content |
|---|---|
| `says` | The guide's message in `text`. |
| `steps`, `facts`, `tiles` | An optional `title` and a list of `items`. Each item has a `picture`, a `title`, and optional `text`. |
| `image` | A pack image referenced by `file`, with optional `alt` text. |
| `try` | A prompt in `text` and a revealable `answer`, with an optional `title` and `picture`. |
| `tip` | A short line of `text` with a `picture`. |

Block text is plain. A `picture` names a built-in drawing. Register new
drawings in `src/ui/pictures/TheoryPicture.tsx` and in the content build's
`THEORY_PICTURES` list. A test checks that the lists match.

The build writes only what a lesson shows: task text, options, the right
answer, hint and solution. Other fields of a task file are not published. It
fails on a missing task or picture, a question without a right answer, a
theory block it does not know or one that names an unknown drawing,
MathML outside the supported presentation subset, and a task that still has
an editorial `note` field: the packs are public as they are, so a note is
removed before its task is added. Questions, theory, hints,
solutions and formatted answer lines can use native MathML. The build
keeps the HTML tags a task may use, including `div`, `span`, `u`, `s`, `hr` and
`tfoot`, and filters out unsupported markup and attributes.

An inline `<img>` can reference a pack file or the `original_url` of a
listed image. The build keeps it in place, appends any other listed images
and serves them from the local pack.

Answers are checked in the browser, so the right answers are in the published
files.

## Saved data

The browser stores progress under the `localStorage` key `repka-light.v1`.
Within that record, each course has its own task results, lesson runs, drill
records and XP. The storage format is defined in [storage.ts](src/store/storage.ts).

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

`drills` stores the best score in each timed game. Scoring 10 out of 10
marks the lesson as finished. A timed game starts over if its page is reloaded.
`bestAnswerTimeTenths` stores the total answer time of the game that holds
that score: a higher score brings its own time, an equal score keeps the
lower one, and a lower score changes nothing, however fast it was. Each card
contributes the time from its start to the learner's first answer, including
time spent answering after the countdown. The game rounds the sum to the
nearest tenth of a second. A time saved before this rule stays until a game
equals or beats its score.

`drillDays` stores, for each timed game, the last calendar day it gave
experience and the best score of that day; see below.

`xp` is the experience each task or timed game has given; see below.

`homestead` stores the garden once the learner makes a change.

«Сбросить прогресс» on the profile page clears `results`, `runs`, `drills` and `bestAnswerTimeTenths` and keeps
the profile, `xp`, `drillDays` and `homestead`.

«Скачать файл» on the profile page saves the profile, `results`, `runs`,
`drills`, `bestAnswerTimeTenths`, `drillDays`, `xp` and `homestead` as a backup file, and «Загрузить файл» replaces everything
saved with one, after asking. The file has its own version, apart from the
key's:

```json
{ "format": "repka-light-backup", "version": 8, "exportedAt": "…", "profile": {}, "courses": {}, "homestead": {} }
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

A finished timed game adds 1 XP for each correct answer. Each game gives at
most 10 XP per calendar day: a replay on the same day adds only what it
scores above the day's best, and the next day the game gives its score
again. A reset does not bring the day's experience back.

Total XP determines the level. Level 2 takes 100 XP. Each subsequent level
takes 2 XP more than the previous one until level 100, after which each
level takes 298 XP. The thresholds are defined in [xp.ts](src/store/xp.ts).

The header shows the level in a ring that fills toward the next one and opens
the details. A checked answer shows the experience it added, and a lesson's
summary shows the pass's total and a new level reached in it. Experience that
arrives while the badge is on screen animates it: the ring fills and the
amount shows under it, and a new level is named there.

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
are configured inside Google Tag Manager. A build with the scripts also says
so in the footer of every page (`footerAnalytics` in `src/strings.ts`); keep
that line true when a service is added or removed.

## Licence

- **Code** — everything outside `courses/`: [MIT](LICENSE).
- **Course content** — tasks, hints, solutions, theory and illustrations in
  `courses/` and their built copy in `public/content/`:
  [CC BY-NC-SA 4.0](courses/LICENSE.md). The course credits identify the
  contributors and the sources of adapted material.
- **Bundled libraries** keep their own licences. The build writes them, with
  their full texts, to `third-party-licenses.txt` next to the page.

The site's footer links both licences.
