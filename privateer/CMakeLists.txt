cmake_minimum_required(VERSION 3.13)
project(privateer C CXX)

option(BUILD_SHARED_LIBS "Build as a shared library" ON)

set(CMAKE_CXX_STANDARD 11)

if(DEFINED ENV{PRIVATEER_DEBUG})
    add_definitions(-DDUMP=1)
    message(STATUS "Making debug build")
endif()

if(NOT DEFINED LIB_INSTALL_DIR)
    set(LIB_INSTALL_DIR ${CMAKE_INSTALL_PREFIX}/lib)
endif()

find_package(OpenMP)
if(OPENMP_FOUND)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}" )
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${OpenMP_EXE_LINKER_FLAGS}")
endif()

set(privateer_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/privateer-wasm/src/privateer/cpp/ )

include_directories(${CMAKE_CURRENT_SOURCE_DIR}
 ..
 ${privateer_src}
 ${privateer_src}/pybind11
  ${privateer_src}/third-party/simdjson/
 )


add_library(privateer STATIC
            ${privateer_src}/clipper-glyco.cpp
            ${privateer_src}/clipper-glyco_data.cpp
            ${privateer_src}/privateer-blobs.cpp
            ${privateer_src}/privateer-composition.cpp
            ${privateer_src}/privateer-cryo_em.cpp
            ${privateer_src}/privateer-db.cpp
            ${privateer_src}/privateer-dbquery.cpp
            ${privateer_src}/privateer-interactions.cpp
            ${privateer_src}/privateer-lib.cpp
            ${privateer_src}/privateer-modelling.cpp
            ${privateer_src}/privateer-xray.cpp
            ${privateer_src}/third-party/simdjson/simdjson.cpp
            )

target_link_directories(privateer PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../clipper/gemmi ../fftw ../rfftw ../ccp4 ../gemmi)
target_link_libraries(privateer mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 clipper-gemmi gemmi_cpp fftw rfftw ccp4 nodefs.js)

target_compile_options(privateer PUBLIC "-DFFTW_ENABLE_FLOAT")

set(privateer_HEADERS
${privateer_src}/clipper-glyco.h
${privateer_src}/clipper-glyco_data.h
${privateer_src}/privateer-blobs.h
${privateer_src}/privateer-composition.h
${privateer_src}/privateer-cryo_em.h
${privateer_src}/privateer-db.h
${privateer_src}/privateer-dbquery.h
${privateer_src}/privateer-error.h
${privateer_src}/privateer-interactions.h
${privateer_src}/privateer-json.h
${privateer_src}/privateer-lib.h
${privateer_src}/privateer-modelling.h
${privateer_src}/privateer-xray.h
${privateer_src}/third-party/simdjson/simdjson.h

)

set_target_properties(privateer PROPERTIES PUBLIC_HEADER "${privateer_HEADERS}")

install(TARGETS privateer
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/privateer
)

set(privateer_third_party-headers_HEADERS
${privateer_src}/third-party/sajson.h
)

install(FILES 
${privateer_third_party-headers_HEADERS}
DESTINATION include/privateer/third-party
)

set(privateer_pybind11-headers_HEADERS
${privateer_src}/pybind11/privateer-restraints.h
)

install(FILES 
${privateer_pybind11-headers_HEADERS}
DESTINATION include/privateer/pybind11
)
