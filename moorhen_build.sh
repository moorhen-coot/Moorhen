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

. ${MOORHEN_SOURCE_DIR}/VERSIONS
#This defines geteigen, getgsl, getclipper, etc.
. ${MOORHEN_SOURCE_DIR}/get_sources_funs

if [ x`uname -s` = x"Darwin" ]; then
    NUMPROCS=`sysctl -n hw.ncpu`
else
    NUMPROCS=`nproc --all`
fi


MEMORY64=0
BUILD_DIR=${PWD}/CCP4_WASM_BUILD
INSTALL_DIR=${PWD}/install

if [ x"$1" = x"--64bit" ]; then
   MEMORY64=1
   BUILD_DIR=${PWD}/CCP4_WASM_BUILD_64
   INSTALL_DIR=${PWD}/install64
   shift
fi
if [ x"$1" = x"--clear" ]; then
   shift
   CLEAR_MODULES=$*
else
   MODULES=$*
fi

mkdir -p ${BUILD_DIR}
mkdir -p ${INSTALL_DIR}

fail() {
    echo $1
    exit 1
}

clearzlib() {
    echo "Clear zlib"
    rm -rf ${BUILD_DIR}/zlib_build
    rm -rf ${INSTALL_DIR}/lib/libz.a
    rm -rf ${INSTALL_DIR}/include/zlib.h
    rm -rf ${INSTALL_DIR}/include/zconf.h
}

clearfreetype() {
    echo "Clear freetype"
    rm -rf ${BUILD_DIR}/freetype_build
    rm -rf ${INSTALL_DIR}/lib/libfreetype.a
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/freetype2.pc
    rm -rf ${INSTALL_DIR}/include/freetype2
}

clearpng() {
    echo "Clear png"
    rm -rf ${BUILD_DIR}/png_build
    rm -rf ${INSTALL_DIR}/include/libpng16
    rm -rf ${INSTALL_DIR}/include/png*.h
    rm -rf ${INSTALL_DIR}/lib/libpng*.a
    rm -rf ${INSTALL_DIR}/lib/libpng*.la
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/libpng.pc
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/libpng16.pc
    rm -rf ${INSTALL_DIR}/bin/libpng-config
    rm -rf ${INSTALL_DIR}/bin/libpng16-config
}

clearboost() {
    echo "Clear boost"
    rm -rf ${BUILD_DIR}/boost
    rm -rf ${INSTALL_DIR}/include/boost
    rm -rf ${INSTALL_DIR}/lib/libboost*.a
    rm -rf ${INSTALL_DIR}/lib/libboost*.bc
    rm -rf ${INSTALL_DIR}/lib/cmake/boost*
    rm -rf ${INSTALL_DIR}/lib/cmake/Boost*
}

cleargemmi() {
    echo "Clear gemmi"
    rm -rf ${BUILD_DIR}/gemmi_build
    rm -rf ${INSTALL_DIR}/include/gemmi
    rm -rf ${INSTALL_DIR}/lib/libgemmi_cpp.a
}

cleargsl() {
    echo "Clear gsl"
    rm -rf ${BUILD_DIR}/gsl_build
    rm -rf ${INSTALL_DIR}/include/gsl
    rm -rf ${INSTALL_DIR}/lib/libgsl*.a
    rm -rf ${INSTALL_DIR}/lib/libgsl*.la
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/gsl.pc
    rm -rf ${INSTALL_DIR}/bin/gsl-config
    rm -rf ${INSTALL_DIR}/bin/gsl-histogram
    rm -rf ${INSTALL_DIR}/bin/gsl-randist
}

clearigraph() {
    echo "Clear igraph"
    rm -rf ${BUILD_DIR}/igraph_build
    rm -rf ${INSTALL_DIR}/include/igraph
    rm -rf ${INSTALL_DIR}/lib/libigraph.a
    rm -rf ${INSTALL_DIR}/lib/cmake/igraph
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/igraph.pc
}

