project(clipper-cns)

add_library(clipper-cns STATIC 
../../checkout/clipper/clipper/cns/cns_hkl_io.cpp
../../checkout/clipper/clipper/cns/cns_map_io.cpp
)

target_include_directories(clipper-cns PRIVATE ../.. ../../checkout/clipper ../../fftw ../../rfftw)
