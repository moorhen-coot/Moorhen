cmake_minimum_required(VERSION 3.14)
project(gesamt C CXX)

option(USE_CCP4 "Build for CCP4" OFF)
option(USE_STATIC "Use static libraries when available" ON)

file(CREATE_LINK ../checkout/rvapi/rvapi/src ${CMAKE_CURRENT_BINARY_DIR}/rvapi COPY_ON_ERROR SYMBOLIC)

if(USE_STATIC)
  set(CMAKE_FIND_LIBRARY_SUFFIXES ${CMAKE_STATIC_LIBRARY_SUFFIX} ${CMAKE_FIND_LIBRARY_SUFFIXES})
endif()

if(USE_CCP4)
  add_definitions(-Dcompile_for_ccp4)
  set(_CCP4C ccp4c)
endif()
set(CMAKE_THREAD_PREFER_PTHREAD True)
find_package(Threads REQUIRED)
if(MSVC)
	find_library(PTHREADS4W pthreadVCE3)
endif()

set(GESAMTLIB_SRC
../checkout/gesamt/gesamtlib/gsmt_aligner.cpp		../checkout/gesamt/gesamtlib/gsmt_seqscanthread.cpp
../checkout/gesamt/gesamtlib/gsmt_aligner.h		../checkout/gesamt/gesamtlib/gsmt_seqscanthread.h
../checkout/gesamt/gesamtlib/gsmt_archive.cpp		../checkout/gesamt/gesamtlib/gsmt_seqsheafs.cpp
../checkout/gesamt/gesamtlib/gsmt_archive.h		../checkout/gesamt/gesamtlib/gsmt_seqsheafs.h
../checkout/gesamt/gesamtlib/gsmt_base.cpp			../checkout/gesamt/gesamtlib/gsmt_sequence.cpp
../checkout/gesamt/gesamtlib/gsmt_base.h			../checkout/gesamt/gesamtlib/gsmt_sequence.h
../checkout/gesamt/gesamtlib/gsmt_clusterer.cpp		../checkout/gesamt/gesamtlib/gsmt_sheaf.cpp
../checkout/gesamt/gesamtlib/gsmt_clusterer.h		../checkout/gesamt/gesamtlib/gsmt_sheaf.h
../checkout/gesamt/gesamtlib/gsmt_defs.h			../checkout/gesamt/gesamtlib/gsmt_sheafdata.cpp
../checkout/gesamt/gesamtlib/gsmt_domains.cpp		../checkout/gesamt/gesamtlib/gsmt_sheafdata.h
../checkout/gesamt/gesamtlib/gsmt_domains.h		../checkout/gesamt/gesamtlib/gsmt_sortclusters.cpp
../checkout/gesamt/gesamtlib/gsmt_domdata.cpp		../checkout/gesamt/gesamtlib/gsmt_sortclusters.h
../checkout/gesamt/gesamtlib/gsmt_domdata.h		../checkout/gesamt/gesamtlib/gsmt_sortpairs.cpp
../checkout/gesamt/gesamtlib/gsmt_dynam.cpp		../checkout/gesamt/gesamtlib/gsmt_sortpairs.h
../checkout/gesamt/gesamtlib/gsmt_dynam.h			../checkout/gesamt/gesamtlib/gsmt_structscanthread.cpp
../checkout/gesamt/gesamtlib/gsmt_hits.cpp			../checkout/gesamt/gesamtlib/gsmt_structscanthread.h
../checkout/gesamt/gesamtlib/gsmt_hits.h			../checkout/gesamt/gesamtlib/gsmt_structure.cpp
../checkout/gesamt/gesamtlib/gsmt_index.cpp		../checkout/gesamt/gesamtlib/gsmt_structure.h
../checkout/gesamt/gesamtlib/gsmt_index.h			../checkout/gesamt/gesamtlib/gsmt_subseqscanthread.cpp
../checkout/gesamt/gesamtlib/gsmt_maligner.cpp		../checkout/gesamt/gesamtlib/gsmt_subseqscanthread.h
../checkout/gesamt/gesamtlib/gsmt_maligner.h		../checkout/gesamt/gesamtlib/gsmt_superpose.cpp
../checkout/gesamt/gesamtlib/gsmt_mamap.cpp		../checkout/gesamt/gesamtlib/gsmt_superpose.h
../checkout/gesamt/gesamtlib/gsmt_mamap.h			../checkout/gesamt/gesamtlib/gsmt_superposition.cpp
../checkout/gesamt/gesamtlib/gsmt_maoutput.cpp		../checkout/gesamt/gesamtlib/gsmt_superposition.h
../checkout/gesamt/gesamtlib/gsmt_maoutput.h		../checkout/gesamt/gesamtlib/gsmt_svd.cpp
../checkout/gesamt/gesamtlib/gsmt_mastructure.cpp		../checkout/gesamt/gesamtlib/gsmt_svd.h
../checkout/gesamt/gesamtlib/gsmt_mastructure.h		../checkout/gesamt/gesamtlib/gsmt_threadbase.cpp
../checkout/gesamt/gesamtlib/gsmt_model.cpp		../checkout/gesamt/gesamtlib/gsmt_threadbase.h
../checkout/gesamt/gesamtlib/gsmt_model.h			../checkout/gesamt/gesamtlib/gsmt_utils.cpp
../checkout/gesamt/gesamtlib/gsmt_msuperposition.cpp	../checkout/gesamt/gesamtlib/gsmt_utils.h
../checkout/gesamt/gesamtlib/gsmt_msuperposition.h		../checkout/gesamt/gesamtlib/gsmt_viewer.cpp
../checkout/gesamt/gesamtlib/gsmt_output.cpp		../checkout/gesamt/gesamtlib/gsmt_viewer.h
../checkout/gesamt/gesamtlib/gsmt_output.h			../checkout/gesamt/gesamtlib/json_.cpp
../checkout/gesamt/gesamtlib/gsmt_pdbscanthread.cpp	../checkout/gesamt/gesamtlib/json_.h
../checkout/gesamt/gesamtlib/gsmt_pdbscanthread.h		../checkout/gesamt/gesamtlib/memio_.cpp
../checkout/gesamt/gesamtlib/gsmt_refiner.cpp		../checkout/gesamt/gesamtlib/memio_.h
../checkout/gesamt/gesamtlib/gsmt_refiner.h		../checkout/gesamt/gesamtlib/shiftsort_.cpp
../checkout/gesamt/gesamtlib/gsmt_segcluster.cpp		../checkout/gesamt/gesamtlib/shiftsort_.h
../checkout/gesamt/gesamtlib/gsmt_segcluster.h
)