clearjsoncpp() {
    echo "Clear jsoncpp"
    rm -rf ${BUILD_DIR}/jsoncpp_build
    rm -rf ${INSTALL_DIR}/include/json
    rm -rf ${INSTALL_DIR}/lib/libjsoncpp.a
    rm -rf ${INSTALL_DIR}/lib/cmake/jsoncpp
    rm -rf ${INSTALL_DIR}/lib/objects-Release/jsoncpp_object/
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/jsoncpp.pc
}

clearrdkit() {
    echo "Clear rdkit"
    rm -rf ${BUILD_DIR}/rdkit_build
    rm -rf ${INSTALL_DIR}/include/rdkit
    rm -rf ${INSTALL_DIR}/include/maeparser
    rm -rf ${INSTALL_DIR}/include/coordgen
    rm -rf ${INSTALL_DIR}/lib/libRDKit*.a
    rm -rf ${INSTALL_DIR}/lib/cmake/rdkit
}

cleareigen() {
    echo "Clear eigen"
    rm -rf ${BUILD_DIR}/eigen_build
    rm -rf ${INSTALL_DIR}/include/eigen3
}

clearccp4() {
    echo "Clear libccp4"
    rm -rf ${BUILD_DIR}/ccp4_build
    rm -rf ${INSTALL_DIR}/include/ccp4
    rm -rf ${INSTALL_DIR}/lib/libccp4.a
}

clearfftw() {
    echo "Clear fftw"
    rm -rf ${BUILD_DIR}/fftw_build
    rm -rf ${INSTALL_DIR}/include/fftw
    rm -rf ${INSTALL_DIR}/include/rfftw
    rm -rf ${INSTALL_DIR}/lib/libfftw.a
    rm -rf ${INSTALL_DIR}/lib/librfftw.a
}

clearmmdb2() {
    echo "Clear mmdb2"
    rm -rf ${BUILD_DIR}/mmdb2_build
    rm -rf ${INSTALL_DIR}/include/mmdb2
    rm -rf ${INSTALL_DIR}/lib/libmmdb2.a
}

clearclipper() {
    echo "Clear clipper"
    rm -rf ${BUILD_DIR}/clipper_build
    rm -rf ${INSTALL_DIR}/include/clipper
    rm -rf ${INSTALL_DIR}/lib/libclipper*.a
}

clearprivateer() {
    echo "Clear privateer"
    rm -rf ${BUILD_DIR}/privateer_build
    rm -rf ${INSTALL_DIR}/include/privateer
    rm -rf ${INSTALL_DIR}/lib/libprivateer.a
}

clearssm() {
    echo "Clear ssm"
    rm -rf ${BUILD_DIR}/ssm_build
    rm -rf ${INSTALL_DIR}/include/ssm
    rm -rf ${INSTALL_DIR}/lib/libssm.a
}

clearslicendice() {
    echo "Clear slicendice"
    rm -rf ${BUILD_DIR}/slicendice_cpp_build
    rm -rf ${INSTALL_DIR}/include/slicendice_cpp
    rm -rf ${INSTALL_DIR}/lib/libslicendice_cpp.a
}

clearsigcpp() {
    echo "Clear sigc++"
    rm -rf ${BUILD_DIR}/libsigcplusplus_build
    rm -rf ${INSTALL_DIR}/include/sigc++-3.0
    rm -rf ${INSTALL_DIR}/lib/libsigc-3.0.a
    rm -rf ${INSTALL_DIR}/lib/sigc++-3.0
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/sigc++-3.0.pc
}

cleargraphene() {
    echo "Clear graphene"
    rm -rf ${BUILD_DIR}/graphene_build
    rm -rf ${INSTALL_DIR}/include/graphene-1.0
    rm -rf ${INSTALL_DIR}/lib/libgraphene-1.0.a
    rm -rf ${INSTALL_DIR}/lib/graphene-1.0
    rm -rf ${INSTALL_DIR}/lib/pkgconfig/graphene-1.0.pc
}

