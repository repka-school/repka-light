import { useCallback, useEffect, useState } from "react";
import { lessonsOf } from "./types";
import { isCourse, isIndex, isLesson, isProgram } from "./validate";

export class ContentNotFound extends Error {}

// Deduplicate concurrent loads and keep successful responses for the visit.
const cache = new Map<string, Promise<unknown>>();

function load<T extends object>(file: string, check: (data: unknown) => data is T, expectedSlug?: string): Promise<T> {
  let pending = cache.get(file);
  if (!pending) {
    // The host lets a browser keep a file for ten minutes. "no-cache" asks it
    // each time whether the file changed, so a new deploy's courses show at once.
    pending = fetch(`${import.meta.env.BASE_URL}content/${file}`, { cache: "no-cache", headers: { Accept: "application/json" } }).then(async (response) => {
      if (response.status === 404) throw new ContentNotFound(file);
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      const data: unknown = await response.json();
      if (!check(data) || (expectedSlug !== undefined && (!("slug" in data) || data.slug !== expectedSlug))) {
        throw new Error(`Invalid content in ${file}`);
      }
      return data;
    });
    // A failed load is not kept, so «Попробовать снова» fetches again.
    pending.catch(() => cache.delete(file));
    cache.set(file, pending);
  }
  return pending as Promise<T>;
}

function slugPart(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) throw new ContentNotFound(slug);
  return slug;
}

export const loadIndex = () => load("index.json", isIndex);
export const loadCourse = async (slug: string) => load(`courses/${slugPart(slug)}.json`, isCourse, slug);
export const loadProgram = async (slug: string) => load(`programs/${slugPart(slug)}.json`, isProgram, slug);
export async function loadCourseLesson(courseSlug: string, lessonSlug: string) {
  const lessonFile = `lessons/${slugPart(courseSlug)}/${slugPart(lessonSlug)}.json`;
  const [outline, payload] = await Promise.allSettled([loadCourse(courseSlug), load(lessonFile, isLesson, lessonSlug)]);
  if (outline.status === "rejected") throw outline.reason;
  if (!lessonsOf(outline.value).some((item) => item.slug === lessonSlug)) throw new ContentNotFound(lessonFile);
  // The outline lists this address. A missing payload is a publication error the learner can retry.
  if (payload.status === "rejected") {
    if (payload.reason instanceof ContentNotFound) throw new Error(`Missing lesson file ${lessonFile}`);
    throw payload.reason;
  }
  return { course: outline.value, lesson: payload.value };
}

export type Loaded<T> = { data?: T; error?: Error; loading: boolean; retry: () => void };

/** Runs `fetcher` when `key` changes; `retry` runs it again after a failure. */
export function useLoaded<T>(key: string, fetcher: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: Error }>({ key });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    fetcher().then(
      (data) => live && setState({ key, data }),
      (error: Error) => live && setState({ key, error }),
    );
    return () => {
      live = false;
    };
    // The fetcher is named by its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const retry = useCallback(() => {
    setState({ key });
    setAttempt((n) => n + 1);
  }, [key]);
  const current = state.key === key ? state : { key };
  return { data: current.data, error: current.error, loading: !current.data && !current.error, retry };
}
