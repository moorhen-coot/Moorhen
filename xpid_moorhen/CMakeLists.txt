cmake_minimum_required(VERSION 3.13)

project(xpid_moorhen NONE)

set(xpid_moorhen_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/xpid_moorhen)

install(FILES 
     ${xpid_moorhen_src}/config.h
     ${xpid_moorhen_src}/core.h
     ${xpid_moorhen_src}/geometry.h
     ${xpid_moorhen_src}/interface.h
     DESTINATION include/xpid_moorhen
)
