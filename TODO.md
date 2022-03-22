# CCP4/Coot/Privateer Web Assembly
This project is a set of scripts, patches and CMakeLists.txt files which enable the compilation of some of the CCP4 libraries, some of Coot, FFTW2, Privateer and the Gnu Scientific Library to Web Assembly.

### Todo

- [ ] Update README with all changes in README.md.
- [ ] Split coot into library and executables. An almost accurate list can be got from    
    find checkout/coot-0.9.6/ -name \*.cpp -o -name \*.cc | xargs grep -w main | grep -w int
- [ ] Make Coot library examples    
  - [ ] src/fix-nomenclature.cc  
- [ ] Check problem with one Coot source file ligand/res-tracer.cc depends on scored-node.hh which seems not to exist. Fixed in > 0.9.6?
### Done ✓

- [x] Create my first TODO.md  
