module.exports = {
    entry: ["babel-polyfill", "./entry.js"],
    output: {
        path: __dirname+'/build',
        filename: "bundle.js"
    },
    module: {
        loaders: [
           {
              test: /\.js$/,
              exclude: /(node_modules|bower_components|src\/lib)/,
              loader: 'babel-loader',
              query: {
                presets: ['latest']
              }
            }
        ]
    }
};