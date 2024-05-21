#!/bin/sh

#This script will compile and install Moorhen and its dependencies.
#builing will happen by default in subdirectory CCP4_WASM_BUILD of
#where it is exececuted from. This can be changed below. Moorhen will
#installed (by default) in install/web_packages/baby-gru. The "install"
#part of this can also be changed below.

if command -v greadlink > /dev/null 2>&1; then
    MOORHEN_SOURCE_DIR=`dirname -- "$( greadlink -f -- "$0"; )"`
else
    MOORHEN_SOURCE_DIR=`dirname -- "$( readlink -f -- "$0"; )"`
fi

if [ x`uname -s` = x"Darwin" ]; then
    NUMPROCS=`sysctl -n hw.ncpu`
else
    NUMPROCS=`nproc --all`
fi


BUILD_DIR=${PWD}/CCP4_WASM_BUILD
INSTALL_DIR=${PWD}/install

echo "Sources are in ${MOORHEN_SOURCE_DIR}"
echo "Building in ${BUILD_DIR}"
echo "Installing in ${INSTALL_DIR}"

mkdir -p ${BUILD_DIR}
mkdir -p ${INSTALL_DIR}

MEMORY64=0

if [ x"$1" = x"--64bit" ]; then
   MEMORY64=1
   shift
   MODULES=$*
elif [ x"$1" = x"--clear" ]; then
   shift
   CLEAR_MODULES=$*
else
   MODULES=$*
fi

if [ x"$CLEAR_MODULES" = x"" ]; then
    :
else
    for mod in $CLEAR_MODULES; do
        case $mod in
           boost) echo "Clear boost"
               rm -rf ${BUILD_DIR}/boost
               rm -rf ${INSTALL_DIR}/include/boost
               ;;
           gemmi) echo "Clear gemmi"
               rm -rf ${BUILD_DIR}/gemmi_build
               rm -rf ${INSTALL_DIR}/include/gemmi
               ;;
           gsl) echo "Clear gsl"
               rm -rf ${BUILD_DIR}/gsl_build
               rm -rf ${INSTALL_DIR}/include/gsl
               ;;
           igraph) echo "Clear igraph"
               rm -rf ${BUILD_DIR}/igraph_build
               rm -rf ${INSTALL_DIR}/include/igraph
               ;;
           jsoncpp) echo "Clear jsoncpp"
               rm -rf ${BUILD_DIR}/jsoncpp_build
               rm -rf ${INSTALL_DIR}/include/json
               ;;
           rdkit) echo "Clear rdkit"
               rm -rf ${BUILD_DIR}/rdkit_build
               rm -rf ${INSTALL_DIR}/include/rdkit
               ;;
           moorhen) echo "Clear moorhen"
               rm -rf ${BUILD_DIR}/moorhen_build
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/wasm
               ;;
        esac
        done
    exit
fi

# Create an empty file silly.c and then compile it with USE_ZLIB and USE_LIBPNG to force emsdk to get zlib/png.
echo "Attempting to get emsdk zlib/png ports"
echo
echo "" > silly.c
emcc silly.c -s USE_ZLIB=1 -s USE_LIBPNG=1 -s USE_FREETYPE=1 -pthread -sMEMORY64=1 -Wno-experimental
emcc silly.c -s USE_ZLIB=1 -s USE_LIBPNG=1 -s USE_FREETYPE=1 -pthread
rm -f silly.c
rm -f a.out.js
rm -f a.out.wasm
rm -f a.out.worker.js

if test x"${MEMORY64}" = x"1"; then
    echo "#######################################################"
    echo "Building ** 64-bit ** (large memory) version of Moorhen"
    echo "#######################################################"
    echo
    MOORHEN_CMAKE_FLAGS="-sMEMORY64=1 -pthread"
else
    echo "########################################"
    echo "Building ** 32-bit ** version of Moorhen"
    echo "########################################"
    echo
    MOORHEN_CMAKE_FLAGS="-pthread"
fi

BUILD_GSL=false
BUILD_BOOST=false
BUILD_IGRAPH=false
BUILD_GEMMI=false
BUILD_JSONCPP=false
BUILD_RDKIT=false
BUILD_GRAPHENE=false
BUILD_LIBSIGCPP=false
BUILD_MOORHEN=false

if test -d ${INSTALL_DIR}/include/gsl; then
    true
else
    BUILD_GSL=true
fi

if test -d ${INSTALL_DIR}/include/boost; then
    true
else
    BUILD_BOOST=true
fi

if test -d ${INSTALL_DIR}/include/gemmi; then
    true
else
    BUILD_GEMMI=true
fi

if test -d ${INSTALL_DIR}/include/rdkit; then
    true
else
    BUILD_RDKIT=true
fi

if test -d ${INSTALL_DIR}/include/igraph; then
    true
else
    BUILD_IGRAPH=true
fi

