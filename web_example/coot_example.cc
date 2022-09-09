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

#include <math.h>
#ifndef M_PI
#define M_PI           3.14159265358979323846
#endif

#include <emscripten.h>
#include <emscripten/bind.h>

#include "mmdb_manager.h"
#include "cartesian.h"
#include "geomutil.h"

int mini_rsr_main(int argc, char **argv);

using namespace emscripten;

extern void clear_getopt_initialized();

struct RamachandranInfo {
    std::string chainId;
    int seqNum;
    std::string insCode;
    std::string restype;
    double phi;
    double psi;
};

std::vector<RamachandranInfo> getRamachandranData(const std::string &pdbin, const std::string &chainId){
    std::vector<RamachandranInfo> info;
    const char *filename_cp = pdbin.c_str();
    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    int RC = molHnd->ReadCoorFile(filename_cp);
    int selHnd = molHnd->NewSelection();
    std::string selStr = std::string("/*/")+chainId+std::string("/(GLY,ALA,VAL,PRO,SER,THR,LEU,ILE,CYS,ASP,GLU,ASN,GLN,ARG,LYS,MET,MSE,HIS,PHE,TYR,TRP,HCS,ALO,PDD,UNK)");
    const char *sel_cp = selStr.c_str();
    molHnd->Select(selHnd,mmdb::STYPE_RESIDUE,sel_cp,mmdb::SKEY_NEW);
    mmdb::Residue** SelRes=0;
    int nRes;
    molHnd->GetSelIndex(selHnd,SelRes,nRes);
    //std::cout << nRes << " residues" << std::endl;
    // TODO - Terminal residues?
    for(int ires=1;ires<nRes-1;ires++){
        mmdb::Atom *N = SelRes[ires]->GetAtom(" N");
        mmdb::Atom *CA = SelRes[ires]->GetAtom("CA");
        mmdb::Atom *C = SelRes[ires]->GetAtom(" C");
        mmdb::Atom *Cm = SelRes[ires-1]->GetAtom(" C");
        mmdb::Atom *Np = SelRes[ires+1]->GetAtom(" N");
        if(N&&CA&&C&&Cm&&Np){
            RamachandranInfo resInfo;
            resInfo.chainId = chainId;
            resInfo.seqNum = N->GetSeqNum();
            resInfo.insCode = std::string(N->GetInsCode());
            resInfo.restype = std::string(N->GetResidue()->GetResName());
            //Phi: C-N-CA-C
            //Psi: N-CA-C-N
            Cartesian Ncart(N->x,N->y,N->z);
            Cartesian CAcart(CA->x,CA->y,CA->z);
            Cartesian Ccart(C->x,C->y,C->z);
            Cartesian CMcart(Cm->x,Cm->y,Cm->z);
            Cartesian NPcart(Np->x,Np->y,Np->z);
            double phi = DihedralAngle(CMcart,Ncart,CAcart,Ccart);
            double psi = DihedralAngle(Ncart,CAcart,Ccart,NPcart);
            //std::cout << N->GetSeqNum() << " " << N->name << " " << CA->name << " " << C->name << " " << Cm->name << " " << Np->name << " " << phi*180.0/M_PI << " " << psi*180.0/M_PI << std::endl;
            resInfo.phi = phi*180.0/M_PI;
            resInfo.psi = psi*180.0/M_PI;
            info.push_back(resInfo);
        }
    }

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
    class_<RamachandranInfo>("RamachandranInfo")
    .constructor<>()
    .property("chainId", &RamachandranInfo::chainId)
    .property("seqNum", &RamachandranInfo::seqNum)
    .property("insCode", &RamachandranInfo::insCode)
    .property("restype", &RamachandranInfo::restype)
    .property("phi", &RamachandranInfo::phi)
    .property("psi", &RamachandranInfo::psi)
    ;
    register_vector<std::string>("VectorString");
    register_vector<RamachandranInfo>("VectorResidueIdentifier");
    function("mini_rsr",&mini_rsr);
    function("flipPeptide",&flipPeptide);
    function("getRamachandranData",&getRamachandranData);
}
