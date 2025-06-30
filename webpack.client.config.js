const path = require("path");
const fs = require("fs");

const webpack = require("webpack");
const { merge } = require("webpack-merge");
const AssetsPlugin = require("assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserWebpackPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { ESBuildMinifyPlugin } = require("esbuild-loader");

require("intersection-observer");

const { createComponentName } = require("./src/universal/utils/helper.js");
const packageJson = require(path.resolve(process.cwd(), "package.json"));

const isBuildingForCDN = process.argv.includes("--for-cdn");
const env = process.env.PIRAMITE_ENV || "local";

const piramiteConfig = require("./piramite.config");
const appConfigFilePath = `${piramiteConfig.appConfigFile.entry}/${env}.conf.js`;
const appConfig = require(appConfigFilePath);
const commonConfig = require("./webpack.common.config");
const postCssConfig = require("./postcss.config");
const babelConfig = require("./babel.server.config");

const piramiteClientConfigPath = piramiteConfig.webpackConfiguration.client;
const piramiteClientConfig = piramiteClientConfigPath
  ? require(piramiteConfig.webpackConfiguration.client)
  : "";

const normalizeUrl = require("./lib/os.js");
const replaceString = require("./config/string.js");

const fragmentManifest = require(piramiteConfig.routing.dictionary);

const isDebug = piramiteConfig.dev;
const reScript = /\.(js|jsx|mjs)$/;
const distFolderPath = piramiteConfig.distFolder;
const prometheusFile = piramiteConfig.monitoring.prometheus;

const chunks = {};

chunks.client = [
  path.resolve(__dirname, "src/client/client.js")
];

for (const index in fragmentManifest) {
  if (!fragmentManifest[index]) {
    continue;
  }

  const fragment = fragmentManifest[index];
  const fragmentUrl = fragment.path;
  const name = createComponentName(fragment.routePath);

  chunks[name] = [fragmentUrl];
}

const GO_PIPELINE_LABEL = process.env.GO_PIPELINE_LABEL || packageJson.version;
const appConfigFileTarget = `${piramiteConfig.appConfigFile.output.path}/${piramiteConfig.appConfigFile.output.name}.js`;

fs.copyFileSync(appConfigFilePath, appConfigFileTarget);

if (isDebug) {
  const appConfigJSONContent = require(appConfigFileTarget);

  for (const service in appConfigJSONContent.services) {
    appConfigJSONContent.services[service].clientUrl =
      appConfigJSONContent.services[service].serverUrl;
  }

  const moduleExportsText = "module.exports";
  const appConfigFileContent = fs.readFileSync(appConfigFileTarget).toString();
  const moduleExportsIndex = appConfigFileContent.indexOf(moduleExportsText);

  let context = appConfigFileContent.substr(0, moduleExportsIndex + moduleExportsText.length);
  context += "=";
  context += JSON.stringify(appConfigJSONContent);
  context += ";";

  fs.writeFileSync(appConfigFileTarget, context);

  chunks.client.unshift(
    "regenerator-runtime/runtime.js",
    "core-js/stable",
    "intersection-observer"
  );
  chunks.client.push("webpack-hot-middleware/client");
}

const outputPath = piramiteConfig.output.client.path;

const clientConfig = merge(commonConfig, piramiteClientConfig, {
  name: "client",

  target: "web",

  mode: isDebug ? "development" : "production",

  entry: chunks,

  output: {
    path: outputPath,
    publicPath: `${appConfig.mediaUrl}/project/assets/`,
    filename: piramiteConfig.output.client.filename,
    chunkFilename: piramiteConfig.output.client.chunkFilename,
    chunkLoadingGlobal: `WP_${piramiteConfig.prefix.toUpperCase()}_VLTRN`
  },

  module: {
    rules: [
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
        issuer: { not: [/\.[jt]sx?$/] },
      },
      {
        test: reScript,
        loader: "esbuild-loader",
        include: [path.resolve(__dirname, "src"), piramiteConfig.inputFolder],
        options: {
          loader: "jsx",
          target: "es2015",
          ...(isDebug ? { jsxDev: true } : {})
        }
      },
      {
        test: /\.js$/,
        loader: "string-replace-loader",
        options: {
          multiple: [...replaceString()]
        }
      },
      {
        test: /\.css$/,
        use: [
          isDebug
            ? {
              loader: "style-loader",
              options: {
                injectType: "singletonStyleTag"
              }
            }
            : MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: false,
              importLoaders: 1,
              sourceMap: isDebug
            }
          },
          {
            loader: "postcss-loader",
            options: postCssConfig
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          isDebug
            ? {
              loader: "style-loader",
              options: {
                injectType: "singletonStyleTag"
              }
            }
            : MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: appConfig.isCssClassNameObfuscationEnabled
                  ? `${piramiteConfig.prefix}-[name]-[hash:base64]`
                  : `${piramiteConfig.prefix}-[path][name]__[local]`,
                localIdentHashSalt: packageJson.name
              },
              importLoaders: 2,
              sourceMap: isDebug
            }
          },
          {
            loader: "postcss-loader",
            options: postCssConfig
          },
          {
            loader: "sass-loader",
            options: {
              implementation: require("sass"),
              sassOptions: {
                outputStyle: "compressed"
              }
            }
          },
          ...(piramiteConfig.sassResources
            ? [
              {
                loader: "sass-resources-loader",
                options: {
                  sourceMap: false,
                  resources: piramiteConfig.sassResources
                }
              }
            ]
            : [])
        ]
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/i,
        exclude: /\.svg$/,
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        exclude: /\.svg$/,
      },
    ]
  },

  optimization: {
    // emitOnErrors: false,
    minimizer: [
      new ESBuildMinifyPlugin({
        target: "es2015",
        css: true
      }),
      new TerserWebpackPlugin({
        terserOptions: {
          mangle: {
            safari10: true
          }
        }
      }),
      new CssMinimizerPlugin({})
    ]
  },

  resolve: {
    alias: {
      "react": path.resolve(process.cwd(), "node_modules/react"),
      "react-dom": path.resolve(process.cwd(), "node_modules/react-dom")
    }
  },

  plugins: [
    ...(isBuildingForCDN
      ? []
      : [
        new CleanWebpackPlugin({
          verbose: false,
          dangerouslyAllowCleanPatternsOutsideProject: true
        })
      ]),

    new webpack.DefinePlugin({
      "process.env": {},
      "process.env.BROWSER": true,
      __DEV__: isDebug,
      GO_PIPELINE_LABEL: JSON.stringify(GO_PIPELINE_LABEL)
    }),

    new CopyWebpackPlugin([
      {
        from: piramiteConfig.output.client.publicPath,
        to: piramiteConfig.publicDistFolder
      }
    ]),

    ...(isDebug
      ? [new webpack.HotModuleReplacementPlugin()]
      : [
        new MiniCssExtractPlugin({
          filename: "[name].css",
          chunkFilename: "[id]-[contenthash].css"
        })
      ]),

    new AssetsPlugin({
      path: piramiteConfig.inputFolder,
      filename: "assets.json",
      prettyPrint: true
    }),

    ...(appConfig?.bundleAnalyzerStaticEnabled ? [new BundleAnalyzerPlugin({analyzerMode: 'static', openAnalyzer: false})] : [])
  ]
});

module.exports = clientConfig;
