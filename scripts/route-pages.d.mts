/** The addresses of a built site, without the leading slash. */
export function routesOf(contentDir: string): string[];
/** Writes a copy of the built page for every address of the site in `outDir`; returns the addresses. */
export function writeRoutePages(outDir: string): string[];
