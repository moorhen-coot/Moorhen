project(clipper-phs)

add_library(clipper-phs STATIC 
../../checkout/clipper/clipper/phs/phs_io.cpp
)

target_include_directories(clipper-phs PRIVATE ../.. ../../checkout/clipper ../../fftw ../../rfftw)
