const path = require('path');

module.exports = {
  entry: './src/main/main.js',
  target: 'electron-main',
  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}; 