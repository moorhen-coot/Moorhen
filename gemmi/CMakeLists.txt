cmake_minimum_required(VERSION 3.13)

project(gemmi LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
message(STATUS "Compiling with C++ standard: ${CMAKE_CXX_STANDARD}")
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(gemmi_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/gemmi)

find_package(ZLIB)
if (ZLIB_FOUND)
  include_directories("${ZLIB_INCLUDE_DIR}")
  message(STATUS "The build will use zlib code from emscripten")
endif()

include_directories("${gemmi_src}/include"
                    "${gemmi_src}/third_party")

add_library(gemmi_cpp
            ${gemmi_src}/src/assembly.cpp
            ${gemmi_src}/src/calculate.cpp
            ${gemmi_src}/src/crd.cpp
            ${gemmi_src}/src/eig3.cpp
            ${gemmi_src}/src/mmcif.cpp
            ${gemmi_src}/src/mmread_gz.cpp
            ${gemmi_src}/src/mtz.cpp
            ${gemmi_src}/src/mtz2cif.cpp
            ${gemmi_src}/src/polyheur.cpp
            ${gemmi_src}/src/read_cif.cpp
            ${gemmi_src}/src/resinfo.cpp
            ${gemmi_src}/src/riding_h.cpp
            ${gemmi_src}/src/sprintf.cpp
            ${gemmi_src}/src/to_mmcif.cpp
            ${gemmi_src}/src/to_pdb.cpp
            ${gemmi_src}/src/monlib.cpp
            ${gemmi_src}/src/topo.cpp
            ${gemmi_src}/src/xds_ascii.cpp)

set_target_properties(gemmi_cpp PROPERTIES COMPILE_FLAGS "-fexceptions -pthread -s USE_ZLIB=1 -s USE_PTHREADS=1" )

install(TARGETS gemmi_cpp
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/gemmi
)

