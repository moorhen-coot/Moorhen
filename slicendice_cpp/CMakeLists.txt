project(slicendice)

add_library(slicendice_cpp STATIC 
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/extmath.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/dist_metrics.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/hierarchy.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/agglomerative.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/birch.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_common.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_elkan.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_lloyd.cpp
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/pae_igraph.cpp
)

target_include_directories(slicendice_cpp PRIVATE ${CMAKE_SOURCE_DIR}/install/include/eigen3)

set(slicendice_cpp_HEADERS
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/extmath.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/dist_metrics.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/hierarchy.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/agglomerative.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/birch.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_common.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_elkan.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/kmeans_lloyd.h
${CMAKE_SOURCE_DIR}/checkout/slicendice_cpp/prog/pae_igraph.h
)

set_target_properties(ccp4 PROPERTIES PUBLIC_HEADER "${slicendice_cpp_HEADERS}")

install(TARGETS slicendice_cpp
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/slicendice_cpp
)

install(FILES
${slicendice_cpp_HEADERS}
DESTINATION include/slicendice_cpp
)