clearmoorhen() {
    echo "Clear moorhen"
    rm -rf ${BUILD_DIR}/moorhen_build
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen.js
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen.wasm
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen.data
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen.worker.js
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen64.js
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen64.wasm
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen64.data
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen64.worker.js
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/web_example.js
    rm -rf ${MOORHEN_SOURCE_DIR}/baby-gru/public/web_example.wasm
}

clearall() {
    echo "Clear all"
    clearfreetype
    clearpng
    clearzlib
    clearboost
    cleargemmi
    cleargsl
    clearigraph
    clearjsoncpp
    clearrdkit
    cleareigen
    clearccp4
    clearfftw
    clearmmdb2
    clearclipper
    clearprivateer
    clearssm
    clearslicendice
    clearsigcpp
    cleargraphene
    clearmoorhen
}

if [ x"$CLEAR_MODULES" = x"" ]; then
    :
else
    for mod in $CLEAR_MODULES; do
        case $mod in
           all) clearall
               ;;
           png) clearpng
               ;;
           zlib) clearzlib
               ;;
           freetype) clearfreetype
               ;;
           boost) clearboost
               ;;
           gemmi) cleargemmi
               ;;
           gsl) cleargsl
               ;;
           igraph) clearigraph
               ;;
           jsoncpp) clearjsoncpp
               ;;
           rdkit) clearrdkit
               ;;
           eigen) cleareigen
               ;;
           libccp4) clearccp4
               ;;
           fftw) clearfftw
               ;;
           mmdb2) clearmmdb2
               ;;
           clipper) clearclipper
               ;;
           privateer) clearprivateer
               ;;
           ssm) clearssm
               ;;
           slicendice) clearslicendice
               ;;
           sigcpp) clearsigcpp
               ;;
           graphene) cleargraphene
               ;;
           moorhen) clearmoorhen
               ;;
           *) echo "Unknown module requested for clearing"
               ;;
        esac
        done
    exit
fi

echo "Sources are in ${MOORHEN_SOURCE_DIR}"
echo "Building in ${BUILD_DIR}"
echo "Installing in ${INSTALL_DIR}"

# Create an empty file silly.c and then compile it with USE_ZLIB and USE_LIBPNG to force emsdk to get zlib/png.
echo "Attempting to get emsdk zlib/png ports"
echo
echo "" > silly.c
emcc silly.c  -pthread -sMEMORY64=1 -Wno-experimental
emcc silly.c  -pthread
rm -f silly.c
rm -f a.out.js
rm -f a.out.wasm
rm -f a.out.worker.js

if test x"${MEMORY64}" = x"1"; then
    echo "#######################################################"
    echo "Building ** 64-bit ** (large memory) version of Moorhen"
    echo "#######################################################"
    echo
    MOORHEN_CMAKE_FLAGS="-sMEMORY64=1 -pthread -fwasm-exceptions"
else
    echo "########################################"
    echo "Building ** 32-bit ** version of Moorhen"
    echo "########################################"
    echo
    MOORHEN_CMAKE_FLAGS="-pthread -fwasm-exceptions"
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
BUILD_FREETYPE=false
BUILD_ZLIB=false
BUILD_PNG=false

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

if test -d ${INSTALL_DIR}/lib/cmake/Boost-${boost_release}; then
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

if test -r ${INSTALL_DIR}/include/zlib.h; then
    true
else
    BUILD_ZLIB=true
fi

if test -r ${INSTALL_DIR}/include/freetype2/ft2build.h; then
    true
else
    BUILD_FREETYPE=true
fi

if test -r ${INSTALL_DIR}/include/pngconf.h; then
    true
else
    BUILD_PNG=true
fi

if test x"${MEMORY64}" = x"1"; then
if test -r ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen64.wasm; then
    true
else
    BUILD_MOORHEN=true
fi
else
if test -r ${MOORHEN_SOURCE_DIR}/baby-gru/public/moorhen.wasm; then
    true
else
    BUILD_MOORHEN=true
