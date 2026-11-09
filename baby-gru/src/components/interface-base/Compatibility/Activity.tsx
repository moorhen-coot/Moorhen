import React from "react";

type ActivityProps = { mode: string; children: React.ReactNode };

/**
 * React's <Activity> (stable in 19.2, `unstable_Activity` in some canaries)
 * renders no DOM of its own. Frameworks that vendor an older React (e.g. the
 * Next.js app router) get the fallback below, which must behave the same way:
 * when visible it uses `display: contents` (no box, children lay out as if they
 * were direct children of the parent) rather than a flex row. A flex-row
 * wrapper turns a block child such as the sequence viewer into a flex item that
 * cannot shrink below its content width, which breaks its horizontal scrolling.
 */
export const ActivityCompat: React.FC<ActivityProps> =
    (React as any).Activity ??
    (React as any).unstable_Activity ??
    (({ mode, children }: ActivityProps) => (
        <div style={{ display: mode === "visible" ? "contents" : "none" }}>{children}</div>
    ));
