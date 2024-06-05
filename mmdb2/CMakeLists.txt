cmake_minimum_required(VERSION 3.13)
project(mmdb2)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -Wno-enum-constexpr-conversion -I${CMAKE_INSTALL_PREFIX}/include -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_library(mmdb2 STATIC 
../checkout/mmdb2/mmdb2/hybrid_36.cpp
../checkout/mmdb2/mmdb2/mmdb_atom.cpp
../checkout/mmdb2/mmdb2/mmdb_bondmngr.cpp
../checkout/mmdb2/mmdb2/mmdb_chain.cpp
../checkout/mmdb2/mmdb2/mmdb_cifdefs.cpp
../checkout/mmdb2/mmdb2/mmdb_coormngr.cpp
../checkout/mmdb2/mmdb2/mmdb_cryst.cpp
../checkout/mmdb2/mmdb2/mmdb_ficif.cpp
../checkout/mmdb2/mmdb2/mmdb_io_file.cpp
../checkout/mmdb2/mmdb2/mmdb_io_stream.cpp
../checkout/mmdb2/mmdb2/mmdb_machine_.cpp
../checkout/mmdb2/mmdb2/mmdb_manager.cpp
../checkout/mmdb2/mmdb2/mmdb_mask.cpp
../checkout/mmdb2/mmdb2/mmdb_math_.cpp
../checkout/mmdb2/mmdb2/mmdb_math_align.cpp
../checkout/mmdb2/mmdb2/mmdb_math_bfgsmin.cpp
../checkout/mmdb2/mmdb2/mmdb_math_fft.cpp
../checkout/mmdb2/mmdb2/mmdb_math_graph.cpp
../checkout/mmdb2/mmdb2/mmdb_math_linalg.cpp
../checkout/mmdb2/mmdb2/mmdb_math_rand.cpp
../checkout/mmdb2/mmdb2/mmdb_mattype.cpp
../checkout/mmdb2/mmdb2/mmdb_mmcif_.cpp
../checkout/mmdb2/mmdb2/mmdb_model.cpp
../checkout/mmdb2/mmdb2/mmdb_root.cpp
../checkout/mmdb2/mmdb2/mmdb_rwbrook.cpp
../checkout/mmdb2/mmdb2/mmdb_selmngr.cpp
../checkout/mmdb2/mmdb2/mmdb_seqsuperpose.cpp
../checkout/mmdb2/mmdb2/mmdb_symop.cpp
../checkout/mmdb2/mmdb2/mmdb_tables.cpp
../checkout/mmdb2/mmdb2/mmdb_title.cpp
../checkout/mmdb2/mmdb2/mmdb_uddata.cpp
../checkout/mmdb2/mmdb2/mmdb_utils.cpp
../checkout/mmdb2/mmdb2/mmdb_xml_.cpp
)

set(mmdb2_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_cryst.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_selmngr.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_xml_.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_manager.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_root.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_mmcif_.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_title.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_atom.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_rand.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_utils.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/hybrid_36.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_tables.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_chain.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_fft.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_graph.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_machine_.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_uddata.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_io_stream.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_cifdefs.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_rwbrook.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_ficif.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_mattype.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_bfgsmin.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_model.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_linalg.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_coormngr.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_seqsuperpose.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_bondmngr.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_mask.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_math_align.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_symop.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_defs.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2//mmdb2/mmdb_io_file.h
)
target_compile_options(mmdb2 PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(mmdb2 PROPERTIES PUBLIC_HEADER "${mmdb2_HEADERS}")

install(TARGETS mmdb2
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/mmdb2
)
