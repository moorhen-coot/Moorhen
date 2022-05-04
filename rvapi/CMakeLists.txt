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
