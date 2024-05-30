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

#include "mmdb2/mmdb_manager.h"

#include "clipper/clipper.h"
#include "clipper/core/cell.h"
#include "clipper/clipper-ccp4.h"
#include "clipper/core/clipper_types.h"
#include "clipper/core/clipper_precision.h"
#include "clipper/clipper-cif.h"
#include "clipper/contrib/sfweight.h"
#include "clipper/clipper-mmdb.h"
#include "clipper/clipper-contrib.h"
#include "clipper/cns/cns_map_io.h"

#include "gsl/gsl_sf_bessel.h"
#include "gsl/gsl_cdf.h"

//#define _SAJSON_H_INCLUDED_
//#include "privateer-lib.h"

#include "headers.h"

using namespace emscripten;

//int superpose_main(const std::vector<std::string> &files, const std::vector<std::string> &selections);
//int gesamt_main(const std::vector<std::string> &_argv);

/*
std::string privateer::scripting::get_annotated_glycans ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system );
std::string privateer::scripting::get_annotated_glycans_hierarchical ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system );

std::string get_annotated_glycans ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system ){
    return privateer::scripting::get_annotated_glycans ( pdb_filename, original_colour_scheme, expression_system );
}

std::string get_annotated_glycans_hierarchical ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system ){
    return privateer::scripting::get_annotated_glycans_hierarchical ( pdb_filename, original_colour_scheme, expression_system );
}
*/

std::string clipperStringToString(const clipper::String &s){
    std::string snew = s;
    return s;
}

void exportXMapToMapFile(clipper::CCP4MAPfile &fout, const clipper::Xmap<float> &xmap){
    fout.export_xmap(xmap);
}

void printMapStats(clipper::Xmap<float> &xmap){
    clipper::Map_stats stats(xmap);

    std::cout << "Mean and sigma of map: " << stats.mean() << " and " << stats.std_dev() << std::endl;  std::cout.flush();

    float mean = stats.mean();
    float std_dev = stats.std_dev();

    clipper::Xmap<float>::Map_reference_index im;
    clipper::ftype64 w, x, sx;
    sx = 0.0;
    clipper::ftype64 minsx = 1.0e8;
    clipper::ftype64 maxsx = -1.0e8;
    for ( im = xmap.first(); !im.last(); im.next() ) {
        w = 1.0 / clipper::ftype64( xmap.multiplicity( im.coord() ) );
        x = clipper::ftype64( xmap[im] );
        if ( !std::isnan(x) ) {
            sx = w*x;
            if(sx>maxsx)
                maxsx = sx;
            if(sx<minsx)
                minsx = sx;
        }
    }

    float min = minsx;
    float max = maxsx;

    std::cout << "Min: " << min << ", Max: " << max << std::endl;
    
}

