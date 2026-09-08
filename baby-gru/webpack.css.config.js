const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { paths } = require("./webpack.base.config.js");

module.exports = (_env, _argv) => {
    return {
        mode: "development",
        entry: path.join(paths.src, "moorhen.ts"),
        target: "web",
        cache: {
            type: "filesystem",
            buildDependencies: {
                config: [__filename],
            },
        },
        output: {
            path: paths.dist,
            filename: "__ignore__/moorhen-css-build.js",
            publicPath: "./",
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: "public/MoorhenAssets/moorhen.css",
                chunkFilename: "public/MoorhenAssets/[id].css",
                ignoreOrder: false,
            }),
        ],
        optimization: {
            minimize: false,
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
                {
                    test: /\.jsx?$/,
                    exclude: [/node_modules/, path.resolve(paths.src, "index.js"), paths.public],
                    use: "babel-loader",
                },
                {
                    test: /\.svg$/,
                    use: [
                        {
                            loader: "@svgr/webpack",
                            options: {
                                exportType: "default",
                                dimensions: false,
                                svgoConfig: {
                                    plugins: [
                                        {
                                            name: "preset-default",
                                            params: {
                                                overrides: {
                                                    removeViewBox: false,
                                                    cleanupIds: false,
                                                },
                                            },
                                        },
                                        "removeDimensions",
                                        "removeComments",
                                        "removeMetadata",
                                        "removeUselessDefs",
                                    ],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(?:ico|gif|png|jpg|jpeg|xpm)$/,
                    type: "asset/resource",
                },
                {
                    test: /\.css$/,
                    sideEffects: true,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
                {
                    test: /\.s[ac]ss$/,
                    sideEffects: true,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        {
                            loader: "sass-loader",
                            options: {
                                api: "modern",
                            },
                        },
                    ],
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
        stats: "errors-warnings",
    };
};