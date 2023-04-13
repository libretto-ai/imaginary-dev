//@ts-check

"use strict";

const path = require("path");
const webpack = require("webpack");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "web", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "development",
  entry: {
    // Make an entry for each panel
    "function-panel": "./src-views/function-panel/index.tsx",
    "input-panel": "./src-views/input-panel/index.tsx",
  },
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist", "vsc-extension/src/views"),
    filename: "[name].js",
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".tsx", ".js"],
    fallback: {
      http: require.resolve("stream-http"),
      url: require.resolve("url/"),
    },
  },
  stats: "minimal",

  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false,
      },
    },
    runtimeChunk: false,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      PROMPTJS_MODEL: null,
      PROMPTJS_MAXTOKENS: null,
      PROMPTJS_TEMPERATURE: null,
      PROMPT_PROJECT_KEY: null,
      PROMPTJS_LOGGING_ENABLED: true,
      OPENAI_API_KEY: null,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.react.json",
              compiler: "ttypescript",
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          "style-loader",
          { loader: "css-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192,
            },
          },
        ],
      },
    ],
  },
  // devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  // cannot use eval-based sourcemaps because CSP disallows eval
  devtool: "cheap-source-map",
};
module.exports = [extensionConfig];