if test -d ${INSTALL_DIR}/include/json; then
    true
else
    BUILD_JSONCPP=true
fi

if test -r ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/wasm/moorhen.wasm; then
    true
else
    BUILD_MOORHEN=true
fi

if test -d ${INSTALL_DIR}/include/graphene-1.0; then
    true
else
    BUILD_GRAPHENE=true
fi

if test -d ${INSTALL_DIR}/include/sigc++-3.0; then
    true
else
    BUILD_LIBSIGCPP=true
fi

for mod in $MODULES; do
    case $mod in
       boost) echo "Force build boost"
       BUILD_BOOST=true
       ;;
       gemmi) echo "Force build gemmi"
       BUILD_GEMMI=true
       ;;
       gsl) echo "Force build gsl"
       BUILD_GSL=true
       ;;
       igraph) echo "Force build igraph"
       BUILD_IGRAPH=true
       ;;
       jsoncpp) echo "Force build jsoncpp"
       BUILD_JSONCPP=true
       ;;
       rdkit) echo "Force build rdkit"
       BUILD_RDKIT=true
       ;;
       moorhen) echo "Force build moorhen"
       BUILD_MOORHEN=true
       ;;
    esac
done

echo "BUILD_GSL     " $BUILD_GSL
echo "BUILD_BOOST   " $BUILD_BOOST
echo "BUILD_IGRAPH  " $BUILD_IGRAPH
echo "BUILD_GEMMI   " $BUILD_GEMMI
echo "BUILD_JSONCPP " $BUILD_JSONCPP
echo "BUILD_RDKIT   " $BUILD_RDKIT
echo "BUILD_MOORHEN " $BUILD_MOORHEN

#gsl
if [ $BUILD_GSL = true ]; then
    mkdir -p ${BUILD_DIR}/gsl_build
    cd ${BUILD_DIR}/gsl_build
    emconfigure ${MOORHEN_SOURCE_DIR}/gsl-2.7.1/configure --prefix=${INSTALL_DIR}
    emmake make LDFLAGS=-all-static -j ${NUMPROCS} CXXFLAGS="${MOORHEN_CMAKE_FLAGS}" CFLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make install
fi

#boost with cmake
if [ $BUILD_BOOST = true ]; then
    mkdir -p ${BUILD_DIR}/boost
    cd ${BUILD_DIR}/boost
    emcmake cmake -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/boost-1.83.0 -DBOOST_EXCLUDE_LIBRARIES="context;fiber;fiber_numa;asio;log;coroutine;cobalt;nowide"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#RDKit
if [ $BUILD_RDKIT = true ]; then
    BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-1.83.0}; k=${j#${INSTALL_DIR}/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
    mkdir -p ${BUILD_DIR}/rdkit_build
    cd ${BUILD_DIR}/rdkit_build
    emcmake cmake -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-1.83.0 ${BOOST_CMAKE_STUFF} -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -Wno-enum-constexpr-conversion -D_HAS_AUTO_PTR_ETC=0" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/rdkit -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_INSTALL_COMIC_FONTS=OFF -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#gemmi
if [ $BUILD_GEMMI = true ]; then
    mkdir -p ${BUILD_DIR}/gemmi_build
    cd ${BUILD_DIR}/gemmi_build
    emcmake cmake  -DCMAKE_EXE_LINKER_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/gemmi
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#jsoncpp
if [ $BUILD_JSONCPP = true ]; then
    mkdir -p ${BUILD_DIR}/jsoncpp_build
    cd ${BUILD_DIR}/jsoncpp_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/jsoncpp -DJSONCPP_WITH_TESTS=OFF -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#igraph
if [ $BUILD_IGRAPH = true ]; then
    mkdir -p ${BUILD_DIR}/igraph_build
    cd ${BUILD_DIR}/igraph_build
    if test x"${MEMORY64}" = x"1"; then
#There is some hoop-jumping to make igraph compile with "-sMEMORY64=1 -pthread"
        emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/igraph -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DIEEE754_DOUBLE_ENDIANNESS_MATCHES=ON -DF2C_EXTERNAL_ARITH_HEADER=${MOORHEN_SOURCE_DIR}/include/igraph_f2c_arith_64.h
        emmake make -j ${NUMPROCS} C_FLAGS="${MOORHEN_CMAKE_FLAGS} -Wno-error=experimental" CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -Wno-error=experimental"
    else
        emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/igraph -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
        emmake make -j ${NUMPROCS}
    fi
    emmake make install
fi

#Moorhen
if [ $BUILD_MOORHEN = true ]; then
    mkdir -p ${BUILD_DIR}/moorhen_build
    cd ${BUILD_DIR}/moorhen_build
    emcmake cmake -DMEMORY64=${MEMORY64} -DCMAKE_EXE_LINKER_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/
    npm install
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru
    ln -s ${MOORHEN_SOURCE_DIR}/checkout/monomers
fi
