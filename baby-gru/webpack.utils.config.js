const { paths } = require("./webpack.base.config.js");
const path = require("path");
const { merge } = require("webpack-merge");
const reactConfig = require("./webpack.react.config.js");

module.exports = (env, argv) => {
    return merge(reactConfig(env, argv), {
        entry: path.join(paths.src, "WebComponent", "utils", "entry.ts"),
        target: "web",
        cache: false,
        output: {
            filename: "MoorhenWebComponentUtils.js",
        },
    });
};
