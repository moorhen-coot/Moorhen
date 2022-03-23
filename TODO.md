# CCP4/Coot/Privateer Web Assembly
This project is a set of scripts, patches and CMakeLists.txt files which enable the compilation of some of the CCP4 libraries, some of Coot, FFTW2, Privateer and the Gnu Scientific Library to Web Assembly.

### Todo

- [ ] Check that this successfully compiles on Linux
- [ ] Check that this successfully compiles on Windows (needs *get_sources.bat* or *MSYS*)
- [ ] Split coot into library and executables. An almost accurate list can be got from    
    find checkout/coot-0.9.6/ -name \*.cpp -o -name \*.cc | xargs grep -w main | grep -w int
  - [x] Identify files containing main
  - [ ] Create rules to build executables.
- [ ] Make Coot library examples (more than just fix-nomenclature)
  - [x] `src/fix-nomenclature.cc`
  - [x] Modify `coot_env.js` so that `fix-nomenclature` can be run from anywhere. Created by cmake.
- [ ] Modify all relevant `CMakeLists.txt` to use `-sNODERAWFS=1` and `-DNODERAWFS` for executables so that native filesystem is available.
- [ ] Check problem with one Coot source file ligand/res-tracer.cc depends on scored-node.hh which seems not to exist. Fixed in > 0.9.6?
### Done ✓

- [x] Create my first TODO.md  
- [x] Update README with all changes in README.md.
