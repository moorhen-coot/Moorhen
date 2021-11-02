project(clipper-mmdb)

add_library(clipper-mmdb STATIC 
clipper_mmdb.cpp
)

target_include_directories(clipper-mmdb PRIVATE ../.. .. ../../fftw ../../rfftw)
