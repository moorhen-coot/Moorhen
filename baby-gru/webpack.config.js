const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const path = require('path');

const paths = {
  cloud: path.resolve(__dirname, 'cloud'),
  src: path.resolve(__dirname, 'src'),
  types: path.resolve(__dirname, 'src', 'types'),
  dist: path.resolve(__dirname, 'dist'),
  public: path.resolve(__dirname, 'public'),
  publicBabyGru: path.resolve(__dirname, 'public', 'baby-gru'),
  pixmapsPath: path.resolve(__dirname, 'pixmaps'),
  monomerLibraryPath: path.resolve(__dirname, 'public', 'baby-gru', 'monomers'),
  minimalMonomerLib: [
    'ALA', 'ASP', 'ASN', 'CYS', 'GLN', 'GLY', 'GLU', 'PHE', 'HIS', 'ILE', 'LYS', 
    'LEU', 'MET', 'MSE', 'PRO', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR', 'PO4',
    'SO4', 'GOL', 'CIT', 'EDO', 'A', 'C', 'G', 'U', 'DA', 'DC', 'DG', 'DT', 'HOH',
    'NA'
  ],
  requiredCootPixmaps: [
    'MoorhenLogo.png', 'rama2_all.png', 'rama2_gly.png',
    'rama2_pre_pro.png', 'rama2_pro.png', 'rama2_ileval.png', 'rama2_non_gly_pro.png',
    'rama2_non_gly_pro_pre_pro_ileval.png', 'rama-plot-gly-normal.png', 'mutate.svg', 
    'rama-plot-pro-normal.png', 'rama-plot-pro-outlier.png', 'rama-plot-other-normal.png',
    'rama-plot-other-outlier.png', 'auto-fit-rotamer.svg', 'flip-peptide.svg', 
    'side-chain-180.svg', 'refine-1.svg', 'delete.svg', 'rama-plot-gly-outlier.png',
    'add-peptide-1.svg', 'rigid-body.svg', 'spin-view.svg', 'edit-chi.svg',
    'jed-flip-reverse.svg', 'rtz.svg', 'add-alt-conf.svg', 'cis-trans.svg',
    'auto-fit-rotamer.svg', 'flip-peptide.svg', 'cis-trans.svg', 'side-chain-180.svg',
    'refine-1.svg', 'add-alt-conf.svg', 'delete.svg', 'mutate.svg', 'temperature.svg',
    'add-peptide-1.svg', 'spin-view.svg', 'edit-chi.svg', 'jed-flip-reverse.svg',
    'rigid-body.svg', 'atom-at-pointer.svg', 'rtz.svg', 'rotamers.svg', 'drag.svg',
    'keyboard-blank.svg', 'map-grey.svg', 'moorhen-ligand.svg', 'secondary-structure-grey.svg'
  ]
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
      new CopyWebpackPlugin({
        patterns: [
          {
            from: paths.publicBabyGru,
            to: paths.dist + '/baby-gru/',
            toType: 'dir',
            globOptions: {
              ignore: ['**/monomers/**', '**/pixmaps/**']
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
              to: path.resolve(paths.dist, 'baby-gru', 'monomers', monomer.charAt(0).toLowerCase()),
              toType: 'dir',  
            }
          }),
          ...paths.requiredCootPixmaps.map(pixmap => {
            return {
              from: path.resolve(paths.pixmapsPath, pixmap),
              to: path.resolve(paths.dist, 'pixmaps'),
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
      minimize: argv.mode === 'development' ? false : true
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
          exclude: [/node_modules/, path.resolve(paths.src, 'index.js'), paths.publicBabyGru],
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
