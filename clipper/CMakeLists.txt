cmake_minimum_required(VERSION 3.13)
project(clipper)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE BOTH)
find_path(FFTW2_INCLUDE_DIRS REQUIRED NAMES fftw.h PATHS ${CMAKE_PREFIX_PATH}/include/fftw)
find_path(RFFTW2_INCLUDE_DIRS REQUIRED NAMES rfftw.h PATHS ${CMAKE_PREFIX_PATH}/include/rfftw)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

message(STATUS "FFTW2 header directory - ${FFTW2_INCLUDE_DIRS}")
message(STATUS "RFFTW2 header directory - ${RFFTW2_INCLUDE_DIRS}")

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -I${CMAKE_PREFIX_PATH}/include/ -I${FFTW2_INCLUDE_DIRS} -I${RFFTW2_INCLUDE_DIRS} -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_subdirectory(minimol)
add_subdirectory(core)
add_subdirectory(ccp4)
add_subdirectory(contrib)
add_subdirectory(cns)
add_subdirectory(mmdb)
add_subdirectory(cif)
add_subdirectory(phs)
add_subdirectory(gemmi)
