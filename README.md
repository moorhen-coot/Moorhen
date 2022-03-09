1. Install emscripten following:  
[https://emscripten.org/docs/getting_started/downloads.html](https://emscripten.org/docs/getting_started/downloads.html)  
Do not forget the final step (as I did!):  
`./emsdk activate latest`

2. Each time you want to use emscripten:  
`source ./emsdk_env.sh`

3. Install gsl:  
Get and untar [https://mirror.ibcp.fr/pub/gnu/gsl/gsl-latest.tar.gz](https://mirror.ibcp.fr/pub/gnu/gsl/gsl-latest.tar.gz)  
`cd gls-2.7.1`  
`autoreconf -i`  
`emconfigure ./configure --prefix=$PWD/..`  
`emmake make LDFLAGS=-all-static`  
`emmake make install`  
`cd ..`

4. Install emscripten port of zlib:  
Create a file silly.c (can be empty)  
`emcc silly.c -s USE_ZLIB=1`

5. Download and untar coot:  
Get and untar [https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/source/releases/coot-0.9.6.tar.gz](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/source/releases/coot-0.9.6.tar.gz)

6. Build the CCP4 libraries and examples:  
`emcmake cmake .`  
`emmake make`

7. Run the command line examples:  
`cd example`  
`node ccp4_example.js`  
`node superpose.js 4dfr.pdb 8dfr.pdb`

8. To run the web example, put the contents of the `web_example` directory on a web server.  
This can be a full-scale web server, or a simple one, e.g:  
`cd web_example`  
`python3 -m http.server 7800 &`  
And then point a web browser at `http://localhost:7800/test.html` .  
In either case you will have to set `ligandServer` in `pdb_worker.js` to point to the CCP4 monomer library. One way to do this is to leave it as `"/monomers/"` and create a symbolic link to a local CCP4 monomer library, e.g. (in `web_example`):  
`ln -s /Applications/ccp4-8.0/lib/data/monomers`
