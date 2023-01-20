# CCP4/Coot/Privateer Web Assembly

This project is a set of scripts, patches and CMakeLists.txt files
which enable the compilation of  some of the [CCP4](https://www.ccp4.ac.uk/) libraries and programs, some of [Coot](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/), [FFTW2](https://www.fftw.org/), [Privateer](https://github.com/glycojones/privateer) and the [Gnu Scientific Library](https://www.gnu.org/software/gsl/) to Web Assembly. The most interesting part for the end user is a prototype port of Coot to WebGL, web assembly, JavaScript, etc. currently codenamed `Baby Gru`

Contained are some examples of using the generated JS/Web Assembly:

* A command line example which offers some of the functionality of the CCP4 program `superpose`.
* A command line example which offers some of the functionality of the CCP4 program `gesamt`.
* A command line example which does a structure factor calculation with `clipper`.
* A React-Bootstrap example (Baby-Gru) which implements some of the tools from the `Coot` molecular graphics program.

The emscripten suite of tools is required to do the
compilation.

The sources of CCP4, Coot, Privateer, FFTW, and GSL are not included. They are downloaded and (possibly) patched by the running
the `get_sources` script, which is part of the build process of this project.

The following libraries/programs are compiled to Web Assembly:
* libccp4 (bzr)
* clipper (bzr)
* ssm (bzr)
* mmdb2 (bzr)
* ccp4srs (bzr)
* rvapi (bzr)
* gesamt (bzr)
* ccp4mg (partial - normal modes and dependencies) (bzr)
* privateer MKIV
* Coot 1.0 ('webassembly' git branch)
* fftw 2.1.5
* gsl 2.7.1

Additionally [gemmi](https://github.com/project-gemmi/gemmi) is downloaded as it is a compile-time dependency of privateer. gemmi is
not itself compiled by this project.

## **Compilation instructions**

**Requirements** 

* A Bourne-like shell
* bzr
* git
* curl
* patch
* emsdk (Steps 1 and 2 below)
* cmake
* A *native* C++ compiler. (This is required for part of the `boost` build system).
* `autoconf`,`autotools`
* `libtool`

1. Install emscripten (following  [https://emscripten.org/docs/getting_started/downloads.html](https://emscripten.org/docs/getting_started/downloads.html)):  
`git clone https://github.com/emscripten-core/emsdk.git`  
`cd emsdk`  
`git pull`  
`./emsdk install latest`  
`./emsdk activate latest`

2. Each time you want to use emscripten:  
`source ./emsdk_env.sh`

3. Get the sources:  
`git clone https://github.com/stuartjamesmcnicholas/CCP4-Web-Assembly.git --branch build-test-2 ccp4_wasm`  
`cd ccp4_wasm`  
`./get_sources`

4. Build gsl, Coot, the CCP4 libraries and examples:  
<br>In this branch, it is intended that you do the build in the source directory. 
<br/>After first checkout you should run the following script to build:  
`./initial_build.sh`  
This should build all dependencies and then `WebCoot`/`BabyGru`. 

5. To run the Baby-Gru molecular graphics application:  
`cd baby-gru`  
`npm start`  
And then point a web browser at `http://localhost:3000/` .  
You will need to set up `ligandServer` (in `baby-gru/public`):  
`ln -s $CCP4/lib/data/monomers`  

## **Updating**

1. When you wish to update the application from this git repository and the `Coot` git repository, do the following steps:  
    1. `git pull`
    2. `cd checkout/coot-1.0`
    3. `git pull`
    4. `cd ../..`
    5. `cd CCP4_WASM_BUILD/moorhen_build`
    6. `make install` (or e.g. `make -j8 install` to build on 8 processors).

![BabyGru](web_example/baby_gru.png)
*The BabyGru prototype WebGL application*

## **What else can do with the compiled libraries?**

See `example/example.cc` or `checkout/privateer-MKIV/src/privateer.cpp` to see how to create a command line (node) program. The
latter is quite long and a patched version of the original privateer code. It might be more helpful to look at the patch file
`patches/privateer-emscripten.patch`. This should show how to patch an existing command line program which reads files to one
that will work within node.

See `coot/moorhen-wrappers.cc` to see use of `EMSCRIPTEN_BINDINGS` to expose Coot methods to the web browser.

Any program you write, which uses the *subset* of Coot, Clipper, Privateer code which this project compiles to WASM, can
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
    *  RDKit for JavaScript (Official) [https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib](https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib)
    *  RDKit: Open-source cheminformatics [https://www.rdkit.org](https://www.rdkit.org)

