cmake_minimum_required(VERSION 3.1)
project(ccp4mg C CXX)

set(CMAKE_CXX_STANDARD 11)

add_library(ccp4mg STATIC
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/pygl/mapview/headers.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/mmut/mmut_nma.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/bezier.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/cartesian.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/catmull.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/connect.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/geomutil.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/matrix.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/mgtree.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/plane.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/quat.cc
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util/volume.cc)

target_include_directories(ccp4mg PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/clipper ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/util ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/ccp4mg/mmut)

install(TARGETS ccp4mg
LIBRARY DESTINATION lib
)


