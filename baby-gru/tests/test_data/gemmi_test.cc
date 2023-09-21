#include <iostream>
#include <fstream>
#include <string.h>
#include <gemmi/mmread.hpp>
#include <gemmi/gz.hpp>

#if defined(__EMSCRIPTEN__)
#include <emscripten.h>

#ifdef NODERAWFS
#define CWD ""
#else
#define CWD "/working/"
#endif
#else
#define CWD ""
#endif

int main(int argc, char* argv[]) {

#ifndef NODERAWFS
  // mount the current folder as a NODEFS instance
  // inside of emscripten
  EM_ASM(
    FS.mkdir('/working');
    FS.mount(NODEFS, { root: '.' }, '/working');
  );
#endif

      for (int i = 1; i < argc; ++i){

          char *fn =(char*) malloc(strlen(CWD)+strlen(argv[i]));
          fn[0] = '\0';
          strncat(fn,CWD,strlen(CWD));
          strncat(fn,argv[i],strlen(argv[1]));

          try {
              auto st = gemmi::read_structure(gemmi::MaybeGzipped(fn));
              std::cout << "This file has " << st.models.size() << " models.\n";
          } catch (std::runtime_error& e) {
              std::cout << "Oops. " << e.what() << std::endl;
          }
      }
}
