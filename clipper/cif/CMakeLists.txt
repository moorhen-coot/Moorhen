project(clipper-cif)

add_library(clipper-cif STATIC 
../../checkout/clipper/clipper/cif/cif_data_io.cpp
)

target_include_directories(clipper-cif PRIVATE ../../checkout/mmdb2/ ../../checkout/clipper ../../checkout/fftw-2.1.5/fftw ../../rcheckout/fftw-2.1.5/fftw)
