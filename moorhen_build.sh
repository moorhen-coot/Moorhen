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

source ./VERSIONS


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
           all) echo "Clear all"
               rm -rf ${BUILD_DIR}/boost
               rm -rf ${INSTALL_DIR}/include/boost
               rm -rf ${BUILD_DIR}/gemmi_build
               rm -rf ${INSTALL_DIR}/include/gemmi
               rm -rf ${BUILD_DIR}/gsl_build
               rm -rf ${INSTALL_DIR}/include/gsl
               rm -rf ${BUILD_DIR}/igraph_build
               rm -rf ${INSTALL_DIR}/include/igraph
               rm -rf ${BUILD_DIR}/jsoncpp_build
               rm -rf ${INSTALL_DIR}/include/json
               rm -rf ${BUILD_DIR}/rdkit_build
               rm -rf ${INSTALL_DIR}/include/rdkit
               rm -rf ${BUILD_DIR}/eigen_build
               rm -rf ${INSTALL_DIR}/include/eigen3
               rm -rf ${BUILD_DIR}/moorhen_build
               rm -rf ${BUILD_DIR}/ccp4_build
               rm -rf ${INSTALL_DIR}/include/ccp4
               rm -rf ${BUILD_DIR}/fftw_build
               rm -rf ${INSTALL_DIR}/include/fftw
               rm -rf ${INSTALL_DIR}/include/rfftw
               rm -rf ${BUILD_DIR}/mmdb2_build
               rm -rf ${INSTALL_DIR}/include/mmdb2
               rm -rf ${BUILD_DIR}/clipper_build
               rm -rf ${INSTALL_DIR}/include/clipper
               rm -rf ${BUILD_DIR}/privateer_build
               rm -rf ${INSTALL_DIR}/include/privateer
               rm -rf ${BUILD_DIR}/ssm_build
               rm -rf ${INSTALL_DIR}/include/ssm
               rm -rf ${BUILD_DIR}/slicendice_cpp_build
               rm -rf ${INSTALL_DIR}/include/slicendice_cpp
               rm -rf ${BUILD_DIR}/libsigcplusplus_build
               rm -rf ${INSTALL_DIR}/include/sigc++-3.0
               rm -rf ${BUILD_DIR}/graphene_build
               rm -rf ${INSTALL_DIR}/include/graphene-1.0
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.wasm
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.data
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.worker.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/web_example.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/web_example.wasm
               rm -rf ${INSTALL_DIR}/lib/libboost*.a
               rm -rf ${INSTALL_DIR}/lib/cmake/boost*
               rm -rf ${INSTALL_DIR}/lib/cmake/Boost*
               rm -rf ${INSTALL_DIR}/lib/libRDKit*.a
               rm -rf ${INSTALL_DIR}/lib/cmake/rdkit
               rm -rf ${INSTALL_DIR}/lib/libclipper*.a
               rm -rf ${INSTALL_DIR}/lib/libgsl*.a
               rm -rf ${INSTALL_DIR}/lib/libgsl*.la
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/gsl.pc
               rm -rf ${INSTALL_DIR}/lib/libigraph.a
               rm -rf ${INSTALL_DIR}/lib/cmake/igraph
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/igraph.pc
               rm -rf ${INSTALL_DIR}/lib/libjsoncpp.a
               rm -rf ${INSTALL_DIR}/lib/cmake/jsoncpp
               rm -rf ${INSTALL_DIR}/lib/objects-Release/jsoncpp_object/
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/jsoncpp.pc
               rm -rf ${INSTALL_DIR}/lib/libgemmi_cpp.a
               rm -rf ${INSTALL_DIR}/lib/libmmdb2.a
               rm -rf ${INSTALL_DIR}/lib/libprivateer.a
               rm -rf ${INSTALL_DIR}/lib/libgraphene-1.0.a
               rm -rf ${INSTALL_DIR}/lib/graphene-1.0
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/graphene-1.0.pc
               rm -rf ${INSTALL_DIR}/lib/libsigc-3.0.a
               rm -rf ${INSTALL_DIR}/lib/sigc++-3.0
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/sigc++-3.0.pc
               rm -rf ${INSTALL_DIR}/lib/libccp4.a
               rm -rf ${INSTALL_DIR}/lib/libslicendice_cpp.a
               rm -rf ${INSTALL_DIR}/lib/libssm.a
               rm -rf ${INSTALL_DIR}/lib/libfftw.a
               rm -rf ${INSTALL_DIR}/lib/librfftw.a
               rm -rf ${INSTALL_DIR}/bin/gsl-config
               rm -rf ${INSTALL_DIR}/bin/gsl-histogram
               rm -rf ${INSTALL_DIR}/bin/gsl-randist
               ;;
           boost) echo "Clear boost"
               rm -rf ${BUILD_DIR}/boost
               rm -rf ${INSTALL_DIR}/include/boost
               rm -rf ${INSTALL_DIR}/lib/libboost*.a
               rm -rf ${INSTALL_DIR}/lib/cmake/boost*
               rm -rf ${INSTALL_DIR}/lib/cmake/Boost*
               ;;
           gemmi) echo "Clear gemmi"
               rm -rf ${BUILD_DIR}/gemmi_build
               rm -rf ${INSTALL_DIR}/include/gemmi
               rm -rf ${INSTALL_DIR}/lib/libgemmi_cpp.a
               ;;
           gsl) echo "Clear gsl"
               rm -rf ${BUILD_DIR}/gsl_build
               rm -rf ${INSTALL_DIR}/include/gsl
               rm -rf ${INSTALL_DIR}/lib/libgsl*.a
               rm -rf ${INSTALL_DIR}/lib/libgsl*.la
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/gsl.pc
               rm -rf ${INSTALL_DIR}/bin/gsl-config
               rm -rf ${INSTALL_DIR}/bin/gsl-histogram
               rm -rf ${INSTALL_DIR}/bin/gsl-randist
               ;;
           igraph) echo "Clear igraph"
               rm -rf ${BUILD_DIR}/igraph_build
               rm -rf ${INSTALL_DIR}/include/igraph
               rm -rf ${INSTALL_DIR}/lib/libigraph.a
               rm -rf ${INSTALL_DIR}/lib/cmake/igraph
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/igraph.pc
               ;;
           jsoncpp) echo "Clear jsoncpp"
               rm -rf ${BUILD_DIR}/jsoncpp_build
               rm -rf ${INSTALL_DIR}/include/json
               rm -rf ${INSTALL_DIR}/lib/libjsoncpp.a
               rm -rf ${INSTALL_DIR}/lib/cmake/jsoncpp
               rm -rf ${INSTALL_DIR}/lib/objects-Release/jsoncpp_object/
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/jsoncpp.pc
               ;;
           rdkit) echo "Clear rdkit"
               rm -rf ${BUILD_DIR}/rdkit_build
               rm -rf ${INSTALL_DIR}/include/rdkit
               rm -rf ${INSTALL_DIR}/lib/libRDKit*.a
               rm -rf ${INSTALL_DIR}/lib/cmake/rdkit
               ;;
           eigen) echo "Clear eigen"
               rm -rf ${BUILD_DIR}/eigen_build
               rm -rf ${INSTALL_DIR}/include/eigen3
               ;;
           libccp4) echo "clear libccp4"
               rm -rf ${BUILD_DIR}/ccp4_build
               rm -rf ${INSTALL_DIR}/include/ccp4
               rm -rf ${INSTALL_DIR}/lib/libccp4.a
               ;;
           fftw) echo "clear fftw"
               rm -rf ${BUILD_DIR}/fftw_build
               rm -rf ${INSTALL_DIR}/include/fftw
               rm -rf ${INSTALL_DIR}/include/rfftw
               rm -rf ${INSTALL_DIR}/lib/libfftw.a
               rm -rf ${INSTALL_DIR}/lib/librfftw.a
               ;;
           mmdb2) echo "clear mmdb2"
               rm -rf ${BUILD_DIR}/mmdb2_build
               rm -rf ${INSTALL_DIR}/include/mmdb2
               rm -rf ${INSTALL_DIR}/lib/libmmdb2.a
               ;;
           clipper) echo "clear clipper"
               rm -rf ${BUILD_DIR}/clipper_build
               rm -rf ${INSTALL_DIR}/include/clipper
               rm -rf ${INSTALL_DIR}/lib/libclipper*.a
               ;;
           privateer) echo "clear privateer"
               rm -rf ${BUILD_DIR}/privateer_build
               rm -rf ${INSTALL_DIR}/include/privateer
               rm -rf ${INSTALL_DIR}/lib/libprivateer.a
               ;;
           ssm) echo "clear ssm"
               rm -rf ${BUILD_DIR}/ssm_build
               rm -rf ${INSTALL_DIR}/include/ssm
               rm -rf ${INSTALL_DIR}/lib/libssm.a
               ;;
           slicendice) echo "clear slicendice"
               rm -rf ${BUILD_DIR}/slicendice_cpp_build
               rm -rf ${INSTALL_DIR}/include/slicendice_cpp
               rm -rf ${INSTALL_DIR}/lib/libslicendice_cpp.a
               ;;
           sigcpp) echo "clear sigc++"
               rm -rf ${BUILD_DIR}/libsigcplusplus_build
               rm -rf ${INSTALL_DIR}/include/sigc++-3.0
               rm -rf ${INSTALL_DIR}/lib/libsigc-3.0.a
               rm -rf ${INSTALL_DIR}/lib/sigc++-3.0
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/sigc++-3.0.pc
               ;;
           graphene) echo "clear graphene"
               rm -rf ${BUILD_DIR}/graphene_build
               rm -rf ${INSTALL_DIR}/include/graphene-1.0
               rm -rf ${INSTALL_DIR}/lib/libgraphene-1.0.a
               rm -rf ${INSTALL_DIR}/lib/graphene-1.0
               rm -rf ${INSTALL_DIR}/lib/pkgconfig/graphene-1.0.pc
               ;;
           moorhen) echo "Clear moorhen"
               rm -rf ${BUILD_DIR}/moorhen_build
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.wasm
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.data
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.worker.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/web_example.js
               rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/web_example.wasm
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
BUILD_LIBEIGEN=false
BUILD_MOORHEN=false
BUILD_LIBCCP4=false
BUILD_FFTW=false
BUILD_MMDB2=false
BUILD_CLIPPER=false
BUILD_PRIVATEER=false
BUILD_SSM=false
BUILD_SLICENDICE=false

