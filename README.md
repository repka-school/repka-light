# Репка: practice site

A static practice site: an index page that says what the site is, a list of
courses, a course page with its lessons, and lessons worked through one task
at a time. It runs entirely in the
browser. There is no server and no sign-in; a learner's profile and task
results are kept in that browser's `localStorage` and nowhere else.

## Run it

Node 22 or later.

```sh
npm install
npm run dev        # builds the content, then serves the site with reload
npm test           # unit tests
npm run build      # content, typecheck and the production build in dist/
npm run preview    # serves dist/
```

## Layout

| Path | What it holds |
|---|---|
| `courses/` | Course content, as packs (see below). |
| `scripts/build-content.mjs` | Turns the packs into `public/content/` (generated, not committed). |
| `src/screens/` | The five screens: index page, course list, course, lesson (question and summary), profile. |
| `src/lesson/` | The rules of a lesson run: two tries per task, progress, the summary. No DOM. |
| `src/store/` | What is saved in `localStorage`, and the hook the screens read it with. |
| `src/content/` | Types of the built course files and their loader. |
| `src/ui/` | Shared pieces: design tokens, answer tiles, task text, avatars and frames. |
| `src/strings.ts` | Every user-visible string. The interface is in Russian. |
| `docs/style-guide.md` | Type scale, colours, components and how the copy is written. |

Routes are plain paths (`/course/olympiad-2`) under the path the site is
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

A question has `single` or `multi` choice options, one or more marked
`correct`, and optionally a hint and a worked solution. `answer.hide: true`
keeps the options hidden until the learner asks for them.

The build writes only what a lesson shows: task text, options, the right
answer, hint and solution. Other fields of a task file are not published. It
fails on a missing task or picture, a question without a right answer, and
markup outside a small allowed set of tags.

Answers are checked in the browser, so the right answers are in the published
files.

## Saved data

One key, `repka-light.v1`:

```json
{
  "version": 1,
  "profile": { "name": "Маша", "avatar": "kitten", "frame": "stars" },
  "results": {
    "olympiad-2/reading/sweets": { "outcome": "first", "choices": [3], "at": "2026-01-01T10:00:00.000Z" }
  },
  "runs": {
    "olympiad-2/read-carefully": {
      "cards": ["olympiad-2/reading/read-twice", "olympiad-2/reading/sweets"],
      "index": 1,
      "phase": "solving",
      "entries": [
        { "first": null, "final": null, "seen": true, "opened": false },
        { "first": [1], "final": null, "seen": false, "opened": false }
      ]
    }
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

«Сбросить прогресс» on the profile page clears `results` and `runs` and keeps
the profile.

«Скачать файл» on the profile page saves the profile, `results` and `runs` as
a backup file, and «Загрузить файл» replaces everything saved with one, after
asking. The file has its own version, apart from the key's:

```json
{ "format": "repka-light-backup", "version": 1, "exportedAt": "…", "profile": {}, "results": {}, "runs": {} }
```

A change to its shape bumps `BACKUP_VERSION` in `src/store/backup.ts` and adds
a step to `upgrades` there, so every file ever written still loads. A file
from a newer version is refused.

## Deploy

`.github/workflows/pages.yml` tests, builds and publishes `dist/` to GitHub
Pages on every push to `main`. In the repository settings, set Pages' source
to "GitHub Actions".

The build has to know the path the site is served from, because page and
picture addresses start with it. It reads `BASE_PATH` (`/` when unset); the
workflow takes the value from the Pages settings. To try a build made for a
sub-path locally: `BASE_PATH=/repka-light npm run build && npm run preview`.

The published build carries the Google Tag Manager and Cloudflare Web
Analytics scripts; their ids are at the top of `vite.config.ts`. They are
added only when `ANALYTICS=1` is set for the build, which the workflow does,
so `npm run dev` and a plain `npm run build` have none. Google Analytics tags
are configured inside Google Tag Manager.
