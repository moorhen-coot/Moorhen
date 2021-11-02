project(clipper-cns)

add_library(clipper-cns STATIC 
cns_hkl_io.cpp
cns_map_io.cpp
)

target_include_directories(clipper-cns PRIVATE ../.. .. ../../fftw ../../rfftw)