clipper::Xmap<float> initialize_cif_pdb(const std::string& cif_file_name, const std::string& pdb_file_name, int is_diff_map, float rate){
    std::cout << cif_file_name << std::endl;
    std::cout << pdb_file_name << std::endl;

    clipper::HKL_info mydata;
    clipper::CIFfile cif; 

    cif.open_read ( cif_file_name );
    cif.import_hkl_info(mydata); // set spacegroup, cell and get hkl list. 

    clipper::HKL_data< clipper::datatypes::F_sigF<float> > myfsigf(mydata); // Fobs
    clipper::HKL_data< clipper::datatypes::Flag > status(mydata); // Status

    cif.import_hkl_data(myfsigf);
    cif.import_hkl_data(status); 

    cif.close_read(); 

    std::cout << "Read " << mydata.num_reflections() << " from CIF file (pdb,mmcif)." << std::endl;  std::cout.flush();

    clipper::MMDBManager mmdb;
    mmdb.SetFlag( mmdb::MMDBF_AutoSerials | mmdb::MMDBF_IgnoreDuplSeqNum );
    std::cout << "pdb file " << pdb_file_name << "\n"; std::cout.flush();
    const char* pdb_file_name_cp = pdb_file_name.c_str();
    mmdb.ReadCoorFile( pdb_file_name_cp );

    clipper::mmdb::PPCAtom psel;
    int hndl, nsel;
    hndl = mmdb.NewSelection();
    mmdb.SelectAtoms( hndl, 0, 0, mmdb::SKEY_NEW );
    mmdb.GetSelIndex( hndl, psel, nsel );
    clipper::MMDBAtom_list atoms( psel, nsel );

    std::cout << "Selected " << nsel << " atoms\n";  std::cout.flush();

    mmdb.DeleteSelection( hndl );

    // calculate structure factors
    clipper::MTZcrystal cxtl;
    bool bulk = true;
    double bulkfrc, bulkscl;
    clipper::HKL_data<clipper::data32::F_phi> fc( mydata, cxtl );
    if ( bulk ) {
        clipper::SFcalc_obs_bulk<float> sfcb;
        sfcb( fc, myfsigf, atoms );
        bulkfrc = sfcb.bulk_frac();
        bulkscl = sfcb.bulk_scale();
    } else {
        clipper::SFcalc_aniso_fft<float> sfc;
        sfc( fc, atoms );
        bulkfrc = bulkscl = 0.0;
    }
    std::cout << "Calculated structure factors " << bulkfrc << " " << bulkscl << std::endl;  std::cout.flush();

    // now do sigmaa calc
    int freeflag = 1;
    clipper::HKL_data<clipper::data32::F_phi> fb( mydata, cxtl ), fd( mydata, cxtl );
    clipper::HKL_data<clipper::data32::Phi_fom> phiw( mydata, cxtl );
    clipper::HKL_data<clipper::data32::Flag> flag( mydata, cxtl );
    typedef clipper::HKL_data_base::HKL_reference_index HRI;

    for ( HRI ih = flag.first(); !ih.last(); ih.next() )
        if ( !myfsigf[ih].missing() && (status[ih].missing()||status[ih].flag()==freeflag) )
            flag[ih].flag() = clipper::SFweight_spline<float>::BOTH;
        else
            flag[ih].flag() = clipper::SFweight_spline<float>::NONE;

    // do sigmaa calc
    int n_refln = 1000;
    int n_param = 20;
    clipper::SFweight_spline<float> sfw( n_refln, n_param );
    bool fl = sfw( fb, fd, phiw, myfsigf, fc, flag );
    std::cout << "Done sigmaa calc" << std::endl;  std::cout.flush();

    // calc abcd
    clipper::HKL_data<clipper::data32::ABCD> abcd( mydata );
    abcd.compute( phiw, clipper::data32::Compute_abcd_from_phifom() );

    std::cout << "initializing map...";  std::cout.flush();
    clipper::Xmap<float> xmap;

    xmap.init(mydata.spacegroup(), mydata.cell(), 
            clipper::Grid_sampling(mydata.spacegroup(),
                mydata.cell(), 
                mydata.resolution(),
                rate));
    std::cout << "done."<< std::endl;  std::cout.flush();

    std::cout << "doing fft..." ;  std::cout.flush();
    xmap.fft_from( fb );       // generate sigmaA map 20050804
    std::cout << "done." << std::endl; std::cout.flush();

    return xmap;

}

int multiply(int i1, int i2){
    std::vector<int> a;
    std::cout << "Using a vector" << std::endl;
    a.push_back(i1);
    a.push_back(i2);
    return a[0]*a[1];
}

std::vector<double> getXYZResNo(const std::string &pdb_file_name, const std::string &chainID, int resNo){
    std::vector<double> xyz;

    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    const char *filename_cp = pdb_file_name.c_str();
    const char *chainID_cp = chainID.c_str();

    printf("Reading a PDB file: %s\n",filename_cp);
    int RC = molHnd->ReadCoorFile(filename_cp);
    assert(RC==0);

    int selHnd = molHnd->NewSelection();

    mmdb::Chain *chain = molHnd->GetChain (1, chainID_cp );

    if(chain){
        if(resNo>=0&&resNo<chain->GetNumberOfResidues()){
            mmdb::Residue *res = chain->GetResidue(resNo);
            if(res){
                mmdb::Atom *ca = res->GetAtom("CA");
                if(ca){
                    xyz.push_back(ca->x);
                    xyz.push_back(ca->y);
                    xyz.push_back(ca->z);
                    return xyz;
                }
            }
        }
    }

    return xyz;
}

