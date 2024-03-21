#!/bin/sh

#This script will compile and install Moorhen and its dependencies.
#builing will happen by default in subdirectory CCP4_WASM_BUILD of
#where it is exececuted from. This can be changed below. Moorhen will
#installed (by default) in install/web_packages/baby-gru. The "install"
#part of this can also be changed below.

if command -v greadlink > /dev/null 2>&1; then
    SOURCE_DIR=`dirname -- "$( greadlink -f -- "$0"; )"`
else
    SOURCE_DIR=`dirname -- "$( readlink -f -- "$0"; )"`
fi

BUILD_DIR=${PWD}/CCP4_WASM_BUILD
INSTALL_DIR=${PWD}/install

if [ x`uname -s` = x"Darwin" ]; then
    NUMPROCS=`sysctl -n hw.ncpu`
else
    NUMPROCS=`nproc --all`
fi
echo "Sources are in ${SOURCE_DIR}"
echo "Building in ${BUILD_DIR}"
echo "Installing in ${INSTALL_DIR}"

mkdir -p ${INSTALL_DIR}

#gsl
mkdir -p ${BUILD_DIR}/gsl_build
cd ${BUILD_DIR}/gsl_build
emconfigure ${SOURCE_DIR}/gsl-2.7.1/configure --prefix=${INSTALL_DIR}
emmake make LDFLAGS=-all-static -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#Boost (has to be built in source tree as far as I am aware)
cd ${SOURCE_DIR}/boost
./bootstrap.sh --with-libraries=serialization,regex,chrono,date_time,filesystem,iostreams,program_options,thread,math,random,system
./b2 toolset=emscripten link=static variant=release cxxflags="-pthread" linkflags="-pthread" threading=multi runtime-link=static thread system filesystem regex serialization chrono date_time program_options random -j ${NUMPROCS}
./b2 toolset=emscripten link=static variant=release cxxflags="-pthread" linkflags="-pthread" threading=multi runtime-link=static install --prefix=${INSTALL_DIR}
cd ${BUILD_DIR}

emar q ${INSTALL_DIR}/lib/libboost_chrono.a ${INSTALL_DIR}/lib/libboost_chrono.bc
emar q ${INSTALL_DIR}/lib/libboost_date_time.a ${INSTALL_DIR}/lib/libboost_date_time.bc
emar q ${INSTALL_DIR}/lib/libboost_filesystem.a ${INSTALL_DIR}/lib/libboost_filesystem.bc
emar q ${INSTALL_DIR}/lib/libboost_iostreams.a ${INSTALL_DIR}/lib/libboost_iostreams.bc
emar q ${INSTALL_DIR}/lib/libboost_math_c99.a ${INSTALL_DIR}/lib/libboost_math_c99.bc
emar q ${INSTALL_DIR}/lib/libboost_math_c99f.a ${INSTALL_DIR}/lib/libboost_math_c99f.bc
emar q ${INSTALL_DIR}/lib/libboost_math_c99l.a ${INSTALL_DIR}/lib/libboost_math_c99l.bc
emar q ${INSTALL_DIR}/lib/libboost_math_tr1.a ${INSTALL_DIR}/lib/libboost_math_tr1.bc
emar q ${INSTALL_DIR}/lib/libboost_math_tr1f.a ${INSTALL_DIR}/lib/libboost_math_tr1f.bc
emar q ${INSTALL_DIR}/lib/libboost_math_tr1l.a ${INSTALL_DIR}/lib/libboost_math_tr1l.bc
emar q ${INSTALL_DIR}/lib/libboost_program_options.a ${INSTALL_DIR}/lib/libboost_program_options.bc
emar q ${INSTALL_DIR}/lib/libboost_random.a ${INSTALL_DIR}/lib/libboost_random.bc
emar q ${INSTALL_DIR}/lib/libboost_regex.a ${INSTALL_DIR}/lib/libboost_regex.bc
emar q ${INSTALL_DIR}/lib/libboost_serialization.a ${INSTALL_DIR}/lib/libboost_serialization.bc
emar q ${INSTALL_DIR}/lib/libboost_system.a ${INSTALL_DIR}/lib/libboost_system.bc
emar q ${INSTALL_DIR}/lib/libboost_wserialization.a ${INSTALL_DIR}/lib/libboost_wserialization.bc
emar q ${INSTALL_DIR}/lib/libboost_thread.a ${INSTALL_DIR}/lib/libboost_thread.bc

#RDKit
mkdir -p ${BUILD_DIR}/rdkit_build
cd ${BUILD_DIR}/rdkit_build
emcmake cmake -Dboost_iostreams_DIR=${INSTALL_DIR}/lib/cmake/boost_iostreams-1.83.0/ -Dboost_system_DIR=${INSTALL_DIR}/lib/cmake/boost_system-1.83.0/  -Dboost_headers_DIR=${INSTALL_DIR}/lib/cmake/boost_headers-1.83.0/ -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-1.83.0 -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="-s USE_PTHREADS=1 -pthread -Wno-enum-constexpr-conversion -D_HAS_AUTO_PTR_ETC=0" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/rdkit -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_INSTALL_COMIC_FONTS=OFF
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#gemmi
mkdir -p ${BUILD_DIR}/gemmi_build
cd ${BUILD_DIR}/gemmi_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/gemmi
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#jsoncpp
mkdir -p ${BUILD_DIR}/jsoncpp_build
cd ${BUILD_DIR}/jsoncpp_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/checkout/jsoncpp -DJSONCPP_WITH_TESTS=OFF
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#igraph
mkdir -p ${BUILD_DIR}/igraph_build
cd ${BUILD_DIR}/igraph_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/checkout/igraph -DCMAKE_CXX_FLAGS="-pthread" -DCMAKE_C_FLAGS="-pthread"
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#Moorhen
mkdir -p ${BUILD_DIR}/moorhen_build
cd ${BUILD_DIR}/moorhen_build
emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

cd ${SOURCE_DIR}/baby-gru/
npm install
cd ${BUILD_DIR}

#*This link must be removed before building electron app!*
#Links cause confusion in Linux/Mac, and are followed on Windows making huge packages that take forever to build.
cd ${SOURCE_DIR}/baby-gru/public/baby-gru
ln -s ${SOURCE_DIR}/checkout/monomers
