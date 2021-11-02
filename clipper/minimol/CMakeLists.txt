project(clipper-minimol)

add_library(clipper-minimol STATIC 
container_minimol.cpp
minimol.cpp
minimol_data.cpp
minimol_io.cpp
minimol_seq.cpp
minimol_utils.cpp
)

target_include_directories(clipper-minimol PRIVATE ../.. .. ../../fftw ../../rfftw)
