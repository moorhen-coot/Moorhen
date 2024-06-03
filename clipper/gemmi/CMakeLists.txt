project(clipper-gemmi)

add_library(clipper-gemmi STATIC
../../checkout/clipper/clipper/gemmi/clipper_gemmi.cpp
../../checkout/clipper/clipper/gemmi/clipper_gemmi_model.cpp
)

target_link_libraries(clipper-gemmi PRIVATE gemmi_cpp)

set(clipper-gemmi_HEADERS
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/gemmi/clipper_gemmi.h
${CMAKE_CURRENT_SOURCE_DIR}/../../checkout/clipper/clipper/gemmi/clipper_gemmi_model.h
)

target_compile_options(clipper-gemmi PUBLIC "-DFFTW_ENABLE_FLOAT")
set_target_properties(clipper-gemmi PROPERTIES PUBLIC_HEADER "${clipper-gemmi_HEADERS}")

install(TARGETS clipper-gemmi
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/clipper/gemmi
)
