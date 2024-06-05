cmake_minimum_required(VERSION 3.13)
project(fftw)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O2 -Wno-enum-constexpr-conversion -I${CMAKE_INSTALL_PREFIX}/include -pthread")
set(CMAKE_C_FLAGS_RELEASE "-O2")
set(CMAKE_CXX_STANDARD 17)

add_library(fftw STATIC 
../checkout/fftw-2.1.5/fftw/config.c
../checkout/fftw-2.1.5/fftw/executor.c
../checkout/fftw-2.1.5/fftw/fftwf77.c
../checkout/fftw-2.1.5/fftw/fftwnd.c
../checkout/fftw-2.1.5/fftw/fn_1.c
../checkout/fftw-2.1.5/fftw/fn_10.c
../checkout/fftw-2.1.5/fftw/fn_11.c
../checkout/fftw-2.1.5/fftw/fn_12.c
../checkout/fftw-2.1.5/fftw/fn_13.c
../checkout/fftw-2.1.5/fftw/fn_14.c
../checkout/fftw-2.1.5/fftw/fn_15.c
../checkout/fftw-2.1.5/fftw/fn_16.c
../checkout/fftw-2.1.5/fftw/fn_2.c
../checkout/fftw-2.1.5/fftw/fn_3.c
../checkout/fftw-2.1.5/fftw/fn_32.c
../checkout/fftw-2.1.5/fftw/fn_4.c
../checkout/fftw-2.1.5/fftw/fn_5.c
../checkout/fftw-2.1.5/fftw/fn_6.c
../checkout/fftw-2.1.5/fftw/fn_64.c
../checkout/fftw-2.1.5/fftw/fn_7.c
../checkout/fftw-2.1.5/fftw/fn_8.c
../checkout/fftw-2.1.5/fftw/fn_9.c
../checkout/fftw-2.1.5/fftw/fni_1.c
../checkout/fftw-2.1.5/fftw/fni_10.c
../checkout/fftw-2.1.5/fftw/fni_11.c
../checkout/fftw-2.1.5/fftw/fni_12.c
../checkout/fftw-2.1.5/fftw/fni_13.c
../checkout/fftw-2.1.5/fftw/fni_14.c
../checkout/fftw-2.1.5/fftw/fni_15.c
../checkout/fftw-2.1.5/fftw/fni_16.c
../checkout/fftw-2.1.5/fftw/fni_2.c
../checkout/fftw-2.1.5/fftw/fni_3.c
../checkout/fftw-2.1.5/fftw/fni_32.c
../checkout/fftw-2.1.5/fftw/fni_4.c
../checkout/fftw-2.1.5/fftw/fni_5.c
../checkout/fftw-2.1.5/fftw/fni_6.c
../checkout/fftw-2.1.5/fftw/fni_64.c
../checkout/fftw-2.1.5/fftw/fni_7.c
../checkout/fftw-2.1.5/fftw/fni_8.c
../checkout/fftw-2.1.5/fftw/fni_9.c
../checkout/fftw-2.1.5/fftw/ftw_10.c
../checkout/fftw-2.1.5/fftw/ftw_16.c
../checkout/fftw-2.1.5/fftw/ftw_2.c
../checkout/fftw-2.1.5/fftw/ftw_3.c
../checkout/fftw-2.1.5/fftw/ftw_32.c
../checkout/fftw-2.1.5/fftw/ftw_4.c
../checkout/fftw-2.1.5/fftw/ftw_5.c
../checkout/fftw-2.1.5/fftw/ftw_6.c
../checkout/fftw-2.1.5/fftw/ftw_64.c
../checkout/fftw-2.1.5/fftw/ftw_7.c
../checkout/fftw-2.1.5/fftw/ftw_8.c
../checkout/fftw-2.1.5/fftw/ftw_9.c
../checkout/fftw-2.1.5/fftw/ftwi_10.c
../checkout/fftw-2.1.5/fftw/ftwi_16.c
../checkout/fftw-2.1.5/fftw/ftwi_2.c
../checkout/fftw-2.1.5/fftw/ftwi_3.c
../checkout/fftw-2.1.5/fftw/ftwi_32.c
../checkout/fftw-2.1.5/fftw/ftwi_4.c
../checkout/fftw-2.1.5/fftw/ftwi_5.c
../checkout/fftw-2.1.5/fftw/ftwi_6.c
../checkout/fftw-2.1.5/fftw/ftwi_64.c
../checkout/fftw-2.1.5/fftw/ftwi_7.c
../checkout/fftw-2.1.5/fftw/ftwi_8.c
../checkout/fftw-2.1.5/fftw/ftwi_9.c
../checkout/fftw-2.1.5/fftw/generic.c
../checkout/fftw-2.1.5/fftw/malloc.c
../checkout/fftw-2.1.5/fftw/planner.c
../checkout/fftw-2.1.5/fftw/putils.c
../checkout/fftw-2.1.5/fftw/rader.c
../checkout/fftw-2.1.5/fftw/timer.c
../checkout/fftw-2.1.5/fftw/twiddle.c
../checkout/fftw-2.1.5/fftw/wisdom.c
../checkout/fftw-2.1.5/fftw/wisdomio.c
)

set(fftw_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/fftw-2.1.5//fftw/fftw.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/fftw-2.1.5//fftw/fftw-int.h
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/fftw-2.1.5//fftw/config.h
)

