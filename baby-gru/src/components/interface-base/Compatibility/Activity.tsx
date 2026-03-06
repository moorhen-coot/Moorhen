import React from "react";

export const ActivityCompat: React.FC<{ mode: string; children: React.ReactNode }> =
    (React as any).Activity ??
    (({ mode, children }: { mode: string; children: React.ReactNode }) => (
        <div style={{ display: mode === "visible" ? "flex" : "none", flex: 1, minWidth: 0, overflow: "hidden" }}>{children}</div>
    ));
