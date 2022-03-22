
#include <stdlib.h>
#include <iostream> // fixes undefined strchr, strchrr problems

#if defined(__EMSCRIPTEN__)
#include <vector>
#include <string>
#endif

#include "geometry/protein-geometry.hh"
#include "coords/mmdb-extras.h"
#include "coords/mmdb.h"

#include "coot-nomenclature.hh"

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

int main(int argc, char **argv) {
#if defined(__EMSCRIPTEN__)
#ifndef NODERAWFS
    // mount the current folder as a NODEFS instance
    // inside of emscripten
    EM_ASM(
            FS.mkdir('/working');
            FS.mount(NODEFS, { root: '.' }, '/working');
          );
#endif
#endif

   if (argc < 3) {
      std::cout << "Usage: " << argv[0] << " in-filename out-filename\n";
      exit(1);
   } else {
      coot::protein_geometry geom;
      std::string filename = std::string(CWD) + argv[1];
      atom_selection_container_t asc = get_atom_selection(filename, true, false, false);
      coot::nomenclature n(asc.mol);
      std::string outfilename = std::string(CWD) + argv[2];
      const char *ofnc = outfilename.c_str();
      asc.mol->WritePDBASCII(ofnc);
      n.fix(&geom);
   }
   return 0;
}
