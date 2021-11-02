project(clipper-contrib)

add_library(clipper-contrib STATIC 
convolution_search.cpp
edcalc.cpp
fffear.cpp
function_object_bases.cpp
mapfilter.cpp
originmatch.cpp
sfcalc.cpp
sfcalc_obs.cpp
sfscale.cpp
sfweight.cpp
skeleton.cpp
test_contrib.cpp
)

target_include_directories(clipper-contrib PRIVATE ../.. .. ../../fftw ../../rfftw)
