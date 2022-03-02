cmake_minimum_required(VERSION 3.4)
project(ccp4srs CXX)

include(GNUInstallDirs)

option(BUILD_SHARED_LIBS "build shared libs (true)" TRUE)

find_package(zlib REQUIRED)

include(CheckLibraryExists)

CHECK_LIBRARY_EXISTS(m cos "" HAVE_LIB_M)                                                                                                
                                                                                                                                         
if (HAVE_LIB_M)                                                                                                                          
    set(EXTRA_LIBS ${EXTRA_LIBS} m)                                                                                                      
endif (HAVE_LIB_M)

include( CheckIncludeFileCXX )
include( CheckFunctionExists )
include( CheckTypeSize)

check_include_file_cxx( "dirent.h" HAVE_DIRENT_H)

set(PACKAGE "ccp4srs")
set(VERSION "1.0")
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/config.h.cmakein
               ${CMAKE_CURRENT_BINARY_DIR}/config.h @ONLY)

set(prefix      ${CMAKE_INSTALL_PREFIX})
set(exec_prefix ${CMAKE_INSTALL_PREFIX})
set(libdir      ${CMAKE_INSTALL_PREFIX}/lib)
set(includedir  ${CMAKE_INSTALL_PREFIX}/include)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs.pc.cmakein
   ${CMAKE_CURRENT_BINARY_DIR}/ccp4srs.pc.in @ONLY)
 file(GENERATE OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/ccp4srs.pc
   INPUT ${CMAKE_CURRENT_BINARY_DIR}/ccp4srs.pc.in)

set(ccp4srs_sources
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_angle.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_manager.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_atom.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_monomer.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_base.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_plane.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_bond.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_torsion.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_chem.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_tree.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_chicenter.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_types.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_container.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/memio_.cpp 
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_entry.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/mpfile_.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_index.cpp
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_smiles.cpp
)

set(ccp4srs_headers
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_angle.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_index.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_atom.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_manager.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_base.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_monomer.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_bond.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_plane.h 
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_chem.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_torsion.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_chicenter.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_tree.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_container.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_types.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_defs.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/memio_.h
	${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_entry.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/mpfile_.h
        ${CMAKE_CURRENT_SOURCE_DIR}/ccp4srs/ccp4srs_smiles.h
)

add_library(ccp4srs ${ccp4srs_sources} ${ccp4srs_headers})
add_library(ccp4srs::ccp4srs ALIAS ccp4srs)

target_link_directories(ccp4srs PUBLIC ../mmdb2 ../ccp4)
target_link_libraries(ccp4srs PRIVATE 
                             ZLIB::ZLIB
                             mmdb2 ccp4
                             ${EXTRA_LIBS}
)

target_include_directories(ccp4srs PRIVATE .
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/ccp4srs
    .. ../mmdb2 ../ccp4
    ${CMAKE_BINARY_DIR}
)

set_target_properties(ccp4srs PROPERTIES PUBLIC_HEADER  "${ccp4srs_headers}" )
set_target_properties(ccp4srs PROPERTIES SOVERSION ${VERSION})
if(MSVC)
    set_target_properties(ccp4srs PROPERTIES DEFINE_SYMBOL "CCP4SRS_DLL_EXPORT")
endif()

install(TARGETS ccp4srs
      ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
      LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
      RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
      PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/ccp4srs/
)

set(srsgen_sources
    ${CMAKE_CURRENT_SOURCE_DIR}/srsgen.cpp
)
if(MSVC)
    set(srsgen_sources ${srsgen_sources} ${CMAKE_CURRENT_SOURCE_DIR}/windows/dirent.cpp )
endif(MSVC)

add_executable(srsgen ${srsgen_sources})
target_link_directories(srsgen PUBLIC ../mmdb2 ../ccp4)
target_link_libraries(srsgen PRIVATE 
                             ccp4srs::ccp4srs
                             mmdb2 ccp4 nodefs.js
                             ${EXTRA_LIBS}
)
target_include_directories(srsgen PRIVATE .
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/ccp4srs
    .. ../mmdb2 ../ccp4
    ${CMAKE_BINARY_DIR}
)
                                 
add_executable(srsview ${CMAKE_CURRENT_SOURCE_DIR}/srsview.cpp)
target_link_directories(srsview PUBLIC ../mmdb2 ../ccp4)
target_link_libraries(srsview PRIVATE 
                             ccp4srs::ccp4srs
                             mmdb2 ccp4 nodefs.js
                             ${EXTRA_LIBS}
)
target_include_directories(srsview PRIVATE .
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/ccp4srs
    .. ../mmdb2 ../ccp4
    ${CMAKE_BINARY_DIR}
)

add_executable(pdb2to3 ${CMAKE_CURRENT_SOURCE_DIR}/srsrem.cpp)

target_include_directories(pdb2to3 PRIVATE .
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/ccp4srs
    .. ../mmdb2 ../ccp4
    ${CMAKE_BINARY_DIR}
)

target_link_directories(pdb2to3 PUBLIC ../mmdb2 ../ccp4)
target_link_libraries(pdb2to3 PRIVATE 
                             ccp4srs::ccp4srs
                             mmdb2 ccp4 nodefs.js
                             ${EXTRA_LIBS}
)
target_include_directories(srsgen PRIVATE .
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/ccp4srs
    .. ../mmdb2 ../ccp4
    ${CMAKE_BINARY_DIR}
)
                                 
install(TARGETS pdb2to3
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

