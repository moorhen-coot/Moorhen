project(ccp4)

add_library(ccp4 STATIC 
../checkout/libccp4/ccp4/ccp4_array.c
../checkout/libccp4/ccp4/ccp4_general.c
../checkout/libccp4/ccp4/ccp4_parser.c
../checkout/libccp4/ccp4/ccp4_program.c
../checkout/libccp4/ccp4/ccp4_unitcell.c
../checkout/libccp4/ccp4/cmap_accessor.c
../checkout/libccp4/ccp4/cmap_close.c
../checkout/libccp4/ccp4/cmap_data.c
../checkout/libccp4/ccp4/cmap_header.c
../checkout/libccp4/ccp4/cmap_labels.c
../checkout/libccp4/ccp4/cmap_open.c
../checkout/libccp4/ccp4/cmap_skew.c
../checkout/libccp4/ccp4/cmap_stats.c
../checkout/libccp4/ccp4/cmap_symop.c
../checkout/libccp4/ccp4/cmtzlib.c
../checkout/libccp4/ccp4/csymlib.c
../checkout/libccp4/ccp4/cvecmat.c
../checkout/libccp4/ccp4/library_err.c
../checkout/libccp4/ccp4/library_file.c
../checkout/libccp4/ccp4/library_utils.c
../checkout/libccp4/ccp4/pack_c.c
)
