project(web_example)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_EXECUTABLE_SUFFIX ".html")

add_executable(web_example web_example.cc)

#target_link_options(web_example PRIVATE "-s ALLOW_MEMORY_GROWTH=1" "-s EXPORTED_FUNCTIONS=['_mmdb2_example','log_example']" "-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']")
target_link_options(web_example PRIVATE -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=[_mmdb2_example,_log_example] -sEXPORTED_RUNTIME_METHODS=[ccall,cwrap])

target_link_directories(web_example PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4)

target_link_libraries(web_example mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 idbfs.js)
target_include_directories(web_example PRIVATE .. ../mmdb2 ../clipper ../fftw ../rfftw ../ccp4)
