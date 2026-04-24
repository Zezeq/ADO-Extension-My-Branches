const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const hubs = ['org-hub', 'repos-hub'];

module.exports = {
  entry: Object.fromEntries(hubs.map(hub => [hub, `./src/${hub}/index.ts`])),
  output: {
    filename: '[name]/bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  externals: {
    'azure-devops-extension-sdk': 'SDK',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: hubs.map(
    hub =>
      new HtmlWebpackPlugin({
        template: `./src/${hub}/index.html`,
        filename: `${hub}/index.html`,
        chunks: [hub],
      })
  ),
};
