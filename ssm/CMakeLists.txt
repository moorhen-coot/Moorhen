project(ssm)

add_library(ssm STATIC 
ssm_align.cpp
ssm_csia.cpp
ssm_graph.cpp
ssm_malign.cpp
ssm_superpose.cpp
ssm_vxedge.cpp
)

target_include_directories(ssm PRIVATE .. ../mmdb2 ../ccp4)
