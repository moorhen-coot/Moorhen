project(clipper-phs)

add_library(clipper-phs STATIC 
../../checkout/clipper/clipper/phs/phs_io.cpp
)

set(clipper-phs_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/phs/phs_io.h
)

target_compile_options(clipper-phs PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-phs PROPERTIES PUBLIC_HEADER "${clipper-phs_HEADERS}")

install(TARGETS clipper-phs
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/phs
)