if test -d ${INSTALL_DIR}/include/slicendice_cpp; then
    true
else
    BUILD_SLICENDICE=true
fi

if test -d ${INSTALL_DIR}/include/ssm; then
    true
else
    BUILD_SSM=true
fi

if test -d ${INSTALL_DIR}/include/privateer; then
    true
else
    BUILD_PRIVATEER=true
fi

if test -d ${INSTALL_DIR}/include/clipper; then
    true
else
    BUILD_CLIPPER=true
fi

if test -d ${INSTALL_DIR}/include/mmdb2; then
    true
else
    BUILD_MMDB2=true
fi

if test -d ${INSTALL_DIR}/include/rfftw; then
    true
else
    BUILD_FFTW=true
fi

if test -d ${INSTALL_DIR}/include/ccp4; then
    true
else
    BUILD_LIBCCP4=true
fi

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

if test -r ${INSTALL_DIR}/include/eigen3; then
    true
else
    BUILD_LIBEIGEN=true
fi

if test -r ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru/moorhen.wasm; then
    true
else
    BUILD_MOORHEN=true
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
       eigen) echo "Force build eigen"
       BUILD_LIBEIGEN=true
       ;;
       libccp4) echo "Force build libccp4"
       BUILD_LIBCCP4=true
       ;;
       fftw) echo "Force build fftw"
       BUILD_FFTW=true
       ;;
       mmdb2) echo "Force build mmdb2"
       BUILD_MMDB2=true
       ;;
       clipper) echo "Force build clipper"
       BUILD_CLIPPER=true
       ;;
       privateer) echo "Force build privateer"
       BUILD_PRIVATEER=true
       ;;
       ssm) echo "Force build ssm"
       BUILD_SSM=true
       ;;
       slicendice) echo "Force build slicendice"
       BUILD_SLICENDICE=true
       ;;
       moorhen) echo "Force build moorhen"
       BUILD_MOORHEN=true
       ;;
    esac
