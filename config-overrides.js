const webpack = require('webpack');

module.exports = function override(config, env) {
  // Добавляем externals для исключения объекта chrome
  config.externals = {
    chrome: 'chrome',
  };

  // Настройка resolve для добавления фоллбеков
  config.resolve = {
    ...config.resolve,
    fallback: {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      crypto: require.resolve('crypto-browserify'),
      vm: require.resolve('vm-browserify'),
      "process/browser": require.resolve("process/browser.js"),
    },
    alias: {
      'process': require.resolve('process/browser'), // Добавление алиаса
    },
  };

  // Настройка плагинов, чтобы включить поддержку process и Buffer
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser', // Добавляем process как глобальный объект
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
