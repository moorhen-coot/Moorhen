project(clipper-cif)

add_library(clipper-cif STATIC 
cif_data_io.cpp
)

target_include_directories(clipper-cif PRIVATE ../.. .. ../../fftw ../../rfftw)
