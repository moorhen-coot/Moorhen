project(web_example)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_EXECUTABLE_SUFFIX ".html")

add_executable(web_example web_example.cc)

target_link_options(web_example PRIVATE -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1)

target_link_directories(web_example PUBLIC ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4)

target_link_libraries(web_example mmdb2 clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 idbfs.js)
target_include_directories(web_example PRIVATE .. ../mmdb2 ../clipper ../fftw ../rfftw ../ccp4)
