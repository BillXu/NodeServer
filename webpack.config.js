const path = require('path');

module.exports = {
	externals: {
		mysql: 'commonjs mysql'
	},
  entry: { 
          center : './build/CenterServer/index.js',

          gate : "./build/gateServer/index.js",

          data : './build/dataServer/index.js',

          db : "./build/DBServer/index.js",

          match : './build/matchServer/index.js',

          robotDispach : "./build/RobotDispatchServer/index.js",
          shMJ : "./build/SHMJServer/index.js"
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