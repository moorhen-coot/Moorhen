cmake_minimum_required(VERSION 3.13)
project(rvapi C CXX)

add_library(rvapi STATIC
    ../checkout/rvapi/rvapi/src/rvapi_combobox.cpp   ../checkout/rvapi/rvapi/src/rvapi_panel.cpp
    ../checkout/rvapi/rvapi/src/rvapi_content.cpp    ../checkout/rvapi/rvapi/src/rvapi_plot.cpp
    ../checkout/rvapi/rvapi/src/rvapi_data.cpp       ../checkout/rvapi/rvapi/src/rvapi_progressbar.cpp
    ../checkout/rvapi/rvapi/src/rvapi_docheader.cpp  ../checkout/rvapi/rvapi/src/rvapi_radar.cpp
    ../checkout/rvapi/rvapi/src/rvapi_document.cpp   ../checkout/rvapi/rvapi/src/rvapi_section.cpp
    ../checkout/rvapi/rvapi/src/rvapi_form.cpp       ../checkout/rvapi/rvapi/src/rvapi_tab.cpp
    ../checkout/rvapi/rvapi/src/rvapi_graph.cpp      ../checkout/rvapi/rvapi/src/rvapi_table.cpp
    ../checkout/rvapi/rvapi/src/rvapi_grid.cpp       ../checkout/rvapi/rvapi/src/rvapi_tabledata.cpp
    ../checkout/rvapi/rvapi/src/rvapi_iframe.cpp     ../checkout/rvapi/rvapi/src/rvapi_input.cpp
    ../checkout/rvapi/rvapi/src/rvapi_tasks.cpp
    ../checkout/rvapi/rvapi/src/rvapi_interface.cpp  ../checkout/rvapi/rvapi/src/rvapi_text.cpp
    ../checkout/rvapi/rvapi/src/rvapi_loggraph.cpp   ../checkout/rvapi/rvapi/src/rvapi_treewidget.cpp
    ../checkout/rvapi/rvapi/src/rvapi_fieldset.cpp   ../checkout/rvapi/rvapi/src/rvapi_node.cpp)

message("------------------ ${CMAKE_SOURCE_DIR} ------------------")
set(rvapi_HEADERS
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_progressbar.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_fieldset.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_input.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_section.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_tabledata.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_content.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_loggraph.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_graph.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_global.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_combobox.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_tasks.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_document.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_data.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_treewidget.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_docheader.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_table.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_node.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_grid.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_panel.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_iframe.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_defs.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_plot.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_radar.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_interface.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_text.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_form.h
${CMAKE_SOURCE_DIR}/../checkout/rvapi//rvapi/src/rvapi_tab.h
)

set_target_properties(rvapi PROPERTIES PUBLIC_HEADER "${rvapi_HEADERS}")

install(TARGETS rvapi
LIBRARY DESTINATION lib
PUBLIC_HEADER DESTINATION include/rvapi
)

