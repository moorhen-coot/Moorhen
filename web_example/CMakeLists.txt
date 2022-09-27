project(web_example)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

add_executable(web_example web_example.cc ../checkout/ssm/superpose.cpp ../checkout/ssm/sup_pairwise.cpp ../checkout/ssm/sup_multiple.cpp
../checkout/gesamt/src/gesamt.cpp
../checkout/gesamt/src/gesamt_domains.cpp
../checkout/gesamt/src/gesamt_domains.h
../checkout/gesamt/src/gesamt_input.cpp
../checkout/gesamt/src/gesamt_input.h
../checkout/gesamt/src/gesamt_multiple.cpp
../checkout/gesamt/src/gesamt_multiple.h
../checkout/gesamt/src/gesamt_pairwise.cpp
../checkout/gesamt/src/gesamt_pairwise.h
../checkout/gesamt/src/gesamt_sheaf.cpp
../checkout/gesamt/src/gesamt_sheaf.h
../checkout/gesamt/src/gesamt_usage.cpp
../checkout/gesamt/src/gesamt_usage.h
../checkout/gesamt/src/gesamt_utils.cpp
../checkout/gesamt/src/gesamt_utils.h
)

target_link_options(web_example PRIVATE -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createCCP4Module -sEXPORTED_RUNTIME_METHODS=['FS','readFile'])

target_link_directories(web_example PUBLIC ../ssm ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4 ../privateer ../rvapi ../gesamt ../ccp4mg ../lib)

target_link_libraries(web_example ssm rvapi gesamtlib mmdb2 clipper-minimol clipper-phs clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 privateer clipper-minimol ccp4mg coot gsl gslcblas m z idbfs.js)
target_include_directories(web_example PRIVATE ../checkout/privateer-MKIV/src ../include ../example ../checkout/ssm ../checkout/mmdb2/ ../checkout/mmdb2/mmdb2 ../checkout/clipper ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw ../checkout/libccp4/ccp4 ../checkout/ccp4srs ../checkout/gemmi/include ../checkout/gesamt ../gesamt ../ccp4mg  ../checkout/ccp4mg/mmut  ../checkout/ccp4mg/util ../checkout/ccp4mg/pygl/mapview ../checkout/coot-1.0 )
target_compile_options(web_example PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_WEB_EXAMPLE_)
install(TARGETS web_example DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../react-app/public/wasm)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/web_example.wasm  
              ${CMAKE_CURRENT_BINARY_DIR}/web_example.js
              ${CMAKE_CURRENT_BINARY_DIR}/RDKit_minimal.js
              ${CMAKE_CURRENT_BINARY_DIR}/RDKit_minimal.wasm
              ${CMAKE_CURRENT_BINARY_DIR}/crystallography_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/cif_pdb_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/mtz_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/mtz_arraybuffer_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/papaparse.min.js
              ${CMAKE_CURRENT_BINARY_DIR}/pdb_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/superpose_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/smiles_to_pdb_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/monid_to_pdb_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/nma_worker.js
              ${CMAKE_CURRENT_BINARY_DIR}/mini_rsr_worker.js
              #${CMAKE_CURRENT_BINARY_DIR}/pthread_test.wasm
              #${CMAKE_CURRENT_BINARY_DIR}/pthread_test.js
              #${CMAKE_CURRENT_BINARY_DIR}/pthread_test.worker.js
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../react-app/public/wasm)

#add_executable(pthread_test pthread_test.cc)
#target_compile_options(pthread_test PUBLIC -sUSE_PTHREADS=1 )
#target_link_options(pthread_test PUBLIC -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=4 -sPTHREAD_POOL_SIZE_STRICT=4  -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createThreadExample)
#target_include_directories(pthread_test PUBLIC ../boost/ )
#target_link_directories(pthread_test PUBLIC ../boost/stage/lib )
#target_link_libraries(pthread_test boost_thread )
