const path = require('path');
const webpack = require('webpack');
const {merge} = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const env = process.env.PIRAMITE_ENV || 'local';

const piramiteConfig = require('./piramite.config');

const appConfigFilePath = `${piramiteConfig.appConfigFile.entry}/${env}.conf.js`;
const appConfig = require(appConfigFilePath); // eslint-disable-line import/no-dynamic-require

const commonConfig = require('./webpack.common.config');
const postCssConfig = require('./postcss.config');
const packageJson = require(path.resolve(process.cwd(), 'package.json'));
const replaceString = require('./config/string.js');

const distFolderPath = piramiteConfig.distFolder;
const isDebug = piramiteConfig.dev;

let styles = '';

for (let i = 0; i < piramiteConfig.styles.length; i++) {
  styles += `require('${piramiteConfig.styles[i]}');`;
}
const piramiteServerConfigPath = piramiteConfig.webpackConfiguration.server;
const piramiteServerConfig = piramiteServerConfigPath
  ? require(piramiteConfig.webpackConfiguration.server)
  : '';

const serverConfig = merge(commonConfig, piramiteServerConfig, {
  name: 'server',

  target: 'node',

  mode: isDebug ? 'development' : 'production',

  entry: {
    server: [path.resolve(__dirname, isDebug ? 'src/server.js' : 'src/main.js')],
  },

  output: {
    path: piramiteConfig.output.server.path,
    filename: piramiteConfig.output.server.filename,
    libraryTarget: 'commonjs2',
  },

  module: {
    rules: [
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.(js|jsx|mjs)$/,
        loader: 'esbuild-loader',
        include: [path.resolve(__dirname, 'src'), piramiteConfig.inputFolder],
        options: {
          loader: 'jsx',
          target: 'es2015',
        },
      },
      {
        test: /\.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [...replaceString()],
        },
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: appConfig.isCssClassNameObfuscationEnabled
                  ? `${piramiteConfig.prefix}-[name]-[hash:base64]`
                  : `${piramiteConfig.prefix}-[path][name]__[local]`,
                localIdentHashSalt: packageJson.name,
                exportOnlyLocals: true,
              },
              importLoaders: 1,
              sourceMap: isDebug,
            }
          },
          {
            loader: 'postcss-loader',
            options: postCssConfig
          },
          {
            loader: 'sass-loader',
          },
          ...(piramiteConfig.sassResources
            ? [
              {
                loader: 'sass-resources-loader',
                options: {
                  sourceMap: false,
                  resources: piramiteConfig.sassResources,
                },
              },
            ]
            : [])
        ]
      }
    ]
  },

  externalsPresets: {node: true},
  externals: [
    nodeExternals(),
  ],

  plugins: [
    new CleanWebpackPlugin({
        verbose: false,
      dangerouslyAllowCleanPatternsOutsideProject: true,
    }),

    new webpack.DefinePlugin({
      'process.env.BROWSER': false,
      __DEV__: isDebug,
    }),

    ...(isDebug ? [new webpack.HotModuleReplacementPlugin()] : [])
  ]
});

module.exports = serverConfig;
