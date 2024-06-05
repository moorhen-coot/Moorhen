project(clipper-cif)

add_library(clipper-cif STATIC 
../../checkout/clipper/clipper/cif/cif_data_io.cpp
)

set(clipper-cif_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/cif/cif_data_io.h
)

target_compile_options(clipper-cif PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-cif PROPERTIES PUBLIC_HEADER "${clipper-cif_HEADERS}")

install(TARGETS clipper-cif
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/cif
)
