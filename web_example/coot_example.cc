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

#include "mmdb_manager.h"

int mini_rsr_main(int argc, char **argv);

using namespace emscripten;

extern void clear_getopt_initialized();

struct ResidueIdentifier {
    std::string chainId;
    int resNo;
    std::string insCode;
};

std::vector<ResidueIdentifier> getRamachandranData(const std::string &pdbin, const std::string &chainId){
    std::vector<ResidueIdentifier> info;
    const char *filename_cp = pdbin.c_str();
    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    int RC = molHnd->ReadCoorFile(filename_cp);
    int selHnd = molHnd->NewSelection();
    molHnd->Select(selHnd,mmdb::STYPE_RESIDUE,"/*/*/(GLY,ALA,VAL,PRO,SER,THR,LEU,ILE,CYS,ASP,GLU,ASN,GLN,ARG,LYS,MET,MSE,HIS,PHE,TYR,TRP,HCS,ALO,PDD,UNK)",mmdb::SKEY_NEW);
    mmdb::Residue** SelRes=0;
    int nRes;
    molHnd->GetSelIndex(selHnd,SelRes,nRes);
    // TODO - get the actual data ...

    return info;
}

int flipPeptide(const std::string &pdbin, const std::string &chainId, const int resno, const std::string &pdbout){
    int retval = 0;
    std::cout << "In flipPeptide in C++. This does nothing useful." << std::endl;
    std::cout << "PDBIN: " << pdbin << std::endl;
    std::cout << "CHAIN: " << chainId << std::endl;
    std::cout << "RESNO: " << resno << std::endl;
    std::cout << "PDBOUT: " << pdbout << std::endl;

    const char *filename_cp = pdbin.c_str();
    const char *filename_out_cp = pdbout.c_str();

    //TODO - So this is where we should implement/call a proper function.
    //BEGIN STUB
    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    int RC = molHnd->ReadCoorFile(filename_cp);
    assert(RC==0);

    RC = molHnd->WritePDBASCII(filename_out_cp);
    assert(RC==0);
    //END STUB

    return retval;
}

int mini_rsr(const std::vector<std::string> &args){

    int argc = args.size();
    char **argv = new char*[argc];

    clear_getopt_initialized();

    for(int i=0;i<argc;i++){
        argv[i] = new char[args[i].size()+1];
        const char* arg_c = args[i].c_str();
        strcpy(argv[i], (char*)arg_c);
    }

    int retval = mini_rsr_main(argc,argv);

    for(int i=0;i<argc;i++){
        delete [] argv[i];
    }
    delete [] argv;

    return retval;
}


EMSCRIPTEN_BINDINGS(my_module) {
    class_<ResidueIdentifier>("ResidueIdentifier")
    .constructor<>()
    .property("chainId", &ResidueIdentifier::chainId)
    .property("resNo", &ResidueIdentifier::resNo)
    .property("insCode", &ResidueIdentifier::insCode)
    ;
    register_vector<std::string>("VectorString");
    register_vector<ResidueIdentifier>("VectorResidueIdentifier");
    function("mini_rsr",&mini_rsr);
    function("flipPeptide",&flipPeptide);
}
