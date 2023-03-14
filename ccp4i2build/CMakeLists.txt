project(ccp4i2moorhen)
cmake_minimum_required(VERSION 3.13)

file(COPY 
    ../baby-gru/public 
    ../baby-gru/package.json
    ../baby-gru/package-lock.json
    ../baby-gru/.babelrc 
    ../baby-gru/webpack.config.js
    ../baby-gru/App.css
DESTINATION ./)

file(COPY 
    ../baby-gru/src/components
    ../baby-gru/src/__test__
    ../baby-gru/src/utils
    ../baby-gru/src/WebGLgComponents
    ../baby-gru/App.css
DESTINATION ./src)