# Moorhen
[![NPM Version](https://badge.fury.io/js/moorhen.svg?style=flat)](https://npmjs.org/package/moorhen)
[![Inline docs](https://github.com/moorhen-coot/moorhen/actions/workflows/nightly-tests.yml/badge.svg)](https://github.com/moorhen-coot/Moorhen/actions/workflows/nightly-tests.yml)
[![Inline docs](https://github.com/moorhen-coot/MoorhenOrgBuild/actions/workflows/build-and-deploy.yml/badge.svg)](https://moorhen.org)
[![Inline docs](https://github.com/moorhen-coot/moorhen/actions/workflows/js-documentation.yml/badge.svg)](https://moorhen-coot.github.io/Moorhen/)
[![Inline docs](https://github.com/moorhen-coot/wiki/actions/workflows/jekyll.yml/badge.svg)](https://moorhen-coot.github.io/wiki/)

Moorhen is a web browser molecular graphics program based on the Coot desktop program.
It is developed by compiling some [CCP4](https://www.ccp4.ac.uk/) libraries and programs, [Coot](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/) and their dependencies to Web Assembly and then combining with a React user interface.

The emscripten suite of tools is required to do the
compilation.

The sources of CCP4, Coot, Privateer, FFTW, and GSL are not included. They are downloaded and (possibly) patched by the build process of this project.

The following libraries/programs are compiled to Web Assembly:
* libccp4 (8.0.0)
* clipper (20240123)
* ssm (1.4.0)
* mmdb2 (2.0.22)
* gemmi 0.7.0
* Coot 1.0
* fftw 2.1.5
* gsl 2.7.1
* Boost 1.86.0
* glm 0.9.9.8
* RDKit 2024\_09\_3
* Freetype

Moorhen is available to use at [https://moorhen.org](https://moorhen.org).

Further information can be found in our [wiki pages](https://moorhen-coot.github.io/wiki/) and our [dev. docs](https://moorhen-coot.github.io/Moorhen/).

## **Binaries**

Binaries are available on the releases page. Please read the instructions there before using.

## **Compilation instructions**

**Requirements** 

* A Bourne-like shell
* git
* curl
* patch
* ninja
* meson
* cmake
* flex
* bison
* A *native* C++ compiler. (This is required for part of the `boost` build system).
* `autoconf`,`autotools`
* `libtool`
* emsdk/emscripten (Steps 1 and 2 below)
\
\
Most of these (except emscripten) can be installed by somelike like `sudo apt install git cmake curl patch meson ninja-build autoconf automake libtool flex bison g++` on a Debian like system. All of these should be available through Homebrew or Ports on macOS.
\
\
Moorhen should build on any reasonably recent version of macOS (Intel or Arm64) and any reasonly recent Linux distribution (x86\_64 or aarch64). Tested on Ubuntu 22.04 x86\_64, Raspberry Pi OS Bookworm/Debian 12 on Pi5, macOS Monteray and Sonama and others.

1. Install emscripten (following  [https://emscripten.org/docs/getting_started/downloads.html](https://emscripten.org/docs/getting_started/downloads.html)):  
`git clone https://github.com/emscripten-core/emsdk.git`  
`cd emsdk`  
`git pull`  
`./emsdk install latest`  
`./emsdk activate latest`  
(Moorhen is known to build successfully with emscripten version 4.0.4, the 25th February 2025 release.)

2. Each time you want to use emscripten:  
`source ./emsdk_env.sh`

3. Get the source:  
`git clone --recurse-submodules https://github.com/moorhen-coot/Moorhen.git`  
`cd Moorhen`

4. Build gsl, Boost, RDKIt, Coot, the CCP4 libraries and examples:  
<br>In this branch, it is intended that you do the build in the source directory. 
<br/>After first checkout you should run the following script to build:  
`./moorhen_build.sh`  
This should build all dependencies and then `Moorhen`. 
\
\
It is also possible to build a 64-bit version of Moorhen which (currently) can address up to 8GB memory:  
`./moorhen_build.sh --64bit`  
Note that you need a 64-bit WASM capable web browser to use this. Most browsers are not 64-bit capable by default. Some have
64-bit capability available as an option or in development versions.  
See the `MEMORY64` feature at [https://webassembly.org/features/](https://webassembly.org/features/)  
Moorhen developers have seen success with Firefox Nightly on MacOS and Linux and Chrome Canary (with `chrome://flags/#enable-experimental-webassembly-features`) on MacOS.

5. To run the Moorhen molecular graphics application:  
`cd baby-gru`  
`npm start`  
And then point a web browser at `http://localhost:5173/` .  

## **Updating**

When you wish to update the application from this git repository and the `Coot` git repository, do the following steps:  
1. `git pull`
2. `git submodule update -f --remote --merge`
3. `cd checkout/coot-1.0`
4. `git pull`
5. `cd ../..`
6. `./moorhen_build.sh moorhen`
7. `./moorhen_build.sh --64bit moorhen` if you want to (re-)build the 64-bit version.

![Moorhen](wasm_src_frontend/baby_gru.png)
*The Moorhen application*

## **What else can do with the compiled libraries?**

See `coot/moorhen-wrappers.cc` to see use of `EMSCRIPTEN_BINDINGS` to expose Coot methods to the web browser.

Any program you write, which uses the *subset* of Coot, Clipper, code which this project compiles to WASM, can
itself be compiled to WASM and used within node or Web Browser. Studying the examples should show you to do I/O, which is
different in the 2 cases. If you require more classes or methods from the libraries to be exposed to JavaScript, then changes need to be made to
`coot/moorhen-wrappers.cc`. This should only be necessary for browser usage - in node your whole program can be written in C++.

## **References**

* Emscripten
    *   [https://emscripten.org/](https://emscripten.org/)
    *   [Emscripten: An LLVM-to-JavaScript Compiler](https://github.com/emscripten-core/emscripten/blob/main/docs/paper.pdf)
* Coot
    * P. Emsley; B. Lohkamp; W.G. Scott; Cowtan (2010). *Features and Development of Coot*, Acta Crystallographica. **D66 (4)** p486–501.
* Privateer
    * Agirre, J., Iglesias-Fernández, J., Rovira, C., Davies, G.J., Wilson, K.S. and Cowtan, K.D., (2015), *Privateer: software for the conformational validation of carbohydrate structures*, Nature Structural and Molecular Biology **22(11)**, p.833.
    * Bagdonas, H., Ungar, D. and Agirre, J., (2020), *Leveraging glycomics data in glycoprotein 3D structure validation with Privateer*, Beilstein Journal of Organic Chemistry, **16(1)**, p2523-2533.
* Clipper
    * Cowtan K (2003), *The Clipper C++ libraries for X‐ray crystallography*, IUCr Comput Comm Newslett **2**, p4–9
* CCP4
    * Winn MD, Ballard CC, Cowtan KD, Dodson EJ, Emsley P, Evans PR, Keegan RM, Krissinel EB, Leslie AGW, McCoy A, McNicholas SJ, Murshudov GN, Pannu NS, Potterton EA, Powell HR, Read RJ, Vagin A, Wilson KS (2011), *Overview of the CCP4 suite and current developments*, Acta Cryst **D67**, p235–242. 
* Gemmi
    *   [https://github.com/project-gemmi/gemmi](https://github.com/project-gemmi/gemmi)
* Gesamt
    *   Krissinel E. (2012), *Enhanced fold recognition using efficient short fragment clustering*, Journal of molecular biochemistry, **1(2)**, p76–85.
* ProSMART
    * R.A. Nicholls, M. Fischer, S. McNicholas and G.N. Murshudov (2014) *Conformation-Independent Structural Comparison of Macromolecules with ProSMART.* Acta Cryst. **D70**, p2487-2499.
* GSL
    * M. Galassi et al, GNU Scientific Library Reference Manual (3rd Ed.), ISBN 0954612078
    * https://www.gnu.org/software/gsl/
* FFTW
    *   Frigo, Matteo and Johnson, Steven G. (2005), *The Design and Implementation of FFTW3*, Proceedings of the IEEE **93(2)**, p216-231.
* RDKit
    *  RDKit: Open-source cheminformatics [https://www.rdkit.org](https://www.rdkit.org)
* Boost
    * Boost C++ libraries [https://www.boost.org/users/license.html](https://www.boost.org/users/license.html)
* GLM
    * Open GL Mathematics [https://github.com/g-truc/glm](https://github.com/g-truc/glm)
* Eigen C++ Template Library
    * Eigen: a c++ linear algebra library. [Libraries for scientific computing](http://www.association-aristote.fr/doku.php/public:seminaires:seminaire-2013-05-15). Ecole Polytechnique, May 15th, 2013
* Freetype
    * FreeType is a freely available software library to render fonts. [https://www.freetype.org](https://www.freetype.org)
* Igraph
    * Csardi G, Nepusz T (2006). *“The igraph software package for complex network research.”* InterJournal, Complex Systems, 1695. [https://igraph.org](https://igraph.org).
    * Csárdi G, Nepusz T, Traag V, Horvát S, Zanini F, Noom D, Müller K (2024). *igraph: Network Analysis and Visualization in R.* [https://doi.org/10.5281/zenodo.7682609](https://doi.org/10.5281/zenodo.7682609), R package version 2.1.1, [https://CRAN.R-project.org/package=igraph](https://CRAN.R-project.org/package=igraph) .
* JsonCPP
    * [https://github.com/open-source-parsers/jsoncpp](https://github.com/open-source-parsers/jsoncpp)
* Libpng
    * [https://github.com/pnggroup/libpng](https://github.com/pnggroup/libpng)
* libsigcplusplus
    * [https://libsigcplusplus.github.io/libsigcplusplus/](https://libsigcplusplus.github.io/libsigcplusplus/)
* Privateer
    * The Web app: Dialpuri, J. S., Bagdonas, H., Schofield, L. C., Pham, P. T., Holland, L., Bond, P. S., Sánchez Rodríguez, F., McNicholas, S. J. & Agirre, J. (2024). *Online carbohydrate 3D structure validation with the Privateer web app.* Acta Cryst. **F80**, 30-35.
    * General Privateer citation (old): Agirre, J., Iglesias-Fernández, J., Rovira, C., Davies, G.J., Wilson, K.S. and Cowtan, K.D., 2015. *Privateer: software for the conformational validation of carbohydrate structures.* Nature Structural and Molecular Biology, **22(11)**, p.833.
    * Glycomics powered validation: Bagdonas, H., Ungar, D. and Agirre, J., 2020. *Leveraging glycomics data in glycoprotein 3D structure validation with Privateer.* Beilstein Journal of Organic Chemistry, **16(1)**, 2523-2533.
    * Theory behind Privateer: Agirre, J., 2017. *Strategies for carbohydrate model building, refinement and validation.* Acta Crystallographica Section D, **73(2)**, pp.171-186.
    * Torsional analyses: Dialpuri, J. S., Bagdonas, H., Atanasova, M., Schofield, L. C., Hekkelman, M. L., Joosten, R. P. & Agirre, J., 2023. *Analysis and validation of overall N-glycan conformation in Privateer.* Acta Crystallographica Section D, **79**, 462-472.
* Zlib
    *  Adler, Mark (22 January 2024). "[Zlib-announce](https://madler.net/pipermail/zlib-announce_madler.net/2024/000015.html) zlib 1.3.1 released". Retrieved 23 January 2024.
* PubChem
    * Kim S, Chen J, Cheng T, Gindulyte A, He J, He S, Li Q, Shoemaker BA, Thiessen PA, Yu B, Zaslavsky L, Zhang J, Bolton EE. PubChem 2023 update. Nucleic Acids Res. 2023 Jan 6;51(D1):D1373-D1380. [https://doi.org/10.1093/nar/gkac956](https://doi.org/10.1093/nar/gkac956). PMID: 36305812
* SMILES
    * Weininger, David *SMILES, a chemical language and information system. 1. Introduction to methodology and encoding rules* Journal of Chemical Information and Computer Sciences **28(1)**, p31-36 (1988) [https://doi.org/10.1021/ci00057a005](https://doi.org/10.1021/ci00057a005)
