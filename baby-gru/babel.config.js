module.exports = {
    plugins: [
    'babel-plugin-react-compiler', // must run first!
  ],
  presets: [
    "@babel/preset-env",
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript"
  ]
};
