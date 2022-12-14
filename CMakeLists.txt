cmake_minimum_required(VERSION 3.13)
project(ccp4_wasm)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -Wno-enum-constexpr-conversion -I${CMAKE_INSTALL_PREFIX}/include -s USE_PTHREADS=1 -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

link_directories(${CMAKE_INSTALL_PREFIX}/lib)
include_directories(${CMAKE_INSTALL_PREFIX}/include/rdkit)
if("${EMSCRIPTEN_VERSION}" VERSION_GREATER 3.1.26)
add_link_options(-sDEFAULT_PTHREAD_STACK_SIZE=2MB -sSTACK_SIZE=5MB)
endif()

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
add_subdirectory(privateer)
add_subdirectory(example)
add_subdirectory(gesamt)
add_subdirectory(web_example)
add_subdirectory(ccp4mg)
add_subdirectory(coot)

install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/baby-gru/ DESTINATION web_packages/baby-gru )

#add_subdirectory(gemmi)
#add_subdirectory(prosmart)

install(DIRECTORY
${CMAKE_CURRENT_SOURCE_DIR}/react-app/src/
DESTINATION web_packages/baby-gru/src/WebGL)

install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/tests/ DESTINATION web_packages/moorhen_tests )
install(FILES
${CMAKE_CURRENT_SOURCE_DIR}/example/5a3h.pdb
${CMAKE_CURRENT_SOURCE_DIR}/example/5a3h_sigmaa.mtz
${CMAKE_CURRENT_SOURCE_DIR}/checkout/coot-1.0/data/rnasa-1.8-all_refmac1.mtz
${CMAKE_CURRENT_SOURCE_DIR}/checkout/coot-1.0/api/tm-A.pdb
DESTINATION web_packages/moorhen_tests/example )
