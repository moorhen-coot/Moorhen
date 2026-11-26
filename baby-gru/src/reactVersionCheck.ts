// React is an optional peer dependency with a wide range so that consumers who only use
// the web component are never blocked at install time. The React library itself needs
// React >= 19 (the React Compiler output imports react/compiler-runtime), so fail early
// with a clear message instead of an obscure module-resolution error.
// This module must be imported first in moorhen.ts so it runs before any compiled component.
import { version } from "react";

const MIN_REACT_MAJOR = 19;

if (parseInt(version, 10) < MIN_REACT_MAJOR) {
    throw new Error(
        `moorhen/react-lib requires React >= ${MIN_REACT_MAJOR}.2 (found ${version}). ` +
            `Upgrade react and react-dom, or use the moorhen/web-component entry, which bundles its own React.`
    );
}
