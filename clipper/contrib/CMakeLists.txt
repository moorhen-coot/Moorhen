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

target_include_directories(clipper-contrib PRIVATE ../.. ../../checkout/clipper ../../fftw ../../rfftw)
