project(mmdb2)
cmake_minimum_required(VERSION 3.13)

add_library(mmdb2 STATIC 
hybrid_36.cpp
mmdb_atom.cpp
mmdb_bondmngr.cpp
mmdb_chain.cpp
mmdb_cifdefs.cpp
mmdb_coormngr.cpp
mmdb_cryst.cpp
mmdb_ficif.cpp
mmdb_io_file.cpp
mmdb_io_stream.cpp
mmdb_machine_.cpp
mmdb_manager.cpp
mmdb_mask.cpp
mmdb_math_.cpp
mmdb_math_align.cpp
mmdb_math_bfgsmin.cpp
mmdb_math_fft.cpp
mmdb_math_graph.cpp
mmdb_math_linalg.cpp
mmdb_math_rand.cpp
mmdb_mattype.cpp
mmdb_mmcif_.cpp
mmdb_model.cpp
mmdb_root.cpp
mmdb_rwbrook.cpp
mmdb_selmngr.cpp
mmdb_seqsuperpose.cpp
mmdb_symop.cpp
mmdb_tables.cpp
mmdb_title.cpp
mmdb_uddata.cpp
mmdb_utils.cpp
mmdb_xml_.cpp
)
