cmake_minimum_required(VERSION 3.13)
project(conkit)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -I${CMAKE_INSTALL_PREFIX}/include -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_library(conkit STATIC 
../checkout/conkit/src/conkit_validate.cpp
../checkout/conkit/src/parsers.cpp
../checkout/conkit/src/table.cpp
../checkout/conkit/external/map_align/map_align_lib.cpp

)

set(conkit_HEADERS
 ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/conkit/include/conkit_validate/conkit_validate.h
 ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/conkit/include/conkit_validate/parsers.h
 ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/conkit/include/conkit_validate/table.h
 ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/conkit/external/map_align/map_align_lib.h
)

set_target_properties(conkit PROPERTIES PUBLIC_HEADER "${conkit_HEADERS}")

install(TARGETS conkit
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/conkit
)
