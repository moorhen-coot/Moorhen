project(ssm)

add_library(ssm STATIC 
../checkout/ssm/ssm/ssm_align.cpp
../checkout/ssm/ssm/ssm_csia.cpp
../checkout/ssm/ssm/ssm_graph.cpp
../checkout/ssm/ssm/ssm_malign.cpp
../checkout/ssm/ssm/ssm_superpose.cpp
../checkout/ssm/ssm/ssm_vxedge.cpp
)

target_include_directories(ssm PRIVATE .. ../checkout/mmdb2 ../ccp4)

set(ssm_HEADERS
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_malign.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_superpose.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_vxedge.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_csia.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_defs.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_align.h
${CMAKE_SOURCE_DIR}/checkout/ssm//ssm/ssm_graph.h
)

target_compile_options(ssm PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(ssm PROPERTIES PUBLIC_HEADER "${ssm_HEADERS}")

install(TARGETS ssm
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/ssm/ssm
)

set(sup-headers_HEADERS
${CMAKE_SOURCE_DIR}/checkout/ssm//sup_pairwise.h
${CMAKE_SOURCE_DIR}/checkout/ssm//sup_multiple.h
${CMAKE_SOURCE_DIR}/checkout/ssm//sup_defs.h
)

install(FILES 
${sup-headers_HEADERS}
DESTINATION include/ssm
)
