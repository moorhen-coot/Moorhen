const { paths } = require("./webpack.base.config.js");
const path = require("path");
const { merge } = require("webpack-merge");
const reactConfig = require("./webpack.react.config.js");

// moorhen/web-component/react: React wrappers of the web component's UI elements, and hooks.
// Built on the react-lib config, so React stays external: it runs on the app's own React.
module.exports = (env, argv) => {
    return merge(reactConfig(env, argv), {
        entry: path.join(paths.src, "WebComponent", "react", "entry.ts"),
        target: "web",
        cache: false,
        output: {
            filename: "MoorhenWebComponentReact.js",
        },
    });
};
