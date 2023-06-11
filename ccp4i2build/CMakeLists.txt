project(ccp4i2moorhen)
cmake_minimum_required(VERSION 3.13)

file(COPY 
    ../baby-gru/public 
    ../baby-gru/package-lock.json
    ../baby-gru/.babelrc 
    ../baby-gru/forge.config.js
    ../baby-gru/nodemon.json
    ../baby-gru/webpack.config.js
    ../baby-gru/tsconfig.json
DESTINATION ./)

file(COPY 
    ../baby-gru/src/components
    ../baby-gru/src/__tests__
    ../baby-gru/src/utils
    ../baby-gru/src/icons
    ../baby-gru/src/types
    ../baby-gru/src/WebGLgComponents
    ../baby-gru/src/App.css
    ../baby-gru/src/ErrorBoundary.tsx
    ../baby-gru/src/index.css
    ../baby-gru/src/index.tsx
    ../baby-gru/src/logo.svg
    ../baby-gru/src/reportWebVitals.js
    ../baby-gru/src/setupProxy.js
    ../baby-gru/src/setupTests.js
DESTINATION ./src)