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

MEMORY64=0

optspec=":-"
while getopts ':-:' OPT; do
  case $OPT in
    -) #long option
       case $OPTARG in
         64bit) MEMORY64=1;;
         *) echo unknown long option: $OPTARG;;
       esac;;
    *) echo unknown short option: $OPTARG;;
  esac
done

if test x"${MEMORY64}" = x"1"; then
    echo "#######################################################"
    echo "#######################################################"
    echo "Building ** 64-bit ** (large memory) version of Moorhen"
    echo "#######################################################"
    echo "#######################################################"
    echo
    echo
else
    echo "########################################"
    echo "########################################"
    echo "Building ** 32-bit ** version of Moorhen"
    echo "########################################"
    echo "########################################"
    echo
    echo
fi

mkdir -p ${INSTALL_DIR}

#gsl
mkdir -p ${BUILD_DIR}/gsl_build
cd ${BUILD_DIR}/gsl_build
emconfigure ${SOURCE_DIR}/gsl-2.7.1/configure --prefix=${INSTALL_DIR}
emmake make LDFLAGS=-all-static -j ${NUMPROCS} CXXFLAGS="-s USE_PTHREADS=1 -pthread -sMEMORY64=${MEMORY64}" CFLAGS="-s USE_PTHREADS=1 -pthread -sMEMORY64=${MEMORY64}"
emmake make install
cd ${BUILD_DIR}

#boost with cmake
mkdir -p ${BUILD_DIR}/boost
cd ${BUILD_DIR}/boost
emcmake cmake -DCMAKE_C_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_CXX_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/checkout/boost-1.83.0 -DBOOST_EXCLUDE_LIBRARIES="context;fiber;fiber_numa;asio;log;coroutine;cobalt;nowide"
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#RDKit
BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-1.83.0}; k=${j#/Users/stuart/Moorhen-64/install/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
mkdir -p ${BUILD_DIR}/rdkit_build
cd ${BUILD_DIR}/rdkit_build
emcmake cmake -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-1.83.0 ${BOOST_CMAKE_STUFF} -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="-s USE_PTHREADS=1 -sMEMORY64=${MEMORY64} -pthread -Wno-enum-constexpr-conversion -D_HAS_AUTO_PTR_ETC=0" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/rdkit -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_INSTALL_COMIC_FONTS=OFF -D CMAKE_C_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -D CMAKE_CXX_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#gemmi
mkdir -p ${BUILD_DIR}/gemmi_build
cd ${BUILD_DIR}/gemmi_build
emcmake cmake  -DCMAKE_EXE_LINKER_FLAGS="-s USE_PTHREADS=1 -pthread -sMEMORY64=${MEMORY64}" -DCMAKE_C_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_CXX_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}/gemmi
emmake make -j ${NUMPROCS}
emmake make install
cd ${BUILD_DIR}

#Moorhen
mkdir -p ${BUILD_DIR}/moorhen_build
cd ${BUILD_DIR}/moorhen_build
emcmake cmake -DMEMORY64=${MEMORY64} -DCMAKE_EXE_LINKER_FLAGS="-s USE_PTHREADS=1 -pthread -sMEMORY64=${MEMORY64}" -DCMAKE_C_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_CXX_FLAGS="-sMEMORY64=${MEMORY64} -pthread" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${SOURCE_DIR}
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
