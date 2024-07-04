const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const path = require('path');

const paths = {
  cloud: path.resolve(__dirname, 'cloud'),
  src: path.resolve(__dirname, 'src'),
  types: path.resolve(__dirname, 'src', 'types'),
  dist: path.resolve(__dirname, 'dist'),
  public: path.resolve(__dirname, 'public'),
  monomerLibraryPath: path.resolve(__dirname, 'public', 'monomers'),
  minimalMonomerLib: [
    'ALA', 'ASP', 'ASN', 'CYS', 'GLN', 'GLY', 'GLU', 'PHE', 'HIS', 'ILE', 'LYS', 
    'LEU', 'MET', 'MSE', 'PRO', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR', 'PO4',
    'SO4', 'GOL', 'CIT', 'EDO', 'A', 'C', 'G', 'U', 'DA', 'DC', 'DG', 'DT', 'HOH',
    'NA'
  ],
}

module.exports = (env, argv) => {
  return {
    plugins:[
      new webpack.DefinePlugin({
        process: {env: {}}
      }), 
      new MiniCssExtractPlugin({
        filename: 'moorhen.css',
        chunkFilename: '[id].css',
        ignoreOrder: false,
      }),
      new TerserPlugin({
        terserOptions: {
          compress: {
            pure_funcs: argv.mode === 'production' ? [ 'console.log' ] : [ ]
          }
        }
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: paths.public,
            to: paths.dist + '/public/',
            toType: 'dir',
            globOptions: {
              ignore: ['**/monomers/**']
            }
          },
          {
            from: paths.types,
            to: paths.dist + '/types/',
            toType: 'dir',
          },
          ...paths.minimalMonomerLib.map(monomer => {
            return {
              from: path.resolve(paths.monomerLibraryPath, monomer.charAt(0).toLowerCase(), `${monomer}.cif`),
              to: path.resolve(paths.dist, 'public', 'monomers', monomer.charAt(0).toLowerCase()),
              toType: 'dir',  
            }
          }),
          {
            from: path.resolve(__dirname, 'package.json'),
            to: paths.dist,
            toType: 'dir',
          } 
        ],
      }),
    ],
    entry: path.join(paths.src, 'moorhen.ts'),
    target: 'web',
    optimization: {
      minimize: argv.mode === 'production'
    },
    cache: false,
    output: {
      clean: true,
      filename: 'moorhen.js',
      path: paths.dist,
      publicPath: './',
      library: 'moorhen',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'this'
    },
    module: {
      rules:[
        {
          test: /\.tsx$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.js$/,
          exclude: [/node_modules/, path.resolve(paths.src, 'index.js'), paths.public],
          loader: 'babel-loader',
        },
        {
          test: /\.jsx$/,
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
        },
        {
          test: /\.s[ac]ss$/,
          use: [ "style-loader", "css-loader", "sass-loader" ]
        }
      ]
    },
    resolve: {
      fallback: {
        fs: false
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    externals: {
      'react': 'react',
      'react-dom': 'react-dom',
    }
  }
}
