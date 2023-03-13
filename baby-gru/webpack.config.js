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
  pixmapsPath: path.resolve(__dirname, 'public', 'baby-gru', 'pixmaps'),
  monomerLibraryPath: path.resolve(__dirname, 'public', 'baby-gru', 'monomers'),
  minimalMonomerLib: [
    'ALA', 'ASP', 'ASN', 'CYS', 'GLN', 'GLY', 'GLU', 'PHE', 'HIS', 'ILE', 'LYS', 
    'LEU', 'MET', 'MSE', 'PRO', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR', 'PO4',
    'SO4', 'GOL', 'CIT', 'EDO', 'A', 'C', 'G', 'U', 'DA', 'DC', 'DG', 'DT', 'HOH',
    'NA'
  ],
  requiredPixmaps: [
    'diff-map.png', 'MoorhenLogo.png', 'rama2_all.png', 'rama2_gly.png',
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
    'rigid-body.svg', 'atom-at-pointer.svg', 'diff-map.png', 'map.svg', 'rtz.svg'
  ]
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
          globOptions: {
            ignore: ['**/monomers/**', '**/pixmaps/**']
          }
        },
        ...paths.minimalMonomerLib.map(monomer => {
          return {
            from: path.resolve(paths.monomerLibraryPath, monomer.charAt(0).toLowerCase(), `${monomer}.cif`),
            to: path.resolve(paths.dist, 'baby-gru', 'monomers', monomer.charAt(0).toLowerCase()),
            toType: 'dir',  
          }
        }),
        ...paths.requiredPixmaps.map(pixmap => {
          return {
            from: path.resolve(paths.pixmapsPath, pixmap),
            to: path.resolve(paths.dist, 'baby-gru', 'pixmaps'),
            toType: 'dir',  
          }
        })

      ],
    }),
  ],
  entry: path.join(paths.cloud, 'index.js'),
  target: 'web',
  mode: 'production',
  cache: false,
  output: {
    clean: true,
    filename: 'moorhen.js',
    path: paths.dist,
    publicPath: './',
    library: 'moorhen',
    libraryTarget: 'umd',
    umdNamedDefine: true,
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
