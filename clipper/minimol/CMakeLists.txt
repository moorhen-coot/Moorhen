project(clipper-minimol)

add_library(clipper-minimol STATIC 
../../checkout/clipper/clipper/minimol/container_minimol.cpp
../../checkout/clipper/clipper/minimol/minimol.cpp
../../checkout/clipper/clipper/minimol/minimol_data.cpp
../../checkout/clipper/clipper/minimol/minimol_io.cpp
../../checkout/clipper/clipper/minimol/minimol_seq.cpp
../../checkout/clipper/clipper/minimol/minimol_utils.cpp
)

target_include_directories(clipper-minimol PRIVATE ../../checkout/mmdb2/ ../../checkout/clipper ../../fftw ../../rfftw)
