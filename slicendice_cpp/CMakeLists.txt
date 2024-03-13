project(slicendice)


add_library(slicendice_cpp STATIC 
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/extmath.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/dist_metrics.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/hierarchy.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/agglomerative.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_common.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_elkan.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_lloyd.cpp
)

target_include_directories(slicendice_cpp PRIVATE ${CMAKE_SOURCE_DIR}/checkout/rdkit-Release_2023_09_1/External/Eigen/eigen/)

set(licendice_cpp_HEADERS
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/extmath.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/dist_metrics.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/hierarchy.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/agglomerative.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_common.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_elkan.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_lloyd.h
)

set_target_properties(ccp4 PROPERTIES PUBLIC_HEADER "${licendice_cpp_HEADERS}")

install(TARGETS slicendice_cpp
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/slicendice_cpp
)
