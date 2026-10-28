/**
 * Which build this is: "development" (the Vite dev server), "production", or whatever mode Vite
 * was given. For the renderer report (rendererReport.ts), which loads this only when it runs:
 * Jest's Babel transform cannot read import.meta, and instanceApi is loaded by the instance.
 */
export const buildMode: string = import.meta.env?.MODE ?? "unknown";
