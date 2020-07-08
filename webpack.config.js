const path = require('path');

module.exports = {

  entry: { //center : './build/CenterServer/centerSvr.js',

          gate : "./build/gateServer/GateSvr.js"
},

  target: 'node',
  mode : 'production',

  //devtool: 'inline-source-map',

  resolve: {

    extensions: [ '.tsx', '.ts', '.js' ],

  },

  output: {

    filename: '[name].js',

    path: path.resolve(__dirname, 'dist'),

  },

};