fi
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
       png) echo "Force build png"
       BUILD_PNG=true
       ;;
       zlib) echo "Force build zlib"
       BUILD_ZLIB=true
       ;;
       freetype) echo "Force build freetype"
       BUILD_FREETYPE=true
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
echo "BUILD_FREETYPE   " $BUILD_FREETYPE
echo "BUILD_ZLIB       " $BUILD_ZLIB
echo "BUILD_PNG        " $BUILD_PNG
echo "BUILD_MOORHEN    " $BUILD_MOORHEN

#eigen
if [ $BUILD_LIBEIGEN = true ]; then
    geteigen
    mkdir -p ${BUILD_DIR}/eigen_build
    cd ${BUILD_DIR}/eigen_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/eigen-$libeigen_release
    make install || fail "Error installing eigen, giving up."
fi

#png
if [ $BUILD_PNG = true ]; then
    getpng
    mkdir -p ${BUILD_DIR}/png_build
    cd ${BUILD_DIR}/png_build
    emcmake cmake -DPNG_SHARED=OFF -DSKIP_INSTALL_PROGRAMS=ON -DSKIP_INSTALL_EXECUTABLES=ON -DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/libpng-$png_release
    emmake make LDFLAGS="-all-static -fwasm-exceptions" -j ${NUMPROCS} CXXFLAGS="${MOORHEN_CMAKE_FLAGS}" CFLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make install || fail "Error installing png, giving up."
fi

#freetype
if [ $BUILD_FREETYPE = true ]; then
    getfreetype
    mkdir -p ${BUILD_DIR}/freetype_build
    cd ${BUILD_DIR}/freetype_build
    emcmake cmake -DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/freetype-$freetype_release
    emmake make  -j ${NUMPROCS}
    emmake make install || fail "Error installing freetype, giving up."
fi

#zlib
if [ $BUILD_ZLIB = true ]; then
    getzlib
    mkdir -p ${BUILD_DIR}/zlib_build
    cd ${BUILD_DIR}/zlib_build
    emcmake cmake -DZLIB_BUILD_EXAMPLES=OFF -DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/zlib-$zlib_release
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing zlib, giving up."
fi

#gsl
if [ $BUILD_GSL = true ]; then
    getgsl
    mkdir -p ${BUILD_DIR}/gsl_build
    cd ${BUILD_DIR}/gsl_build
    emconfigure ${MOORHEN_SOURCE_DIR}/gsl-2.7.1/configure --prefix=${INSTALL_DIR}
    emmake make LDFLAGS=-all-static -j ${NUMPROCS} CXXFLAGS="${MOORHEN_CMAKE_FLAGS}" CFLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make install || fail "Error installing gsl, giving up."
fi

#boost with cmake
if [ $BUILD_BOOST = true ]; then
    getboost
    mkdir -p ${BUILD_DIR}/boost
    cd ${BUILD_DIR}/boost
    emcmake cmake -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/boost-$boost_release -DBOOST_EXCLUDE_LIBRARIES="context;fiber;fiber_numa;asio;log;coroutine;cobalt;nowide"
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing boost, giving up."
fi

