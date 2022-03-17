cmake_minimum_required(VERSION 3.1)
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

include_directories(${CMAKE_CURRENT_SOURCE_DIR}
 .. ../checkout/mmdb2 ../checkout/ssm/ssm ../checkout/libccp4/ccp4 ../checkout/clipper ../checkout/ccp4srs ../checkout/gemmi/include)

add_library(privateer STATIC
            ../checkout/privateer-MKIV/src/third-party/sajson.h
            ../checkout/privateer-MKIV/src/third-party/utf.hpp
            ../checkout/privateer-MKIV/src/privateer-error.h
            ../checkout/privateer-MKIV/src/privateer-json.h
            ../checkout/privateer-MKIV/src/clipper-glyco.cpp
            ../checkout/privateer-MKIV/src/clipper-glyco_data.cpp
            ../checkout/privateer-MKIV/src/privateer-blobs.cpp
            ../checkout/privateer-MKIV/src/privateer-composition.cpp
            ../checkout/privateer-MKIV/src/privateer-dbquery.cpp
            ../checkout/privateer-MKIV/src/privateer-cryo_em.cpp
            ../checkout/privateer-MKIV/src/privateer-xray.cpp
            ../checkout/privateer-MKIV/src/privateer-restraints.cpp
            ../checkout/privateer-MKIV/src/privateer-lib.cpp)

target_link_directories(privateer PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4 ../gemmi)
target_link_libraries(privateer mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 nodefs.js)

target_compile_options(privateer PUBLIC "-DFFTW_ENABLE_FLOAT")

add_executable(privateer-validate
               ../checkout/privateer-MKIV/src/privateer.cpp)

target_compile_options(privateer-validate PUBLIC "-DFFTW_ENABLE_FLOAT")


target_link_directories(privateer-validate PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../clipper/minimol ../fftw ../rfftw ../ccp4 ../ccp4srs)
target_link_libraries(privateer-validate privateer mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 clipper-minimol fftw rfftw ccp4 ccp4srs z nodefs.js)

set_target_properties(privateer-validate PROPERTIES OUTPUT_NAME privateer)
target_link_options(privateer-validate PRIVATE -s ALLOW_MEMORY_GROWTH=1)

SET_SOURCE_FILES_PROPERTIES(privateer-frontend_scripting.i PROPERTIES CPLUSPLUS ON)


install(FILES ../checkout/privateer-MKIV/src/clipper-glyco.h ../checkout/privateer-MKIV/src/clipper-glyco_data.h ../checkout/privateer-MKIV/src/privateer-lib.h
        DESTINATION include/privateer)
install(TARGETS privateer
        RUNTIME DESTINATION bin
        ARCHIVE DESTINATION "${LIB_INSTALL_DIR}"
        LIBRARY DESTINATION "${LIB_INSTALL_DIR}")
install(TARGETS privateer-validate DESTINATION bin)

if (UNIX)
  install(CODE "
    execute_process(COMMAND ${CMAKE_COMMAND} -E create_symlink privateer
            \"\$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/privateer-validate\")
        ")
endif()
