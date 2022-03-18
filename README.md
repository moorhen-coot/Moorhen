# CCP4 Web Assembly

This project is a set of scripts, patches and CMakeLists.txt files
which enable the compilation of  some of the [CCP4](https://www.ccp4.ac.uk/) libraries, some of [Coot](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/), [FFTW2](https://www.fftw.org/), [Privateer](https://github.com/glycojones/privateer) and the [Gnu Scientific Library](https://www.gnu.org/software/gsl/) to Web Assembly. 

Contained are some examples of using the generated JS/Web 
Assembly. There is a command line example which offers some of the functionality of the CCP4 program `superpose`, a command line example which does a structure factor calculation with clipper
and a web server example which does superposition, structure
factor calculations, map calculations, 2D ligand viewing with
[RDKit](https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib) and glycosolation tree visualisation with privateer.

The emscripten suite of tools is required to do the
compilation.

The sources of CCP4, Coot FFTW, and GSL are not contained within this project. They are downloaded and (possibly) patched by the `get_sources`
script.

The following libraries are compiled to Web Assembly:
* libccp4 (bzr)
* clipper (bzr)
* ssm (bzr)
* mmdb2 (bzr)
* ccp4srs (bzr)
* privateer MKIV
* Coot 0.9.6
* fftw 2.1.5
* gsl 2.7.1

Additionally [gemmi](https://github.com/project-gemmi/gemmi) is downloaded as it is a compile-time dependency of privateer. gemmi is
not itself compiled by this project.

## **Installation instructions:**

**Requirements:** 

* A Bourne-like shell
* bzr
* git
* curl
* patch
* emsdk (Steps 1 and 2 below)
* cmake

1. Install emscripten following:  
[https://emscripten.org/docs/getting_started/downloads.html](https://emscripten.org/docs/getting_started/downloads.html)  
Do not forget the final step (as I did!):  
`./emsdk activate latest`

2. Each time you want to use emscripten:  
`source ./emsdk_env.sh`

3. Get the sources:  
`git clone https://github.com/stuartjamesmcnicholas/CCP4-Web-Assembly.git ccp4_wasm`  
`cd ccp4_wasm`  
`./get_sources`

4. Build gsl, Coot, the CCP4 libraries and examples:  
`emcmake cmake .`  
`emmake make`

5. Run the command line examples:  
`cd example`  
`node ccp4_example.js`  
`node superpose.js 4dfr.pdb 8dfr.pdb`

6. To run the web example, put the contents of the `web_example` directory on a web server.  
This can be a full-scale web server, or a simple one, e.g:  
`cd web_example`  
`python3 -m http.server 7800 &`  
And then point a web browser at `http://localhost:7800/test.html` .  
In either case you will have to set `ligandServer` in `pdb_worker.js` to point to the CCP4 monomer library. One way to do this is to leave it as `"/monomers/"` and create a symbolic link to a local CCP4 monomer library, e.g. (in `web_example`):  
`ln -s /Applications/ccp4-8.0/lib/data/monomers`

![Web example ligands and glycotrees](web_example/screenshot.png)
*Ligands pictures produced by interrogating file with MMDB2 and rendering with RDKit. Glycosolation trees produced by privateer.*
![Web example text output](web_example/screenshot_text.png)
*Text output trapped from printf/cout and displayed asynchronously in browser div element.*
