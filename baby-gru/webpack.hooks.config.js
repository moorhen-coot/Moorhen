const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const paths = {
    src: path.resolve(__dirname, "src"),
    dist: path.resolve(__dirname, "dist"),
};

module.exports = (env, argv) => {
    return {
        plugins: [
            new webpack.DefinePlugin({
                process: { env: {} },
            }),
        ],
        entry: path.join(paths.src, "hooks-entry.ts"),
        target: "web",
        externals: {
            react: {
                root: "React",
                commonjs2: "react",
                commonjs: "react",
                amd: "react",
            },
            "react-dom": {
                root: "ReactDOM",
                commonjs2: "react-dom",
                commonjs: "react-dom",
                amd: "react-dom",
            },
        },
        optimization: {
            minimize: argv.mode === "production",
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            pure_funcs: argv.mode === "production" ? ["console.log"] : [],
                            drop_console: argv.mode === "production",
                        },
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
            ],
        },
        cache: false,
        output: {
            clean: false,
            filename: "moorhen-hooks.js",
            path: paths.dist,
            publicPath: "./",
            library: "moorhenHooks",
            libraryTarget: "umd",
            umdNamedDefine: true,
            globalObject: "this",
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true,
                        },
                    },
                },
            ],
        },
        resolve: {
            fallback: {
                fs: false,
            },
            extensions: [".ts", ".tsx", ".js", ".jsx"],
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },
    };
};
