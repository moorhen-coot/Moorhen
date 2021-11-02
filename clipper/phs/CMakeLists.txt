project(clipper-phs)

add_library(clipper-phs STATIC 
phs_io.cpp
)

target_include_directories(clipper-phs PRIVATE ../.. .. ../../fftw ../../rfftw)
