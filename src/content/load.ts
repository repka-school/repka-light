import { useCallback, useEffect, useState } from "react";
import type { Course, CourseIndex } from "./types";

// The built course files, fetched once each and kept for the visit.
const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string): Promise<T> {
  let pending = cache.get(file);
  if (!pending) {
    // The host lets a browser keep a file for ten minutes. "no-cache" asks it
    // each time whether the file changed, so a new deploy's courses show at once.
    pending = fetch(`${import.meta.env.BASE_URL}content/${file}`, { cache: "no-cache" }).then((response) => {
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return response.json();
    });
    // A failed load is not kept, so «Попробовать снова» fetches again.
    pending.catch(() => cache.delete(file));
    cache.set(file, pending);
  }
  return pending as Promise<T>;
}

export const loadIndex = () => load<CourseIndex>("index.json");
export const loadCourse = (slug: string) => load<Course>(`${encodeURIComponent(slug)}.json`);

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
