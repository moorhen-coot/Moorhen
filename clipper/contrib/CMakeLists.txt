project(clipper-contrib)

add_library(clipper-contrib STATIC 
../../checkout/clipper/clipper/contrib/convolution_search.cpp
../../checkout/clipper/clipper/contrib/edcalc.cpp
../../checkout/clipper/clipper/contrib/fffear.cpp
../../checkout/clipper/clipper/contrib/function_object_bases.cpp
../../checkout/clipper/clipper/contrib/mapfilter.cpp
../../checkout/clipper/clipper/contrib/originmatch.cpp
../../checkout/clipper/clipper/contrib/sfcalc.cpp
../../checkout/clipper/clipper/contrib/sfcalc_obs.cpp
../../checkout/clipper/clipper/contrib/sfscale.cpp
../../checkout/clipper/clipper/contrib/sfweight.cpp
../../checkout/clipper/clipper/contrib/skeleton.cpp
../../checkout/clipper/clipper/contrib/test_contrib.cpp
)

set(clipper-contrib_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/originmatch.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/fffear.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/function_object_bases.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/test_contrib.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/sfscale.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/skeleton.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/sfcalc_obs.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/edcalc.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/sfweight.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/convolution_search.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/mapfilter.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/contrib/sfcalc.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper//clipper/clipper-contrib.h
)

target_compile_options(clipper-contrib PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-contrib PROPERTIES PUBLIC_HEADER "${clipper-contrib_HEADERS}")

install(TARGETS clipper-contrib
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/contrib
)
