project(clipper-mmdb)

add_library(clipper-mmdb STATIC 
../../checkout/clipper/clipper/mmdb/clipper_mmdb.cpp
)

set(clipper-mmdb_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/mmdb/clipper_mmdb.h
)

target_compile_options(clipper-mmdb PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-mmdb PROPERTIES PUBLIC_HEADER "${clipper-mmdb_HEADERS}")

install(TARGETS clipper-mmdb
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/mmdb
)