std::vector<double> getXYZSeqNumInsCode(const std::string &pdb_file_name, const std::string &chainID, int seqNum, const std::string insCode){

    std::vector<double> xyz;

    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    const char *filename_cp = pdb_file_name.c_str();
    const char *chainID_cp = chainID.c_str();
    const char *insCode_cp = insCode.c_str();

    printf("Reading a PDB file: %s\n",filename_cp);
    int RC = molHnd->ReadCoorFile(filename_cp);
    assert(RC==0);

    int selHnd = molHnd->NewSelection();

    mmdb::Chain *chain = molHnd->GetChain (1, chainID_cp );

    if(chain){
        mmdb::Residue *res = chain->GetResidue(seqNum,insCode_cp);
        if(res){
            mmdb::Atom *ca = res->GetAtom("CA");
            if(ca){
                xyz.push_back(ca->x);
                xyz.push_back(ca->y);
                xyz.push_back(ca->z);
                return xyz;
            }
        }
    }

    return xyz;
}

std::vector<std::string> mmdb2_example(const std::string &filename){

    std::vector<std::string> ligandTypes;

    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();


    const char *filename_cp = filename.c_str();

    printf("Reading a PDB file: %s\n",filename_cp);
    int RC = molHnd->ReadCoorFile(filename_cp);
    assert(RC==0);

    int selHnd = molHnd->NewSelection();
    molHnd->SelectAtoms(selHnd, 0,"*",mmdb::ANY_RES,"*",mmdb::ANY_RES,"*","*","CA","C","*",mmdb::SKEY_NEW);

    mmdb::Atom** SelAtoms=0;
    int nAtoms;
    molHnd->GetSelIndex(selHnd,SelAtoms,nAtoms);

    int selHndLigand = molHnd->NewSelection();
    molHnd->Select(selHndLigand,mmdb::STYPE_RESIDUE,"/*/*/*",mmdb::SKEY_NEW);
    molHnd->Select(selHndLigand,mmdb::STYPE_RESIDUE,"/*/*/(GLY,ALA,VAL,PRO,SER,THR,LEU,ILE,CYS,ASP,GLU,ASN,GLN,ARG,LYS,MET,MSE,HIS,PHE,TYR,TRP,HCS,ALO,PDD,UNK,DA,DC,DG,DT,A,G,I,U,T,C,YG,PSU,Ad,Cd,Gd,Td,ADE,CYT,GUA,INO,THY,URA,AMP,ADP,ATP,CMP,CDP,CTP,GMP,GDP,GTP,TMP,TDP,TTP,HOH,H2O,WAT,SOL,DOD,D2O,CL,AR,CA,CD,CO,CR,CU,FE,GD,HG,IR,K,MG,MN,NA,UR,ZN,SUL)",mmdb::SKEY_XOR);
    mmdb::Residue** SelResLigand=0;
    int nResLigand;
    molHnd->GetSelIndex(selHndLigand,SelResLigand,nResLigand);
    printf("  Selected %d ligand residues\n",nResLigand);
    for(int ires=0;ires<nResLigand;ires++){
        printf("    %s\n",SelResLigand[ires]->name);
        ligandTypes.push_back(std::string(SelResLigand[ires]->name));
    }

    printf("Selected %d atoms\n",nAtoms);
    return ligandTypes;
}

