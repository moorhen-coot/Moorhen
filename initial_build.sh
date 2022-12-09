#!/bin/sh

SOURCE_DIR=`dirname -- "$( readlink -f -- "$0"; )"`
BUILD_DIR=${PWD}
INSTALL_DIR=${BUILD_DIR}/install

NUMPROCS=8

echo "Sources are in ${SOURCE_DIR}"
echo "Building in ${BUILD_DIR}"
echo "Installing in ${INSTALL_DIR}"

mkdir -p install

#gsl
mkdir -p gsl_build
cd gsl_build
emconfigure ${SOURCE_DIR}/gsl-2.7.1/configure --prefix=${INSTALL_DIR}
emmake make LDFLAGS=-all-static -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#Boost (has to be built in source tree as far as I am aware)
cd ${SOURCE_DIR}/boost
./bootstrap.sh --with-libraries=serialization,regex,chrono,date_time,filesystem,iostreams,program_options,thread,math,random,system
./b2 toolset=emscripten link=static variant=release threading=single runtime-link=static thread system filesystem regex serialization chrono date_time program_options random -j ${NUMPROCS}
./b2 toolset=emscripten link=static variant=release threading=single runtime-link=static install --prefix=${INSTALL_DIR}
cd ${BUILD_DIR}

#RDKit
mkdir -p rdkit_build
cd rdkit_build
emcmake cmake -Dboost_iostreams_DIR=${INSTALL_DIR}/lib/cmake/boost_iostreams-1.80.0/ -Dboost_system_DIR=${INSTALL_DIR}/lib/cmake/boost_system-1.80.0/  -Dboost_headers_DIR=${INSTALL_DIR}/lib/cmake/boost_headers-1.80.0/ -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-1.80.0 -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="-Wno-enum-constexpr-conversion" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/rdkit
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#rvapi
mkdir -p rvapi_build
cd rvapi_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/rvapi
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#Moorhen
mkdir -p moorhen_build
cd moorhen_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}
