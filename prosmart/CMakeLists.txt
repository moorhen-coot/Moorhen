project(prosmart CXX)

if(UNIX)
  find_library(MATH_LIBRARY m)
endif()

# For now we stay compatible with previous autotools-based build.
# config.h is included but no definitions are required there.
add_definitions(-DHAVE_CONFIG_H)
#configure_file(${CMAKE_SOURCE_DIR}/config.h.in ${CMAKE_BINARY_DIR}/config.h)
file(WRITE ${CMAKE_BINARY_DIR}/config.h "")

add_library(prosmart_common STATIC
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmart_array_tools.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmart_xml.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmart_string_tools.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmartClass_Coords.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmartClass_Transform.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmartClass_PDBfile.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmart_process_management.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/prosmart_file_management.cpp
  )

add_library(prosmart_align STATIC
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/alignClass_Align.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/alignClass_Frag.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/align_output_filehandling.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/align_helix.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/align_alignment_algorithm.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/align_alignment_scoring.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/align_cluster.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/alignClass_Residues.cpp
  #src/align.cpp
  )

add_library(prosmart_restrain STATIC
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_vector_operations.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrainClass_Residues.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_align_handler.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrainClass_Atomic_Bonds.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrainClass_Diff_Info.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_likelihood.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_boxing_algorithm.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_bfgs_optimisation.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_atomic_restraints.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/restrain_hbond.cpp
  #src/restrain.cpp
  )

#add_executable(prosmart
#  src/prosmart_align_tools.cpp
#  src/prosmart_external_programs.cpp
#  src/prosmart_multiple_superposition.cpp
#  src/prosmart_results.cpp
#  src/prosmart_pdb_tools.cpp
#  src/prosmartClass_Restraints.cpp
#  src/prosmart_params.cpp
#  src/prosmart_windows.cpp
#  src/prosmart.cpp
#  $<TARGET_OBJECTS:common>)

target_include_directories(prosmart_common PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/tnt_jama ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2 )
target_include_directories(prosmart_align PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/tnt_jama ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2 )
target_include_directories(prosmart_restrain PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src/tnt_jama ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/prosmart/src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/mmdb2 )
