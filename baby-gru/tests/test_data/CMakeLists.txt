project(ccp4_example)
cmake_minimum_required(VERSION 3.13)

add_executable(ccp4_example example.cc)

target_link_options(ccp4_example PRIVATE -s ALLOW_MEMORY_GROWTH=1)

target_link_directories(ccp4_example PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4)

target_link_libraries(ccp4_example mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 nodefs.js)
target_include_directories(ccp4_example PRIVATE ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/clipper ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw ../checkout/libccp4/ccp4)

add_executable(superpose ../checkout/ssm/superpose.cpp ../checkout/ssm/sup_pairwise.cpp ../checkout/ssm/sup_multiple.cpp)

target_link_options(superpose PRIVATE -s ALLOW_MEMORY_GROWTH=1)

target_link_directories(superpose PUBLIC ../mmdb2 ../ssm ../ccp4)

target_link_libraries(superpose mmdb2 ssm ccp4 nodefs.js)
target_include_directories(superpose PRIVATE ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4)
target_compile_options(superpose PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_)

#[[
add_executable(gemmi_test gemmi_test.cc)
target_link_options(gemmi_test PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNO_DISABLE_EXCEPTION_CATCHING)
target_include_directories(gemmi_test PRIVATE ../checkout/gemmi/include/ )
target_compile_options(gemmi_test PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_)
target_link_libraries(gemmi_test z nodefs.js)
]]
