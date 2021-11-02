project(clipper-core)

add_library(clipper-core STATIC 
atomsf.cpp
cell.cpp
clipper_instance.cpp
clipper_memory.cpp
clipper_message.cpp
clipper_stats.cpp
clipper_test.cpp
clipper_thread.cpp
clipper_types.cpp
clipper_util.cpp
container.cpp
container_hkl.cpp
container_map.cpp
container_types.cpp
coords.cpp
derivs.cpp
fftmap.cpp
fftmap_sparse.cpp
hkl_compute.cpp
hkl_data.cpp
hkl_datatypes.cpp
hkl_info.cpp
hkl_lookup.cpp
hkl_operators.cpp
map_interp.cpp
map_utils.cpp
nxmap.cpp
nxmap_operator.cpp
ramachandran.cpp
resol_basisfn.cpp
resol_fn.cpp
resol_targetfn.cpp
rotation.cpp
spacegroup.cpp
spacegroup_data.cpp
symop.cpp
test_core.cpp
test_data.cpp
xmap.cpp
)

target_include_directories(clipper-core PRIVATE ../../fftw ../../rfftw)