done

echo "BUILD_GSL        " $BUILD_GSL
echo "BUILD_BOOST      " $BUILD_BOOST
echo "BUILD_IGRAPH     " $BUILD_IGRAPH
echo "BUILD_GEMMI      " $BUILD_GEMMI
echo "BUILD_JSONCPP    " $BUILD_JSONCPP
echo "BUILD_RDKIT      " $BUILD_RDKIT
echo "BUILD_GRAPHENE   " $BUILD_GRAPHENE
echo "BUILD_LIBSIGCPP  " $BUILD_LIBSIGCPP
echo "BUILD_LIBEIGEN   " $BUILD_LIBEIGEN
echo "BUILD_LIBCCP4    " $BUILD_LIBCCP4
echo "BUILD_FFTW       " $BUILD_FFTW
echo "BUILD_MMDB2      " $BUILD_MMDB2
echo "BUILD_CLIPPER    " $BUILD_CLIPPER
echo "BUILD_PRIVATEER  " $BUILD_PRIVATEER
echo "BUILD_SSM        " $BUILD_SSM
echo "BUILD_SLICENDICE " $BUILD_SLICENDICE
echo "BUILD_MOORHEN    " $BUILD_MOORHEN

#eigen
if [ $BUILD_LIBEIGEN = true ]; then
    mkdir -p ${BUILD_DIR}/eigen_build
    cd ${BUILD_DIR}/eigen_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/eigen-$libeigen_release
    make install
