project(web_example)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

add_executable(web_example web_example.cc headers.cc ../wasm_src/gemmi-wrappers.cc ../checkout/ssm/sup_pairwise.cpp ../checkout/ssm/sup_multiple.cpp
)

target_link_options(web_example PRIVATE -fexceptions -sDEMANGLE_SUPPORT=1 -sASSERTIONS=2 -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createCCP4Module -sEXPORTED_RUNTIME_METHODS=['FS','readFile'])

target_link_directories(web_example PUBLIC ../ssm ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4 ../lib)

target_link_libraries(web_example ssm  mmdb2 clipper-minimol clipper-phs clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 clipper-minimol gemmi_cpp gsl gslcblas m z idbfs.js)
target_include_directories(web_example PRIVATE ../checkout/privateer-MKIV/src ../include ../example ../checkout/ssm ../checkout/mmdb2/ ../checkout/mmdb2/mmdb2 ../checkout/clipper ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw ../checkout/libccp4/ccp4 ../checkout/ccp4srs ../checkout/gemmi/include ../checkout/coot-1.0 )
target_compile_options(web_example PUBLIC -fexceptions -DFFTW_ENABLE_FLOAT -D_CCP4_WEB_EXAMPLE_ -DGEMMI_WRITE_IMPLEMENTATION )
install(TARGETS web_example DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public/baby-gru)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/web_example.wasm  
              ${CMAKE_CURRENT_BINARY_DIR}/web_example.js
DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public/baby-gru)

