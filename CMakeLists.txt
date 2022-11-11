cmake_minimum_required(VERSION 3.13)
project(ccp4_wasm)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2")
set(CMAKE_C_FLAGS_RELEASE "-O2")

include(ExternalProject)
ExternalProject_Add(gsl-src
  SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/gsl-2.7.1
  CONFIGURE_COMMAND COMMAND autoreconf -i COMMAND emconfigure ${CMAKE_CURRENT_SOURCE_DIR}/gsl-2.7.1/configure --prefix=${CMAKE_CURRENT_SOURCE_DIR}
  PREFIX ${CMAKE_CURRENT_SOURCE_DIR}/gsl-2.7.1
  BUILD_COMMAND emmake make LDFLAGS=-all-static
  INSTALL_COMMAND emmake make install
  BUILD_IN_SOURCE 1
)

ExternalProject_Add(boost-src
  SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/boost
  CONFIGURE_COMMAND COMMAND ./bootstrap.sh --with-libraries=serialization,regex,chrono,date_time,filesystem,iostreams,program_options,thread,math,random,system
  BUILD_COMMAND ./b2 toolset=emscripten link=static threading=multi
  INSTALL_COMMAND ./b2 toolset=emscripten link=static threading=multi install --prefix=${CMAKE_CURRENT_SOURCE_DIR}/install
  BUILD_IN_SOURCE 1
)

add_custom_target(boost_thread_dep ALL
  COMMAND emar q ${CMAKE_CURRENT_SOURCE_DIR}/boost/stage/lib/libboost_thread.a ${CMAKE_CURRENT_SOURCE_DIR}/boost/stage/lib/libboost_thread.bc
  DEPENDS boost-src
)

add_subdirectory(ccp4)
add_subdirectory(fftw)
add_subdirectory(rfftw)
add_subdirectory(mmdb2)
add_subdirectory(clipper/minimol)
add_subdirectory(clipper/core)
add_subdirectory(clipper/ccp4)
add_subdirectory(clipper/contrib)
add_subdirectory(clipper/cns)
add_subdirectory(clipper/mmdb)
add_subdirectory(clipper/cif)
add_subdirectory(clipper/phs)
add_subdirectory(ssm)
add_subdirectory(ccp4srs)
#add_subdirectory(gemmi)
add_subdirectory(privateer)
add_subdirectory(example)
add_subdirectory(web_example)
add_subdirectory(coot)
add_subdirectory(rvapi)
add_subdirectory(gesamt)
add_subdirectory(ccp4mg)
add_subdirectory(prosmart)
install(FILES
${CMAKE_CURRENT_BINARY_DIR}/react-app/node_modules/pako/dist/pako.js
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/react-app/public/wasm/)
#MN FOr baby-gru
install(DIRECTORY
${CMAKE_CURRENT_BINARY_DIR}/react-app/src/
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/baby-gru/src/WebGL)
