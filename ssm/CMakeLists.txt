project(ssm)

add_library(ssm STATIC 
../checkout/ssm/ssm/ssm_align.cpp
../checkout/ssm/ssm/ssm_csia.cpp
../checkout/ssm/ssm/ssm_graph.cpp
../checkout/ssm/ssm/ssm_malign.cpp
../checkout/ssm/ssm/ssm_superpose.cpp
../checkout/ssm/ssm/ssm_vxedge.cpp
)

target_include_directories(ssm PRIVATE .. ../checkout/mmdb2 ../ccp4)