#RDKit
if [ $BUILD_RDKIT = true ]; then
    getrdkit
    BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-$boost_release}; k=${j#${INSTALL_DIR}/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
    mkdir -p ${BUILD_DIR}/rdkit_build
    cd ${BUILD_DIR}/rdkit_build
    emcmake cmake -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-$boost_release ${BOOST_CMAKE_STUFF} -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_INSTALL_STATIC_LIBS=ON -DRDK_INSTALL_INTREE=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_TEST_MMFF_COMPLIANCE=OFF -DRDK_BUILD_CPP_TESTS=OFF -DRDK_USE_BOOST_STACKTRACE=OFF -DRDK_USE_BOOST_SERIALIZATION=ON -DRDK_BUILD_THREADSAFE_SSS=OFF -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include -DBoost_USE_STATIC_LIBS=ON -DBoost_USE_STATIC_RUNTIME=ON -DBoost_DEBUG=TRUE -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -Wno-enum-constexpr-conversion -D_HAS_AUTO_PTR_ETC=0" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/rdkit -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_INSTALL_COMIC_FONTS=OFF -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing RDKit, giving up."
    # Manually copy coordgen and maeparser headers
    mkdir -p ${INSTALL_DIR}/include/coordgen
    mkdir -p ${INSTALL_DIR}/include/maeparser
    # cp -v ${MOORHEN_SOURCE_DIR}/rdkit/External/CoordGen/*.h ${INSTALL_DIR}/include/
    cp -v ${MOORHEN_SOURCE_DIR}/rdkit/External/CoordGen/coordgen/*.{h,hpp} ${INSTALL_DIR}/include/coordgen
    cp -v ${MOORHEN_SOURCE_DIR}/rdkit/External/CoordGen/maeparser/*.hpp ${INSTALL_DIR}/include/maeparser
fi

#gemmi
if [ $BUILD_GEMMI = true ]; then
    getgemmi
    mkdir -p ${BUILD_DIR}/gemmi_build
    cd ${BUILD_DIR}/gemmi_build
    emcmake cmake  -DCMAKE_EXE_LINKER_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/gemmi
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing gemmi, giving up."
fi

#jsoncpp
if [ $BUILD_JSONCPP = true ]; then
    getjsoncpp
    mkdir -p ${BUILD_DIR}/jsoncpp_build
    cd ${BUILD_DIR}/jsoncpp_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/checkout/jsoncpp -DJSONCPP_WITH_TESTS=OFF -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing jsoncpp, giving up."
fi

#igraph
if [ $BUILD_IGRAPH = true ]; then
    getigraph
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
    emmake make install || fail "Error installing igraph, giving up."
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
    getgraphene
    cd ${MOORHEN_SOURCE_DIR}/checkout/graphene-$graphene_release/
    CFLAGS="-s USE_PTHREADS $MOORHEN_CMAKE_FLAGS" LDFLAGS=" -lpthread $MOORHEN_CMAKE_FLAGS" meson setup ${BUILD_DIR}/graphene_build \
        --prefix=${INSTALL_DIR} \
        --cross-file=$MESON_CROSS \
        --default-library=static \
        --buildtype=release \
        -Dtests=false && \
        meson install -C ${BUILD_DIR}/graphene_build || fail "Error installing graphene, giving up."
    cd ${BUILD_DIR}
fi

# Libsigc++
if [ $BUILD_LIBSIGCPP = true ]; then
    getsigcpp
    cd ${MOORHEN_SOURCE_DIR}/checkout/libsigcplusplus-$libsigcpp_release/
    meson setup ${BUILD_DIR}/libsigcplusplus_build \
        --prefix=${INSTALL_DIR} \
        --libdir=lib \
        --cross-file=$MESON_CROSS \
        --default-library=static \
        -Dc_link_args="-pthread $MOORHEN_CMAKE_FLAGS" \
        -Dcpp_link_args="-pthread $MOORHEN_CMAKE_FLAGS" \
        -Dcpp_args="-s USE_PTHREADS=1 $MOORHEN_CMAKE_FLAGS" \
        --buildtype=release \
        -Dbuild-tests=false \
        -Dbuild-examples=false && \
        meson install -C ${BUILD_DIR}/libsigcplusplus_build || fail "Error installing sigc++, giving up."
    cd ${BUILD_DIR}
fi

#ccp4
if [ $BUILD_LIBCCP4 = true ]; then
    getlibccp4
    mkdir -p ${BUILD_DIR}/ccp4_build
    cd ${BUILD_DIR}/ccp4_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/ccp4 -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing ccp4, giving up."
fi

#fftw
if [ $BUILD_FFTW = true ]; then
    getfftw
    mkdir -p ${BUILD_DIR}/fftw_build
    cd ${BUILD_DIR}/fftw_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/fftw  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing fftw, giving up."
fi

#mmdb2
if [ $BUILD_MMDB2 = true ]; then
    getmmdb2
    mkdir -p ${BUILD_DIR}/mmdb2_build
    cd ${BUILD_DIR}/mmdb2_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/mmdb2  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}"
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing mmdb2, giving up."
fi

#clipper
if [ $BUILD_CLIPPER = true ]; then
    getclipper
    mkdir -p ${BUILD_DIR}/clipper_build
    cd ${BUILD_DIR}/clipper_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/clipper -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing clipper, giving up."
fi

#privateer
if [ $BUILD_PRIVATEER = true ]; then
    getprivateer
    mkdir -p ${BUILD_DIR}/privateer_build
    cd ${BUILD_DIR}/privateer_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/privateer  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing privateer, giving up."
fi

#ssm
if [ $BUILD_SSM = true ]; then
    getssm
    mkdir -p ${BUILD_DIR}/ssm_build
    cd ${BUILD_DIR}/ssm_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/ssm  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing ssm, giving up."
fi

#slicendice_cpp
if [ $BUILD_SLICENDICE = true ]; then
    getslicendice
    mkdir -p ${BUILD_DIR}/slicendice_cpp_build
    cd ${BUILD_DIR}/slicendice_cpp_build
    emcmake cmake -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR}/slicendice_cpp  -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_PREFIX_PATH=${INSTALL_DIR}
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing SliceNDice, giving up."
fi

#Moorhen
if [ $BUILD_MOORHEN = true ]; then
    BOOST_CMAKE_STUFF=`for i in ${INSTALL_DIR}/lib/cmake/boost*; do j=${i%-$boost_release}; k=${j#${INSTALL_DIR}/lib/cmake/boost_}; echo -Dboost_${k}_DIR=$i; done`
    getglm
    getcoot
    getmonomers
    mkdir -p ${BUILD_DIR}/moorhen_build
    cd ${BUILD_DIR}/moorhen_build
    emcmake cmake -DMEMORY64=${MEMORY64} -DCMAKE_EXE_LINKER_FLAGS="${MOORHEN_CMAKE_FLAGS}" -DCMAKE_C_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include -I${INSTALL_DIR}/include/fftw -I${INSTALL_DIR}/include/rfftw -I${INSTALL_DIR}/include/eigen3 -I${INSTALL_DIR}/include/ssm -I${MOORHEN_SOURCE_DIR}/checkout/glm-0.9.9.8 -I${INSTALL_DIR}/include/privateer -I${INSTALL_DIR}/include/privateer/pybind11" -DCMAKE_CXX_FLAGS="${MOORHEN_CMAKE_FLAGS} -I${INSTALL_DIR}/include -I${INSTALL_DIR}/include/fftw -I${INSTALL_DIR}/include/rfftw -I${INSTALL_DIR}/include/eigen3 -I${INSTALL_DIR}/include/ssm -I${MOORHEN_SOURCE_DIR}/checkout/glm-0.9.9.8 -I${INSTALL_DIR}/include/privateer -I${INSTALL_DIR}/include/privateer/pybind11" -DCMAKE_INSTALL_PREFIX=${INSTALL_DIR} ${MOORHEN_SOURCE_DIR} -DCMAKE_PREFIX_PATH=${INSTALL_DIR} -DCMAKE_MODULE_PATH=${INSTALL_DIR}/lib/cmake -DRDKit_DIR=${INSTALL_DIR}/lib/cmake/rdkit -DBoost_INCLUDE_DIR=${INSTALL_DIR}/include/boost -DBoost_DIR=${INSTALL_DIR}/lib/cmake/Boost-$boost_release ${BOOST_CMAKE_STUFF} -DEigen3_DIR=${INSTALL_DIR}/share/eigen3/cmake/
    emmake make -j ${NUMPROCS}
    emmake make install || fail "Error installing moorhen, giving up."
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/
    npm install
    cd ${MOORHEN_SOURCE_DIR}/baby-gru/public
    ln -sf ${MOORHEN_SOURCE_DIR}/checkout/monomers
fi
