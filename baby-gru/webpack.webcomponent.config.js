const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config.js");
const { paths } = require("./webpack.base.config.js");

const path = require("path");
const { defineReactCompilerLoaderOption, reactCompilerLoader } = require("react-compiler-webpack");

module.exports = (env, argv) => {
    return merge(baseConfig(env, argv), {
        entry: path.join(paths.src, "WebComponent", "entry.ts"),
        target: "web",
        output: {
            filename: "moorhen.js",
        },
        module: {
            rules: [
                {
                    test: /\.tsx$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "ts-loader",
                            options: {
                                transpileOnly: true, // Skip type checking for faster builds with React Compiler
                            },
                        },
                        {
                            loader: reactCompilerLoader,
                            options: defineReactCompilerLoaderOption(),
                        },
                    ],
                },
                {
                    test: /\.jsx$/,
                    exclude: /node_modules/,
                    use: [
                        "babel-loader",
                        {
                            loader: reactCompilerLoader,
                            options: defineReactCompilerLoaderOption({}),
                        },
                    ],
                },
            ],
        },
    });
};
