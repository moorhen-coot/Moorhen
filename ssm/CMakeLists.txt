cmake_minimum_required(VERSION 3.13)
project(ssm)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -Wno-enum-constexpr-conversion -I${CMAKE_INSTALL_PREFIX}/include -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_library(ssm STATIC 
../checkout/ssm/ssm/ssm_align.cpp
../checkout/ssm/ssm/ssm_csia.cpp
../checkout/ssm/ssm/ssm_graph.cpp
../checkout/ssm/ssm/ssm_malign.cpp
../checkout/ssm/ssm/ssm_superpose.cpp
../checkout/ssm/ssm/ssm_vxedge.cpp
)

set(ssm_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_malign.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_superpose.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_vxedge.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_csia.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_defs.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_align.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//ssm/ssm_graph.h
)

target_compile_options(ssm PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(ssm PROPERTIES PUBLIC_HEADER "${ssm_HEADERS}")

install(TARGETS ssm
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/ssm/ssm
)

set(sup-headers_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//sup_pairwise.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//sup_multiple.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ssm//sup_defs.h
)

install(FILES 
${sup-headers_HEADERS}
DESTINATION include/ssm
)
