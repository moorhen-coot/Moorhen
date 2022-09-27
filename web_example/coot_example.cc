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

#include "geometry/residue-and-atom-specs.hh"
#include "api/interfaces.hh"
#include "api/molecules_container.hh"

#include "mmdb_manager.h"
#include "clipper/core/ramachandran.h"

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
    bool isOutlier;
    bool is_pre_pro;
};

struct ResiduePropertyInfo {
    std::string chainId;
    int seqNum;
    std::string insCode;
    std::string restype;
    double property;
};

std::vector<ResiduePropertyInfo> getBVals(const std::string &pdbin, const std::string &chainId){
    std::vector<ResiduePropertyInfo> info;
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
    for(int ires=0;ires<nRes;ires++){
        mmdb::Atom *N = SelRes[ires]->GetAtom(" N");
        mmdb::Atom *CA = SelRes[ires]->GetAtom("CA");
        mmdb::Atom *C = SelRes[ires]->GetAtom(" C");
        if(N&&CA&&C){
            ResiduePropertyInfo resInfo;
            resInfo.chainId = chainId;
            resInfo.seqNum = N->GetSeqNum();
            resInfo.insCode = std::string(N->GetInsCode());
            resInfo.restype = std::string(N->GetResidue()->GetResName());
            resInfo.property = CA->tempFactor;
            info.push_back(resInfo);
        }
    }

    return info;
}

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


    clipper::Ramachandran rama;
    clipper::Ramachandran r_gly, r_pro, r_non_gly_pro;
    clipper::Ramachandran r_ileval, r_pre_pro, r_non_gly_pro_pre_pro_ileval;
    rama.init(clipper::Ramachandran::All2);

    // Lovell et al. 2003, 50, 437 Protein Structure, Function and Genetics values:
    double rama_threshold_preferred = 0.02; 
    double rama_threshold_allowed = 0.002;
    float level_prefered = 0.02;
    float level_allowed = 0.002;

    //clipper defaults: 0.01 0.0005

    rama.set_thresholds(level_prefered, level_allowed);
    //
    r_gly.init(clipper::Ramachandran::Gly2);
    r_gly.set_thresholds(level_prefered, level_allowed);
    //
    r_pro.init(clipper::Ramachandran::Pro2);
    r_pro.set_thresholds(level_prefered, level_allowed);
    // first approximation; shouldnt be used if top8000 is available anyway
    r_non_gly_pro.init(clipper::Ramachandran::NoGPIVpreP2);
    r_non_gly_pro.set_thresholds(level_prefered, level_allowed);
    // new
    r_ileval.init(clipper::Ramachandran::IleVal2);
    r_ileval.set_thresholds(level_prefered, level_allowed);
    //
    r_pre_pro.init(clipper::Ramachandran::PrePro2);
    r_pre_pro.set_thresholds(level_prefered, level_allowed);
    //
    r_non_gly_pro_pre_pro_ileval.init(clipper::Ramachandran::NoGPIVpreP2);
    r_non_gly_pro_pre_pro_ileval.set_thresholds(level_prefered, level_allowed);


    //std::cout << nRes << " residues" << std::endl;

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
            std::string restypeP = std::string(Np->GetResidue()->GetResName());
            resInfo.is_pre_pro = false;
            if(restypeP=="PRO") resInfo.is_pre_pro = true;
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
            bool r = false; //isOutlier
            if (resInfo.restype == "GLY") {
                if (! r_gly.allowed(phi, psi))
                    if (! r_gly.favored(phi, psi))
                        r = true;
            } else {
                if (resInfo.restype == "PRO") {
                    if (! r_pro.allowed(phi, psi))
                        if (! r_pro.favored(phi, psi))
                            r = true;
                } else {
                    if (resInfo.is_pre_pro) {
                        if (! r_pre_pro.allowed(phi, psi))
                            if (! r_pre_pro.favored(phi, psi))
                                r = true;
                    } else {
                        if ((resInfo.restype == "ILE") ||
                                (resInfo.restype == "VAL")) {
                            if (! r_ileval.allowed(phi, psi))
                                if (! r_ileval.favored(phi, psi))
                                    r = true;
                        } else {
                            if (! rama.allowed(phi, psi))
                                if (! rama.favored(phi, psi))
                                    r = true;
                        }
                    }
                }
            }
            resInfo.isOutlier = r;

            info.push_back(resInfo);
        }
    }

    return info;
}

/*
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
*/

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

class molecules_container_js : public molecules_container_t{
    public:
        int writePDBASCII(int imol, const std::string &file_name) { 
            const char *fname_cp = file_name.c_str();
            return mol(imol)->WritePDBASCII(fname_cp);
        }
        int flipPeptide(int imol, const coot::residue_spec_t &rs, const std::string &alt_conf) { return  molecules_container_t::flipPeptide(imol,rs,alt_conf); }
        int flipPeptide(int imol, const std::string &cid, const std::string &alt_conf) { return molecules_container_t::flipPeptide(imol,cid,alt_conf); }
        int read_pdb(const std::string &file_name) { return molecules_container_t::read_pdb(file_name); }
        int read_mtz(const std::string &file_name, const std::string &f, const std::string &phi, const std::string &weight, bool use_weight, bool is_a_difference_map) {return molecules_container_t::read_mtz(file_name,f,phi,weight,use_weight,is_a_difference_map); } 
};

EMSCRIPTEN_BINDINGS(my_module) {
    class_<molecules_container_js>("molecules_container_js")
    .constructor<>()
    .function("is_valid_model_molecule",&molecules_container_js::is_valid_model_molecule)
    .function("is_valid_map_molecule",&molecules_container_js::is_valid_map_molecule)
    .function("writePDBASCII",&molecules_container_js::writePDBASCII)
    .function("read_pdb",&molecules_container_js::read_pdb)
    .function("read_mtz",&molecules_container_js::read_mtz)
    .function("flipPeptide_cid", select_overload<int(int, const std::string&,const std::string&)>(&molecules_container_js::flipPeptide))
    .function("flipPeptide_rs", select_overload<int(int, const coot::residue_spec_t&,const std::string&)>(&molecules_container_js::flipPeptide))
    ;
    class_<RamachandranInfo>("RamachandranInfo")
    .constructor<>()
    .property("chainId", &RamachandranInfo::chainId)
    .property("seqNum", &RamachandranInfo::seqNum)
    .property("insCode", &RamachandranInfo::insCode)
    .property("restype", &RamachandranInfo::restype)
    .property("phi", &RamachandranInfo::phi)
    .property("psi", &RamachandranInfo::psi)
    .property("isOutlier", &RamachandranInfo::isOutlier)
    .property("is_pre_pro", &RamachandranInfo::is_pre_pro)
    ;
    class_<ResiduePropertyInfo>("ResiduePropertyInfo")
    .constructor<>()
    .property("chainId", &ResiduePropertyInfo::chainId)
    .property("seqNum", &ResiduePropertyInfo::seqNum)
    .property("insCode", &ResiduePropertyInfo::insCode)
    .property("restype", &ResiduePropertyInfo::restype)
    .property("property", &ResiduePropertyInfo::property)
    ;
    class_<coot::residue_spec_t>("residue_spec_t")
    .constructor<const std::string &, int, const std::string &>()
    ;
    register_vector<std::string>("VectorString");
    register_vector<RamachandranInfo>("VectorResidueIdentifier");
    register_vector<ResiduePropertyInfo>("VectorResiduePropertyInfo");
    function("mini_rsr",&mini_rsr);
    function("flipPeptide",&flipPeptide);
    function("getRamachandranData",&getRamachandranData);
    function("getBVals",&getBVals);
}
