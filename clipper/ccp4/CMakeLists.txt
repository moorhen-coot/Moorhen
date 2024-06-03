project(clipper-ccp4)

add_library(clipper-ccp4 STATIC 
../../checkout/clipper/clipper/ccp4/ccp4_map_io.cpp
../../checkout/clipper/clipper/ccp4/ccp4_mtz_io.cpp
../../checkout/clipper/clipper/ccp4/ccp4_mtz_types.cpp
../../checkout/clipper/clipper/ccp4/ccp4_utils.cpp
)

set(clipper-ccp4_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/ccp4/ccp4_map_io.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/ccp4/ccp4_mtz_io.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/ccp4/ccp4_mtz_types.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/ccp4/ccp4_utils.h
)

target_compile_options(clipper-ccp4 PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-ccp4 PROPERTIES PUBLIC_HEADER "${clipper-ccp4_HEADERS}")

install(TARGETS clipper-ccp4
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/ccp4
)
