project(web_example)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

add_executable(web_example web_example.cc headers.cc ../wasm_src/gemmi-wrappers.cc ../checkout/ssm/sup_pairwise.cpp ../checkout/ssm/sup_multiple.cpp
)

target_link_options(web_example PRIVATE -fexceptions -sDEMANGLE_SUPPORT=1 -sASSERTIONS=2 -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createCCP4Module -sEXPORTED_RUNTIME_METHODS=['FS'])

target_link_directories(web_example PUBLIC ../install/lib )

target_link_libraries(web_example ssm  mmdb2 clipper-minimol clipper-phs clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 clipper-minimol gemmi_cpp gsl gslcblas m z idbfs.js)
target_compile_options(web_example PUBLIC -fexceptions -DFFTW_ENABLE_FLOAT -D_CCP4_WEB_EXAMPLE_ -DGEMMI_WRITE_IMPLEMENTATION )
install(TARGETS web_example DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/web_example.wasm  
              ${CMAKE_CURRENT_BINARY_DIR}/web_example.js
DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public)