target_compile_options(fftw PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(fftw PROPERTIES PUBLIC_HEADER "${fftw_HEADERS}")

install(TARGETS fftw
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/fftw
)

add_library(rfftw STATIC 
../checkout/fftw-2.1.5/rfftw/fcr_1.c
../checkout/fftw-2.1.5/rfftw/fcr_10.c
../checkout/fftw-2.1.5/rfftw/fcr_11.c
../checkout/fftw-2.1.5/rfftw/fcr_12.c
../checkout/fftw-2.1.5/rfftw/fcr_128.c
../checkout/fftw-2.1.5/rfftw/fcr_13.c
../checkout/fftw-2.1.5/rfftw/fcr_14.c
../checkout/fftw-2.1.5/rfftw/fcr_15.c
../checkout/fftw-2.1.5/rfftw/fcr_16.c
../checkout/fftw-2.1.5/rfftw/fcr_2.c
../checkout/fftw-2.1.5/rfftw/fcr_3.c
../checkout/fftw-2.1.5/rfftw/fcr_32.c
../checkout/fftw-2.1.5/rfftw/fcr_4.c
../checkout/fftw-2.1.5/rfftw/fcr_5.c
../checkout/fftw-2.1.5/rfftw/fcr_6.c
../checkout/fftw-2.1.5/rfftw/fcr_64.c
../checkout/fftw-2.1.5/rfftw/fcr_7.c
../checkout/fftw-2.1.5/rfftw/fcr_8.c
../checkout/fftw-2.1.5/rfftw/fcr_9.c
../checkout/fftw-2.1.5/rfftw/fhb_10.c
../checkout/fftw-2.1.5/rfftw/fhb_16.c
../checkout/fftw-2.1.5/rfftw/fhb_2.c
../checkout/fftw-2.1.5/rfftw/fhb_3.c
../checkout/fftw-2.1.5/rfftw/fhb_32.c
../checkout/fftw-2.1.5/rfftw/fhb_4.c
../checkout/fftw-2.1.5/rfftw/fhb_5.c
../checkout/fftw-2.1.5/rfftw/fhb_6.c
../checkout/fftw-2.1.5/rfftw/fhb_7.c
../checkout/fftw-2.1.5/rfftw/fhb_8.c
../checkout/fftw-2.1.5/rfftw/fhb_9.c
../checkout/fftw-2.1.5/rfftw/fhf_10.c
../checkout/fftw-2.1.5/rfftw/fhf_16.c
../checkout/fftw-2.1.5/rfftw/fhf_2.c
../checkout/fftw-2.1.5/rfftw/fhf_3.c
../checkout/fftw-2.1.5/rfftw/fhf_32.c
../checkout/fftw-2.1.5/rfftw/fhf_4.c
../checkout/fftw-2.1.5/rfftw/fhf_5.c
../checkout/fftw-2.1.5/rfftw/fhf_6.c
../checkout/fftw-2.1.5/rfftw/fhf_7.c
../checkout/fftw-2.1.5/rfftw/fhf_8.c
../checkout/fftw-2.1.5/rfftw/fhf_9.c
../checkout/fftw-2.1.5/rfftw/frc_1.c
../checkout/fftw-2.1.5/rfftw/frc_10.c
../checkout/fftw-2.1.5/rfftw/frc_11.c
../checkout/fftw-2.1.5/rfftw/frc_12.c
../checkout/fftw-2.1.5/rfftw/frc_128.c
../checkout/fftw-2.1.5/rfftw/frc_13.c
../checkout/fftw-2.1.5/rfftw/frc_14.c
../checkout/fftw-2.1.5/rfftw/frc_15.c
../checkout/fftw-2.1.5/rfftw/frc_16.c
../checkout/fftw-2.1.5/rfftw/frc_2.c
../checkout/fftw-2.1.5/rfftw/frc_3.c
../checkout/fftw-2.1.5/rfftw/frc_32.c
../checkout/fftw-2.1.5/rfftw/frc_4.c
../checkout/fftw-2.1.5/rfftw/frc_5.c
../checkout/fftw-2.1.5/rfftw/frc_6.c
../checkout/fftw-2.1.5/rfftw/frc_64.c
../checkout/fftw-2.1.5/rfftw/frc_7.c
../checkout/fftw-2.1.5/rfftw/frc_8.c
../checkout/fftw-2.1.5/rfftw/frc_9.c
../checkout/fftw-2.1.5/rfftw/rconfig.c
../checkout/fftw-2.1.5/rfftw/rexec.c
../checkout/fftw-2.1.5/rfftw/rexec2.c
../checkout/fftw-2.1.5/rfftw/rfftwf77.c
../checkout/fftw-2.1.5/rfftw/rfftwnd.c
../checkout/fftw-2.1.5/rfftw/rgeneric.c
../checkout/fftw-2.1.5/rfftw/rplanner.c
)

target_include_directories(rfftw PRIVATE ../checkout/fftw-2.1.5/fftw)

set(rfftw_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../checkout/fftw-2.1.5/rfftw/rfftw.h
)
target_compile_options(rfftw PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(rfftw PROPERTIES PUBLIC_HEADER "${rfftw_HEADERS}")

install(TARGETS rfftw
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/rfftw
)
