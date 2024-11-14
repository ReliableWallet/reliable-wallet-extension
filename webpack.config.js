const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: './public/background.js',
    output: {
        filename: 'background.js',
        path: path.resolve(__dirname, 'build'),
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        fallback: {
            "stream": require.resolve("stream-browserify"),
            "assert": require.resolve("assert/"),
            "buffer": require.resolve("buffer/"),
            "process": require.resolve("process/browser"), // Полифил для process
        },
        extensions: ['.ts', '.tsx', '.js', '.json']
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser', // Определяем глобальный process
            Buffer: ['buffer', 'Buffer'], // Определяем глобальный Buffer
        }),
    ],
    externals: {
        chrome: 'chrome',
      }
};
