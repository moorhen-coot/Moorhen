cmake_minimum_required(VERSION 3.13)
project(slicendice)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE BOTH)
find_path(EIGEN_INCLUDE_DIRS REQUIRED NAMES "Eigen/Dense" PATHS ${CMAKE_PREFIX_PATH}/include/eigen3/)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
message(STATUS "Eigen header directory - ${EIGEN_INCLUDE_DIRS}")

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -I${EIGEN_INCLUDE_DIRS} -I${CMAKE_PREFIX_PATH}/include -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_library(slicendice_cpp STATIC 
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/extmath.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/dist_metrics.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/hierarchy.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/agglomerative.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/birch.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_common.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_elkan.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_lloyd.cpp
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/pae_igraph.cpp
)

set(slicendice_cpp_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/extmath.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/dist_metrics.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/hierarchy.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/agglomerative.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/birch.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_common.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_elkan.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/kmeans_lloyd.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/slicendice_cpp/prog/pae_igraph.h
)

set_target_properties(slicendice_cpp PROPERTIES PUBLIC_HEADER "${slicendice_cpp_HEADERS}")

install(TARGETS slicendice_cpp
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/slicendice_cpp
)

install(FILES
${slicendice_cpp_HEADERS}
DESTINATION include/slicendice_cpp
)