fi

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
    emcmake cmake -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/boost-$boost_release -DBOOST_EXCLUDE_LIBRARIES="context;fiber;fiber_numa;asio;log;coroutine;cobalt;nowide"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#RDKit
if [ $BUILD_RDKIT = true ]; then
    BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-$boost_release}; k=${j#${INSTALL_DIR}/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
    mkdir -p ${BUILD_DIR}/rdkit_build
    cd ${BUILD_DIR}/rdkit_build
    emcmake cmake -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-$boost_release ${BOOST_CMAKE_STUFF} -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_STACKTRACE=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -Wno-enum-constexpr-conversion -D_HAS_AUTO_PTR_ETC=0" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/rdkit -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_INSTALL_COMIC_FONTS=OFF -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake
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

# Setup for meson
if [ $BUILD_LIBSIGCPP = true ] || [ $BUILD_GRAPHENE = true ]; then
    cd ${BUILD_DIR}


    export CHOST="wasm32-unknown-linux"
    export ax_cv_c_float_words_bigendian=no

    export MESON_CROSS="${BUILD_DIR}/emscripten-crossfile.meson"

    cat > "${BUILD_DIR}/emscripten-crossfile.meson" <<END
[binaries]
c = 'emcc'
cpp = 'em++'
ld = 'wasm-ld'
ar = 'emar'
ranlib = 'emranlib'
pkgconfig = ['emconfigure', 'pkg-config']

# https://docs.gtk.org/glib/cross-compiling.html#cross-properties
[properties]
growing_stack = true
have_c99_vsnprintf = true
have_c99_snprintf = true
have_unix98_printf = true

# Ensure that '-s PTHREAD_POOL_SIZE=*' is not injected into .pc files
[built-in options]
c_thread_count = 0
cpp_thread_count = 0

[host_machine]
system = 'emscripten'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'
END

    export EM_PKG_CONFIG_PATH=${INSTALL_DIR}/lib/pkgconfig/
    export PKG_CONFIG_PATH=${INSTALL_DIR}/lib/pkgconfig/
    export EM_PKG_CONFIG_LIBDIR=${INSTALL_DIR}/lib/
    export PKG_CONFIG_LIBDIR=${INSTALL_DIR}/lib/
fi

# Graphene
if [ $BUILD_GRAPHENE = true ]; then
    pushd ${MOORHEN_SOURCE_DIR}/checkout/graphene-$graphene_release/
    CFLAGS="-s USE_PTHREADS $MOORHEN_CMAKE_FLAGS" LDFLAGS=" -lpthread $MOORHEN_CMAKE_FLAGS" meson setup ${BUILD_DIR}/graphene_build \
        --prefix=${INSTALL_DIR} \
        --cross-file=$MESON_CROSS \
        --default-library=static \
        --buildtype=release \
        -Dtests=false && \
        meson install -C ${BUILD_DIR}/graphene_build
        popd
fi

# Libsigc++
if [ $BUILD_LIBSIGCPP = true ]; then
    pushd ${MOORHEN_SOURCE_DIR}/checkout/libsigcplusplus-$libsigcpp_release/
    meson setup ${BUILD_DIR}/libsigcplusplus_build \
        --prefix=${INSTALL_DIR} \
        --libdir=lib \
        --cross-file=$MESON_CROSS \
        --default-library=static \
        -Dc_link_args="-pthread $MOORHEN_CMAKE_FLAGS" \
        -Dcpp_link_args="-pthread $MOORHEN_CMAKE_FLAGS" \
        -Dcpp_args="-s USE_PTHREADS=1 $MOORHEN_CMAKE_FLAGS" \
        --buildtype=release \
        -Dbuild-tests=false && \
        meson install -C ${BUILD_DIR}/libsigcplusplus_build
        popd
    
fi

#ccp4
if [ $BUILD_LIBCCP4 = true ]; then
    mkdir -p ${BUILD_DIR}/ccp4_build
    cd ${BUILD_DIR}/ccp4_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/ccp4 -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#fftw
if [ $BUILD_FFTW = true ]; then
    mkdir -p ${BUILD_DIR}/fftw_build
    cd ${BUILD_DIR}/fftw_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/fftw  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#mmdb2
if [ $BUILD_MMDB2 = true ]; then
    mkdir -p ${BUILD_DIR}/mmdb2_build
    cd ${BUILD_DIR}/mmdb2_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/mmdb2  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#clipper
if [ $BUILD_CLIPPER = true ]; then
    mkdir -p ${BUILD_DIR}/clipper_build
    cd ${BUILD_DIR}/clipper_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/clipper -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#privateer
if [ $BUILD_PRIVATEER = true ]; then
    mkdir -p ${BUILD_DIR}/privateer_build
    cd ${BUILD_DIR}/privateer_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/privateer  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#ssm
if [ $BUILD_SSM = true ]; then
    mkdir -p ${BUILD_DIR}/ssm_build
    cd ${BUILD_DIR}/ssm_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/ssm  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#slicendice_cpp
if [ $BUILD_SLICENDICE = true ]; then
    mkdir -p ${BUILD_DIR}/slicendice_cpp_build
    cd ${BUILD_DIR}/slicendice_cpp_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/slicendice_cpp  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install
fi

#Moorhen
if [ $BUILD_MOORHEN = true ]; then
    BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-$boost_release}; k=${j#${INSTALL_DIR}/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
    mkdir -p ${BUILD_DIR}/moorhen_build
    cd ${BUILD_DIR}/moorhen_build
    emcmake cmake -DMEMORY64=${MEMORY64} -DCMAKE_EXE_LINKER_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include -I${INSTALL_DIR}/include/fftw -I${INSTALL_DIR}/include/rfftw -I${INSTALL_DIR}/include/eigen3 -I${INSTALL_DIR}/include/ssm -I${MOORHEN_SOURCE_DIR}/checkout/glm-0.9.9.8 -I${INSTALL_DIR}/include/privateer -I${INSTALL_DIR}/include/privateer/pybind11" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include -I${INSTALL_DIR}/include/fftw -I${INSTALL_DIR}/include/rfftw -I${INSTALL_DIR}/include/eigen3 -I${INSTALL_DIR}/include/ssm -I${MOORHEN_SOURCE_DIR}/checkout/glm-0.9.9.8 -I${INSTALL_DIR}/include/privateer -I${INSTALL_DIR}/include/privateer/pybind11" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR} -DCMAKE_PREFIX_PATH=${INSTALL_DIR} -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake -DRDKit_DIR=${INSTALL_DIR}/lib/cmake/rdkit -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include/boost -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-$boost_release ${BOOST_CMAKE_STUFF} -DEigen3_DIR=${INSTALL_DIR}/share/eigen3/cmake/
    emmake make -j ${NUMPROCS}
    emmake make install
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/
    npm install
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/public/baby-gru
    ln -s ${MOORHEN_SOURCE_DIR}/checkout/monomers
fi
