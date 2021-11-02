project(ccp4)

add_library(ccp4 STATIC 
ccp4_array.c
ccp4_general.c
ccp4_parser.c
ccp4_program.c
ccp4_unitcell.c
cmap_accessor.c
cmap_close.c
cmap_data.c
cmap_header.c
cmap_labels.c
cmap_open.c
cmap_skew.c
cmap_stats.c
cmap_symop.c
cmtzlib.c
csymlib.c
cvecmat.c
library_err.c
library_file.c
library_utils.c
pack_c.c
)
