#!/bin/sh

#This script will compile and install Moorhen and its dependencies.
#builing will happen by default in subdirectory CCP4_WASM_BUILD of
#where it is exececuted from. This can be changed below. Moorhen will
#installed (by default) in install/web_packages/baby-gru. The "install"
#part of this can also be changed below.

if [ "x$MOORHEN_SOURCE_DIR" = "x" ]; then
    if command -v greadlink > /dev/null 2>&1; then
        MOORHEN_SOURCE_DIR=`dirname -- "$( greadlink -f -- "$0"; )"`
    else
        MOORHEN_SOURCE_DIR=`dirname -- "$( readlink -f -- "$0"; )"`
    fi
else
    echo "Using MOORHEN_SOURCE_DIR from environment: $MOORHEN_SOURCE_DIR"
fi

${MOORHEN_SOURCE_DIR}/moorhen_build.sh $*
