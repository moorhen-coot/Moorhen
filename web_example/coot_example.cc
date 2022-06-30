/*
 * Copyright 2013 The Emscripten Authors.  All rights reserved.
 * Emscripten is available under two separate licenses, the MIT license and the
 * University of Illinois/NCSA Open Source License.  Both these licenses can be
 * found in the LICENSE file.
 */

#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

#include <iostream>
#include <string>
#include <vector>

#include <emscripten.h>
#include <emscripten/bind.h>

int mini_rsr_main(int argc, char **argv);

using namespace emscripten;

int mini_rsr(const std::vector<std::string> &args){

    int argc = args.size();
    char **argv = new char*[argc];

    for(int i=0;i<argc;i++){
        argv[i] = new char[args[i].size()+1];
        strcpy(argv[i], args[i].c_str());
    }

    return mini_rsr_main(argc,argv);
}


EMSCRIPTEN_BINDINGS(my_module) {
    register_vector<std::string>("VectorString");
    function("mini_rsr",&mini_rsr);
}
