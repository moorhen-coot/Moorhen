/**
 * Which build this is: "development" (the Vite dev server), "production", or whatever mode Vite
 * was given. For the renderer report, whose facts (instanceApi's reportFacts) load this only when
 * they are gathered: Jest's Babel transform cannot read import.meta, and instanceApi is loaded by
 * the instance. Typed by hand, as the tests' tsconfig does not have Vite's types.
 */
export const buildMode: string = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ?? "unknown";
