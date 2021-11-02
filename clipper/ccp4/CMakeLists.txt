project(clipper-ccp4)

add_library(clipper-ccp4 STATIC 
ccp4_map_io.cpp
ccp4_mtz_io.cpp
ccp4_mtz_types.cpp
ccp4_utils.cpp
)

target_include_directories(clipper-ccp4 PRIVATE ../.. .. ../../fftw ../../rfftw)
