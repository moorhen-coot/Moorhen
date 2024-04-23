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

${SOURCE_DIR}/moorhen_build.sh $*