add_library(gesamtlib STATIC ${GESAMTLIB_SRC})
#target_link_libraries(gesamtlib ${CCP4_LIBRARIES})

set(GESAMT_SRC
../checkout/gesamt/src/gesamt.cpp		../checkout/gesamt/src/gesamt_input.h	../checkout/gesamt/src/gesamt_pairwise.h	../checkout/gesamt/src/gesamt_usage.h
../checkout/gesamt/src/gesamt_domains.cpp	../checkout/gesamt/src/gesamt_multiple.cpp	../checkout/gesamt/src/gesamt_sheaf.cpp	../checkout/gesamt/src/gesamt_utils.cpp
../checkout/gesamt/src/gesamt_domains.h	../checkout/gesamt/src/gesamt_multiple.h	../checkout/gesamt/src/gesamt_sheaf.h	../checkout/gesamt/src/gesamt_utils.h
../checkout/gesamt/src/gesamt_input.cpp	../checkout/gesamt/src/gesamt_pairwise.cpp	../checkout/gesamt/src/gesamt_usage.cpp
)

add_executable(gesamt ${GESAMT_SRC})

target_link_libraries(gesamt gesamtlib rvapi ccp4 Threads::Threads mmdb2 z nodefs.js)
target_link_directories(gesamt PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4 ../rvapi ../mmdb2)
target_include_directories(gesamtlib PRIVATE ../checkout/gesamt/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2  ../checkout/libccp4/ccp4 ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(gesamt PRIVATE ../checkout/gesamt/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2  ../checkout/libccp4/ccp4 ${CMAKE_CURRENT_SOURCE_DIR})
target_link_options(gesamt PRIVATE -s ALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1)
target_compile_options(gesamt PUBLIC -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)
