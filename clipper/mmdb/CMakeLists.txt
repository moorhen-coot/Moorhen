project(clipper-mmdb)

add_library(clipper-mmdb STATIC 
../../checkout/clipper/clipper/mmdb/clipper_mmdb.cpp
)

target_include_directories(clipper-mmdb PRIVATE ../.. ../../checkout/clipper ../../fftw ../../rfftw)