std::vector<double> get_CA_bvalues_from_file(const std::string& pdb_file_name){

    std::vector<double> bvals;

    mmdb::Manager *molHnd = new mmdb::Manager();

    const char *filename_cp = pdb_file_name.c_str();

    printf("Reading a PDB file: %s\n",filename_cp);
    int RC = molHnd->ReadCoorFile(filename_cp);
    printf("RC:%d\n",RC);
    assert(RC==0);

    int selHnd = molHnd->NewSelection();
    molHnd->SelectAtoms(selHnd, 0,"*",mmdb::ANY_RES,"*",mmdb::ANY_RES,"*","*","CA","C","*",mmdb::SKEY_NEW);

    mmdb::Atom** SelAtoms=0;
    int nAtoms;
    molHnd->GetSelIndex(selHnd,SelAtoms,nAtoms);
    printf("nAtoms:%d\n",nAtoms);
    for(int i=0;i<nAtoms;i++){
        bvals.push_back(SelAtoms[i]->tempFactor);
    }

    return bvals;
}

std::vector<std::string>  get_mtz_columns(const std::string& mtz_file_name){
    const char *filename_c = mtz_file_name.c_str();
    header_info hinfo((char*)filename_c);
    std::vector<std::vector<std::string> > theTypes = hinfo.GetUnsortedHeadersAndTypes();
    std::vector<std::string> shortTypes;
    for(unsigned ityp=0;ityp<theTypes.size();ityp++){
        shortTypes.push_back(theTypes[ityp][0]);
        shortTypes.push_back(theTypes[ityp][1]);
    }
    return shortTypes;

}

clipper::Xmap<float> clipper_example_with_cols(const std::string& mtz_file_name, const std::string &f_col, const std::string &phi_col, const float rate_in){
    clipper::CCP4MTZfile mtzin;

    printf("Reading an MTZ file\n");
    fprintf(stderr,"This is testing that fprintf(stderr,...) works\n");
    std::cerr << "This is testing that std::cerr << ... works " << std::endl;

    float rate = rate_in;

    clipper::HKL_info myhkl; 
    clipper::MTZdataset myset; 
    clipper::MTZcrystal myxtl; 

    mtzin.open_read( mtz_file_name );       // open new file 
    mtzin.import_hkl_info( myhkl );         // read sg, cell, reso, hkls
    clipper::HKL_data< clipper::datatypes::F_sigF<float> >   f_sigf_data(myhkl, myxtl);
    clipper::HKL_data< clipper::datatypes::Phi_fom<float> > phi_fom_data(myhkl, myxtl);
    clipper::HKL_data< clipper::datatypes::F_phi<float> >       fphidata(myhkl, myxtl);

    clipper::String dataname;
    if(f_col.find('/')==std::string::npos){
        dataname = "/*/*/[" + f_col + " " + phi_col + "]";
    } else {
        size_t last_slash = f_col.rfind('/')+1;
        clipper::String crystal_name = f_col.substr(0,last_slash);
        clipper::String f_col_end = f_col.substr(last_slash);
        clipper::String phi_col_end = phi_col.substr(last_slash);
        size_t last_space = f_col_end.rfind(' ');
        if(last_space!=std::string::npos){
            f_col_end = f_col_end.substr(0,last_space);
        }
        last_space = phi_col_end.rfind(' ');
        if(last_space!=std::string::npos){
            phi_col_end = phi_col_end.substr(0,last_space);
        }
        dataname = crystal_name + "[" + f_col_end + "," + phi_col_end + "]";
    }

    mtzin.import_hkl_data( fphidata, myset, myxtl, dataname );
    mtzin.close_read();

    clipper::Xmap<float> xmap;

    std::cout << "finding ASU unique map points..." << std::endl;
    xmap.init( myhkl.spacegroup(), myhkl.cell(),
            clipper::Grid_sampling( myhkl.spacegroup(),
                myhkl.cell(),
                myhkl.resolution(),rate ) );
    std::cout << "Grid..." << std::string(xmap.grid_sampling().format()).c_str() << "\n";

    std::cout << "doing fft..." << std::endl;
    xmap.fft_from( fphidata );                  // generate map
    std::cout << "done fft..." << std::endl;

    return xmap;
}

