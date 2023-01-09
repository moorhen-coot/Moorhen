const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const path = require('path');

const paths = {
  cloud: path.resolve(__dirname, 'cloud'),
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  public: path.resolve(__dirname, 'public'),
  publicBabyGru: path.resolve(__dirname, 'public', 'baby-gru'),
  pixmaps: path.resolve(__dirname, 'public', 'baby-gru', 'pixmaps'),
}

module.exports = {
  plugins:[
   
    new HTMLWebpackPlugin({
      filename: 'index.html',
      template: path.join(paths.cloud, 'index.html'),
      favicon: path.join(paths.public, 'favicon.ico')
    }),
    
    new MiniCssExtractPlugin({
      filename: '[name][contenthash].css',
      chunkFilename: '[id].css',
      ignoreOrder: false,
    }),

    new CopyWebpackPlugin({
      patterns: [
        {
          from: paths.publicBabyGru,
          to: paths.dist + '/baby-gru/',
          toType: 'dir',
        }
      ],
    }),
  ],
  entry: path.join(paths.cloud, 'index.js'),
  target: 'web',
  mode: 'production',
  cache: false,
  output: {
    clean: true,
    filename: '[name].js',
    path: paths.dist,
    publicPath: './'
  },
    module:{
        rules:[
            {
                test: /\.js$/,
                exclude: [/node_modules/, path.resolve(paths.src, 'index.js')],
                loader: 'babel-loader',
            },
            {
              test: /\.(?:ico|gif|png|jpg|jpeg|svg|xpm)$/,
              loader: 'file-loader',
              type: 'asset/resource',
            },
            {
                test: /\.css$/,
                sideEffects: true,
                use: [ MiniCssExtractPlugin.loader, 'css-loader'],
            }
        ]
    },
    resolve: {
        fallback: {
          fs: false
        }
      }
}
