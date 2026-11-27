// React is an optional peer dependency with a range that includes React 18 so that consumers
// who only use the web component are never blocked at install time. The React library itself
// needs React >= 19: components take `ref` as a plain prop, and the React Compiler output
// imports react/compiler-runtime.
// An app that bundles the library with React 18 usually fails earlier, at build time, with
// "Can't resolve 'react/compiler-runtime'", because the bundler resolves that import before
// any code runs. This check catches the cases that get past the build, where React 18 would
// otherwise drop `ref` props with only a console warning.
// This module must be imported first in moorhen.ts so it runs before any compiled component.
import { version } from "react";

const MIN_REACT_MAJOR = 19;

if (parseInt(version, 10) < MIN_REACT_MAJOR) {
    throw new Error(
        `moorhen/react-lib requires React >= ${MIN_REACT_MAJOR} (found ${version}). ` +
            `Upgrade react and react-dom, or use the moorhen/web-component entry, which bundles its own React.`
    );
}