clipper::Xmap<float> clipper_example(const std::string& mtz_file_name){
    std::string f_col = std::string("FC");
    std::string phi_col = std::string("PHIC");
    return clipper_example_with_cols(mtz_file_name,f_col,phi_col,2.0);
}

EMSCRIPTEN_BINDINGS(my_module) {
    register_vector<std::string>("VectorString");
    register_vector<double>("VectorDouble");
    register_vector<float>("VectorFloat");
    register_vector<int>("VectorInt");
    register_vector<char>("VectorChar");
    function("initialize_cif_pdb",&initialize_cif_pdb);
    function("multiply",&multiply);
    function("mmdb2_example",&mmdb2_example);
    class_<clipper::Cell_descr>("Cell_descr")
    .constructor<const clipper::ftype&, const clipper::ftype&, const clipper::ftype&, const clipper::ftype&, const clipper::ftype&, const clipper::ftype&>()
    .function("a", &clipper::Cell_descr::a)
    .function("b", &clipper::Cell_descr::b)
    .function("c", &clipper::Cell_descr::c)
    .function("alpha", &clipper::Cell_descr::alpha)
    .function("beta", &clipper::Cell_descr::beta)
    .function("gamma", &clipper::Cell_descr::gamma)
    .function("alpha_deg", &clipper::Cell_descr::alpha_deg)
    .function("beta_deg", &clipper::Cell_descr::beta_deg)
    .function("gamma_deg", &clipper::Cell_descr::gamma_deg)
    .function("format", &clipper::Cell_descr::format)
    ;
    class_<clipper::Cell, base<clipper::Cell_descr>>("Cell")
    .constructor()
    .constructor<const clipper::Cell_descr &>()
    .function("a_star", &clipper::Cell::a_star)
    .function("b_star", &clipper::Cell::b_star)
    .function("c_star", &clipper::Cell::c_star)
    .function("alpha_star", &clipper::Cell::alpha_star)
    .function("beta_star", &clipper::Cell::beta_star)
    .function("gamma_star", &clipper::Cell::gamma_star)
    .function("descr", &clipper::Cell::descr)
    .function("is_null", &clipper::Cell::is_null)
    .function("init", &clipper::Cell::init)
    ;
    class_<clipper::Xmap_base>("Xmap_base")
    .function("cell", &clipper::Xmap_base::cell)
    ;
    class_<clipper::String>("Clipper_String")
    .constructor()
    .constructor<const std::string>()
    ;
    class_<clipper::Xmap<float>, base<clipper::Xmap_base>>("Xmap_float")
    .constructor()
    ;
    class_<clipper::CCP4MAPfile>("CCP4MAPfile")
    .constructor()
    .function("open_read",&clipper::CCP4MAPfile::open_read)
    .function("open_write",&clipper::CCP4MAPfile::open_write)
    .function("close_read",&clipper::CCP4MAPfile::close_read)
    .function("close_write",&clipper::CCP4MAPfile::close_write)
    ;
    function("clipper_example",&clipper_example);
    function("get_mtz_columns",&get_mtz_columns);
    function("clipper_example_with_cols",&clipper_example_with_cols);
    function("printMapStats",&printMapStats);
    function("exportXMapToMapFile",&exportXMapToMapFile);
    function("clipperStringToString",&clipperStringToString);
    //function("superpose",&superpose_main);
    //function("gesamt",&gesamt_main);
    //function("get_annotated_glycans",&get_annotated_glycans);
    //function("get_annotated_glycans_hierarchical",&get_annotated_glycans_hierarchical);
    function("get_CA_bvalues_from_file",&get_CA_bvalues_from_file);
    function("getXYZResNo",&getXYZResNo);
    function("getXYZSeqNumInsCode",&getXYZSeqNumInsCode);

    function("gsl_sf_bessel_J0",&gsl_sf_bessel_J0);
    function("gsl_cdf_hypergeometric_P",&gsl_cdf_hypergeometric_P);

}
