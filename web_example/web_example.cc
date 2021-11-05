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

#include "clipper/clipper.h"
#include "clipper/clipper-ccp4.h"
#include "clipper/core/clipper_precision.h"
#include "clipper/clipper-cif.h"
#include "clipper/contrib/sfweight.h"
#include "clipper/clipper-mmdb.h"
#include "clipper/clipper-contrib.h"
#include "clipper/cns/cns_map_io.h"

using namespace emscripten;

int initialize_cif_pdb(const std::string& cif_file_name, const std::string& pdb_file_name, int is_diff_map, float rate){
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

    clipper::Map_stats stats(xmap);

    std::cout << "Mean and sigma of map from CIF file (make_map_from_pdb_mmcif): " << stats.mean() << " and " << stats.std_dev() << std::endl;  std::cout.flush();

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

    std::cout << "Min and max of map from CIF file (make_map_from_pdb_mmcif): " << min << " and " << max << std::endl;  std::cout.flush();

    return 0;


}

int multiply(int i1, int i2){
    std::vector<int> a;
    std::cout << "Using a vector" << std::endl;
    a.push_back(i1);
    a.push_back(i2);
    return a[0]*a[1];
}

int mmdb2_example(const std::string &filename){
    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();

    const char *filename_cp = filename.c_str();

    printf("Reading a PDB file: %s\n",filename_cp);
    int RC = molHnd->ReadCoorFile(filename_cp);
    assert(RC==0);

    int selHnd = molHnd->NewSelection();
    molHnd->SelectAtoms(selHnd, 0,"*",mmdb::ANY_RES,"*",mmdb::ANY_RES,"*","*","CA","C","*",mmdb::SKEY_NEW);

    mmdb::Atom** SelAtoms;
    int nAtoms;
    molHnd->GetSelIndex(selHnd,SelAtoms,nAtoms);

    printf("Selected %d atoms\n",nAtoms);
    return nAtoms;
}

int clipper_example(const std::string& mtz_file_name){
    clipper::CCP4MTZfile mtzin;

    printf("Reading an MTZ file\n");
    fprintf(stderr,"This is testing that fprintf(stderr,...) works\n");
    std::cerr << "This is testing that std::cerr << ... works " << std::endl;

    float rate = 0.75;

    std::string f_col = std::string("FC");
    std::string phi_col = std::string("PHIC");

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
    return 0;
}

EMSCRIPTEN_BINDINGS(my_module) {
    function("initialize_cif_pdb",&initialize_cif_pdb);
    function("multiply",&multiply);
    function("mmdb2_example",&mmdb2_example);
    function("clipper_example",&clipper_example);
}
