const path = require("path");
const { paths } = require("./webpack.base.config.js");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config.js");

module.exports = (env, argv) => {
    return merge(baseConfig(env, argv), {
        entry: path.join(paths.src, "moorhen.ts"),
        target: "web",
        optimization: {
            minimize: argv.mode === "production",
        },
        cache: false,
        output: {
            filename: "moorhen-react-lib.js",
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
                                transpileOnly: true,
                            },
                        },
                        // {
                        //     loader: reactCompilerLoader,
                        //     options: defineReactCompilerLoaderOption(),
                        // },
                    ],
                },
                {
                    test: /\.jsx$/,
                    exclude: /node_modules/,
                    use: [
                        "babel-loader",
                        // {
                        //     loader: reactCompilerLoader,
                        //     options: defineReactCompilerLoaderOption({}),
                        // },
                    ],
                },
            ],
        },
        externals: [
            function ({ request }, callback) {
                if (/^react(-dom|-redux)?(\/.*)?$/.test(request) || /^@reduxjs\/toolkit(\/.*)?$/.test(request)) {
                    return callback(null, "commonjs " + request);
                }
                callback();
            },
        ],
    });
};
