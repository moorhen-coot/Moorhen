#pragma once

// Shared includes, structs, and helper functions for moorhen wrappers.
// Extracted from the original monolithic moorhen-wrappers.cc.

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
#include <zlib.h>
#include <unistd.h>
#include <cmath>

#include <filesystem>
#include <complex>
#include <iostream>
#include <string>
#include <vector>
#include <random>
#include <ctime>
#include <cstdlib>
#include <fstream>
#include <utility>
#include <cctype>
#include <gemmi/mmdb.hpp>
#include <gemmi/mmcif.hpp>
#include <gemmi/to_mmcif.hpp>
#include <gemmi/to_cif.hpp>
#include <gemmi/read_cif.hpp>
#include <gemmi/topo.hpp>

#include "rotarama.hpp"
#include "slicendice_cpp/kmeans.h"
#include "slicendice_cpp/agglomerative.h"
#include "slicendice_cpp/birch.h"
#include "slicendice_cpp/pae_igraph.h"
#include "Eigen/Dense"

#include "conkit/conkit_validate.h"
#include "json/json.h"

#include <math.h>
#ifndef M_PI
#define M_PI           3.14159265358979323846
#endif

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "geometry/residue-and-atom-specs.hh"
#include "ligand/chi-angles.hh"
#include "ligand/primitive-chi-angles.hh"
#include "ligand/rotamer.hh"
#include "api/interfaces.hh"
#include "api/molecules-container.hh"
#include "api/validation-information.hh"
#include "api/header-info.hh"
#include "coot-utils/g_triangle.hh"
#include "coot-utils/vertex.hh"
#include "coot-utils/coot-map-utils.hh"
#include "coot-utils/coot-align.hh"

#include "mmdb2/mmdb_manager.h"
#include "clipper/core/ramachandran.h"
#include "clipper/clipper-ccp4.h"

#include "cartesian.h"
#include "geomutil.h"
#include "matrix.h"



#include "smilestopdb.h"
using namespace emscripten;

#include "privateer-wrappers.h"

#include "headers.h"

extern "C" {
void untar(FILE *a, const char *path);
}

inline bool is64bit(){
#ifdef _MOORHEN_MEMORY64_
     return true;
#else
     return false;
#endif
}

namespace moorhen {
    inline void ltrim_inplace(std::string &s, const char cht='\0') {
        s.erase(s.begin(), std::find_if(s.begin(), s.end(), [cht](unsigned char ch) {
            if(cht!='\0') {
                return ch != cht;
            } else {
                return !std::isspace(ch);
            }
        }));
    }
    inline void rtrim_inplace(std::string &s, const char cht='\0') {
        s.erase(std::find_if(s.rbegin(), s.rend(), [cht](unsigned char ch) {
            if(cht!='\0') {
                return ch != cht;
            } else {
                return !std::isspace(ch);
            }
        }).base(), s.end());
    }
    inline std::string ltrim(const std::string &s, const char cht='\0'){
        std::string s_copy = s;
        ltrim_inplace(s_copy,cht);
        return s_copy;
    }
    inline std::string rtrim(const std::string &s, const char cht='\0'){
        std::string s_copy = s;
        rtrim_inplace(s_copy,cht);
        return s_copy;
    }
    static bool ends_with(std::string_view str, std::string_view suffix) {
        return str.size() >= suffix.size() && str.compare(str.size()-suffix.size(), suffix.size(), suffix) == 0;
    }

    static bool starts_with(std::string_view str, std::string_view prefix) {
        return str.size() >= prefix.size() && str.compare(0, prefix.size(), prefix) == 0;
    }
}

struct CoordinateHeaderInfo {
    std::string title;
    std::map<std::string,std::vector<std::string>> author;
    std::map<std::string,std::vector<std::string>> journal;
    std::string software;
    std::string compound;
};

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

inline std::vector<std::string>  get_mtz_columns(const std::string& mtz_file_name){
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

inline std::string clipperStringAsString(const clipper::String &s){
    return static_cast<std::string>(s);
}

inline std::vector<coot::residue_spec_t> getSecondaryStructure(mmdb::Manager *m, int imodel=1){
    /* int_user_data is an int of secondary structure as defined in MMDB:

        enum SSE_FLAG  {
          SSE_None   = 0,
          SSE_Strand = 1,
          SSE_Bulge  = 2,
          SSE_3Turn  = 3,
          SSE_4Turn  = 4,
          SSE_5Turn  = 5,
          SSE_Helix  = 6
        };
    */

    std::vector<coot::residue_spec_t> v;
    mmdb::Model *mod = m->GetModel(imodel);
    mod->CalcSecStructure(0,-1);
    int nRes;
    mmdb::Residue **resTable=NULL;
    mod->GetResidueTable(resTable,nRes);
    for(int i=0;i<nRes;i++){
        coot::residue_spec_t cid;
        cid.model_number = imodel;
        cid.chain_id = std::string(resTable[i]->GetChainID());
        cid.res_no = resTable[i]->seqNum;
        cid.ins_code = resTable[i]->insCode;
        cid.int_user_data = resTable[i]->SSE;
        v.push_back(cid);
    }
    delete [] resTable;
    return v;
}

inline CoordinateHeaderInfo get_coord_header_info(const std::string& docData, const std::string& path){

    CoordinateHeaderInfo header_info;

    char *c_data = (char *)docData.c_str();
    const size_t size = docData.length();
    auto c_path = path.c_str();

    const auto st = gemmi::read_structure_from_char_array(c_data,size,path);

    header_info.author["primary"] = st.meta.authors;
    header_info.journal["primary"] = std::vector<std::string>();

    std::vector<std::string> soft_strings;
    for(const auto& soft : st.meta.software){
        std::string soft_str = soft.name;
        if((soft.version.length()>0)||(soft.date.length()>0)){
            soft_str += " (";
            if((soft.version.length()>0)){
                soft_str += soft.version;
            }
            if((soft.version.length()>0)&&(soft.date.length()>0)){
                soft_str += ", ";
            }
            if((soft.date.length()>0)){
                soft_str += soft.date;
            }
            soft_str += ")";
        }
        soft_strings.push_back(soft_str);
    }

    if(soft_strings.size()>0){
        header_info.software = std::accumulate(++soft_strings.begin(), soft_strings.end(), soft_strings[0],
                     [](const std::string& a, const std::string& b){
                           return a + ", " + b;
                     });
    }

    auto have_compound_card = false;

    for(const auto& rem : st.raw_remarks){
        if (rem.rfind("REMARK 400", 0) == 0) {
            const auto rem_copy = moorhen::rtrim(rem);
            const auto len = std::string("REMARK 400").length();
            if((!have_compound_card) && (rem_copy.length()==len)){
                continue;
            }
            if(rem_copy==std::string("REMARK 400 COMPOUND")){
                have_compound_card = true;
                continue;
            }
            header_info.compound += moorhen::ltrim(rem_copy.substr(len))+"\n";
        }
    }

    for(const auto& kv : st.info){
        if(kv.first=="_struct.title"){
            header_info.title = kv.second;
            break;
        }
    }

    if(moorhen::ends_with(path,"cif")){
        auto doc = gemmi::cif::read_string(docData);
        for (gemmi::cif::Block& block : doc.blocks){

            if(block.find_loop_item("_citation_author.citation_id")){
                header_info.author.clear();
                auto& loop = block.find_loop_item("_citation_author.citation_id")->loop;
                for(const auto& row : block.find_mmcif_category("_citation_author.")){
                    if(row.size()==loop.tags.size()){
                        auto id_pos = std::find(loop.tags.begin(), loop.tags.end(), "_citation_author.citation_id");
                        auto name_pos = std::find(loop.tags.begin(), loop.tags.end(), "_citation_author.name");
                        if(id_pos != loop.tags.end() && name_pos != loop.tags.end()){
                            auto pos_index = std::distance(loop.tags.begin(), id_pos);
                            //if(row[pos_index]=="primary"){
                            if(header_info.author.count(row[pos_index])==0)
                                header_info.author[row[pos_index]] = std::vector<std::string>();
                            auto name_index = std::distance(loop.tags.begin(), name_pos);
                            header_info.author[row[pos_index]].push_back(moorhen::rtrim(moorhen::ltrim(row[name_index],'\''),'\''));
                            //}
                        }
                    }
                }
            }

            if(block.find_loop_item("_citation.id")){
                auto& loop = block.find_loop_item("_citation.id")->loop;
                for(const auto& row : block.find_mmcif_category("_citation.")){
                    if(row.size()==loop.tags.size()){
                        auto pos = std::find(loop.tags.begin(), loop.tags.end(), "_citation.id");
                        if(pos != loop.tags.end()){
                            auto index = std::distance(loop.tags.begin(), pos);
                            //if(row[index]=="primary"){
                            if(header_info.journal.count(row[index])==0)
                                header_info.journal[row[index]] = std::vector<std::string>();
                            int ipos=0;
                            for(const auto& s : row){
                                if(s!="?"){
                                    header_info.journal[row[index]].push_back(loop.tags[ipos].substr(std::string("_citation.").length())+":"+std::string((40-loop.tags[ipos].length()),' ')+moorhen::rtrim(moorhen::ltrim(s,'\''),'\''));
                                }
                                ipos++;
                            }
                            //}
                        }
                    }
                }
            } else {
                header_info.journal["primary"] = std::vector<std::string>();
                for(const auto& item : block.items){
                    if (item.type == gemmi::cif::ItemType::Pair){
                        if(moorhen::starts_with(item.pair[0],"_citation.")){
                            if(item.pair[1]!="?"){
                                header_info.journal["primary"].push_back(item.pair[0].substr(std::string("_citation.").length())+":"+std::string((40-item.pair[0].length()),' ')+moorhen::rtrim(moorhen::ltrim(item.pair[1],'\''),'\''));
                            }
                        }
                    }
                }
            }
            for(const auto& item : block.items){
                if (item.type == gemmi::cif::ItemType::Pair){
                    if(item.pair[0]=="_pdbx_entry_details.compound_details"){
                        const auto trimmed = moorhen::rtrim(moorhen::ltrim(item.pair[1],'\''),'\'');
                        if(trimmed != "?"){
                            header_info.compound += trimmed;
                        }
                    }
                }
            }
        }
    }

    return header_info;

}


inline std::map<std::string,std::vector<coot::simple_rotamer> > getRotamersMap(){

    std::map<std::string,std::vector<coot::simple_rotamer> > all_rots;

    std::vector<std::string> rotamerAcids = {"VAL","PRO","SER","THR","LEU","ILE","CYS","ASP","GLU","ASN","GLN","ARG","LYS","MET","MSE","HIS","PHE","TYR","TRP"};

    coot::rotamer rot(0);

    for(unsigned ia=0;ia<rotamerAcids.size();ia++){
        std::vector<coot::simple_rotamer> rots =  rot.get_rotamers(rotamerAcids[ia], 0.001);
        all_rots[rotamerAcids[ia]] = rots;
    }

    return all_rots;
}

/*
//Next 2 are test functions.
inline void TakeStringIntPairVector(const std::vector<std::pair<std::string, unsigned int> > &theVec){
    for(auto el : theVec){
        std::cout << el.first << " " << el.second << std::endl;
    }
}

inline void TakeColourMap(const std::map<unsigned int, std::array<float, 3>> &theMap){
    for(auto el : theMap){
        std::cout << el.first << " " << el.second[0] << " " << el.second[1] << " " << el.second[2] << std::endl;
    }
}
*/

/*
*/

struct moorhen_hbond {
      int hb_hydrogen; // McDonald and Thornton H-bond algorithm

      double angle_1;  // degrees
      double angle_2;
      double angle_3;
      double dist;  // H-bond length
      bool ligand_atom_is_donor; // for use when hb_hydrogen is NULL -
                                 // no hydrogens in H-bond analysis.
      bool hydrogen_is_ligand_atom;
      bool bond_has_hydrogen_flag;

      struct moorhen_hbond_atom {
          int serial;
          double x, y, z;
          double charge, occ, b_iso;
          std::string element;
          std::string name;
          int model;
          std::string chain;
          int resNum;
          std::string residueName;
          std::string altLoc;
      };

      moorhen_hbond_atom donor;
      moorhen_hbond_atom acceptor;
      moorhen_hbond_atom donor_neigh;
      moorhen_hbond_atom acceptor_neigh;

};

coot::simple_mesh_t GenerateMoorhenMetaBalls(mmdb::Manager *molHnd, const std::string &cid_str, float gridSize, float radius, float isoLevel, int n_threads=4);
coot::simple_mesh_t GenerateMoorhenMetaBallsCootInstancedMesh(const coot::instanced_mesh_t &spheres_mesh, float gridSize, float r, float isoLevel, int n_threads=4);

coot::instanced_mesh_t DrawSugarBlocks(mmdb::Manager *molHnd, const std::string &cid_str);
bool isSugar(const std::string &resName);

class molecules_container_js : public molecules_container_t {
    public:
        explicit molecules_container_js(bool verbose=true) : molecules_container_t(verbose) {
        }

        std::string get_validation(int imol){
            mmdb::Manager *mol = get_mol(imol);
            auto st = gemmi::copy_from_mmdb(mol);
            size_t model_index = 0;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs_bonds;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs_angles;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs_torsions;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs_chirals;
            std::map<gemmi::Atom*, std::vector<double>> atom_zs_planes;
            for (gemmi::Chain& chain : st.models[model_index].chains) {
                for (gemmi::Residue& res : chain.residues) {
                    for (gemmi::Atom& atom : res.atoms) {
                        atom.name = moorhen::ltrim(moorhen::rtrim(atom.name));
                        atom_zs[&atom] = std::vector<double>();
                        atom_zs_bonds[&atom] = std::vector<double>();
                        atom_zs_angles[&atom] = std::vector<double>();
                        atom_zs_torsions[&atom] = std::vector<double>();
                        atom_zs_chirals[&atom] = std::vector<double>();
                        atom_zs_planes[&atom] = std::vector<double>();
                    }
                }
            }
            gemmi::MonLib monlib;
            std::filesystem::path ccp4_lib(std::getenv("CCP4_LIB"));
            auto monomer_dir = ccp4_lib / "data" / "monomers";
            auto resnames = st.models[model_index].get_all_residue_names();
            gemmi::Logger logger;
            monlib.read_monomer_lib(monomer_dir, resnames, logger);
            auto hchange = gemmi::HydrogenChange::NoChange;
            auto reorder = false;
            auto topo = gemmi::prepare_topology(st, monlib, model_index, hchange, reorder);
            for (const auto& bond : topo->bonds) {
                double z = bond.calculate_z();
                atom_zs[bond.atoms[0]].push_back(z);
                atom_zs[bond.atoms[1]].push_back(z);
                atom_zs_bonds[bond.atoms[0]].push_back(z);
                atom_zs_bonds[bond.atoms[1]].push_back(z);
            }
            for (const auto& angle : topo->angles) {
                double z = angle.calculate_z();
                atom_zs[angle.atoms[0]].push_back(z);
                atom_zs[angle.atoms[1]].push_back(z);
                atom_zs[angle.atoms[2]].push_back(z);
                atom_zs_angles[angle.atoms[0]].push_back(z);
                atom_zs_angles[angle.atoms[1]].push_back(z);
                atom_zs_angles[angle.atoms[2]].push_back(z);
            }
            for (const auto& torsion : topo->torsions) {
                // Some torsions are only restrained with planes so check esd
                if (torsion.restr->esd > 0.0) {
                    double z = torsion.calculate_z();
                    atom_zs[torsion.atoms[0]].push_back(z);
                    atom_zs[torsion.atoms[1]].push_back(z);
                    atom_zs[torsion.atoms[2]].push_back(z);
                    atom_zs[torsion.atoms[3]].push_back(z);
                    atom_zs_torsions[torsion.atoms[0]].push_back(z);
                    atom_zs_torsions[torsion.atoms[1]].push_back(z);
                    atom_zs_torsions[torsion.atoms[2]].push_back(z);
                    atom_zs_torsions[torsion.atoms[3]].push_back(z);
                }
            }
            for (const auto& plane : topo->planes) {
                const auto abcd = gemmi::find_best_plane(plane.atoms);
                for (const auto &atom : plane.atoms)
                {
                    const double dist = gemmi::get_distance_from_plane(atom->pos, abcd);
                    atom_zs[atom].push_back(dist / plane.restr->esd);
                    atom_zs_planes[atom].push_back(dist / plane.restr->esd);
                }
            }
            for (const auto& chir : topo->chirs) {
                static const double esd = 0.1;
                const double ideal = topo->ideal_chiral_abs_volume(chir);
                const double z = chir.calculate_z(ideal, esd);
                atom_zs[chir.atoms[0]].push_back(z);
                atom_zs[chir.atoms[1]].push_back(z);
                atom_zs[chir.atoms[2]].push_back(z);
                atom_zs[chir.atoms[3]].push_back(z);
                atom_zs_chirals[chir.atoms[0]].push_back(z);
                atom_zs_chirals[chir.atoms[1]].push_back(z);
                atom_zs_chirals[chir.atoms[2]].push_back(z);
                atom_zs_chirals[chir.atoms[3]].push_back(z);
            }

            Json::Value root;

            static const std::filesystem::path rotarama_data("data/rotarama/");
            static const Rota rota(rotarama_data);
            static const Rama rama(rotarama_data);

            for (auto& chain : st.models[model_index].chains) {
                Json::Value chain_json;
                int res_idx = 0;
                for (auto& res : chain.residues) {
                    const auto prev_res = chain.previous_residue(res);
                    const auto next_res = chain.next_residue(res);

                    Json::Value res_json;
                    res_json["name"] = res.name;
                    res_json["seqNum"] = res.seqid.num.value;
                    res_json["insCode"] = std::string{res.seqid.icode};
                    std::vector<double> res_zs;
                    std::vector<double> res_zs_bonds;
                    std::vector<double> res_zs_angles;
                    std::vector<double> res_zs_chirals;
                    std::vector<double> res_zs_planes;
                    std::vector<double> res_zs_torsions;
                    for (auto& atom : res.atoms) {
                        auto& zs = atom_zs[&atom];
                        res_zs.insert(res_zs.end(), zs.begin(), zs.end());

                        auto& zs_bonds = atom_zs_bonds[&atom];
                        res_zs_bonds.insert(res_zs_bonds.end(), zs_bonds.begin(), zs_bonds.end());

                        auto& zs_angles = atom_zs_angles[&atom];
                        res_zs_angles.insert(res_zs_angles.end(), zs_angles.begin(), zs_angles.end());

                        auto& zs_chirals = atom_zs_chirals[&atom];
                        res_zs_chirals.insert(res_zs_chirals.end(), zs_chirals.begin(), zs_chirals.end());

                        auto& zs_planes = atom_zs_planes[&atom];
                        res_zs_planes.insert(res_zs_planes.end(), zs_planes.begin(), zs_planes.end());

                        auto& zs_torsions = atom_zs_torsions[&atom];
                        res_zs_torsions.insert(res_zs_torsions.end(), zs_torsions.begin(), zs_torsions.end());

                    }

                    double z = gemmi::calculate_data_statistics(res_zs).rms;

                    double z_bonds = gemmi::calculate_data_statistics(res_zs_bonds).rms;
                    double z_angles = gemmi::calculate_data_statistics(res_zs_angles).rms;
                    double z_chirals = gemmi::calculate_data_statistics(res_zs_chirals).rms;
                    double z_planes = gemmi::calculate_data_statistics(res_zs_planes).rms;
                    double z_torsions = gemmi::calculate_data_statistics(res_zs_torsions).rms;

                    res_json["Overall RMSZ"] = z;
                    res_json["Bond RMSZ"] = z_bonds;
                    res_json["Angle RMSZ"] = z_angles;
                    res_json["Chiral RMSZ"] = z_chirals;
                    res_json["Plane RMSZ"] = z_planes;
                    res_json["Torsion RMSZ"] = z_torsions;
                    res_json["Rama. ZScore"] = rama.score(*prev_res, res, *next_res);
                    res_json["Rota. ZScore"] = rota.score(res);
                    chain_json[res_idx++] = res_json;
                }
                root[chain.name] = chain_json;
            }
            
            Json::StreamWriterBuilder builder;
            const std::string json_string = Json::writeString(builder, root);
            
            return json_string;
        }

        std::string molecule_to_mmCIF_string_with_gemmi(int imol){
            mmdb::Manager *mol = get_mol(imol);
            auto st = gemmi::copy_from_mmdb(mol);
            std::ostringstream os;
            gemmi::cif::write_cif_to_stream(os, gemmi::make_mmcif_document(st));
            os.flush();
            std::string s = os.str();
            return s;
        }

        std::vector<std::pair<std::string,int>> slicendice_slice(int imol, int nclusters, const std::string &clustering_method, const std::string &pae_contents_string){

            std::vector<std::pair<std::string,int>> cid_label_pair;
            mmdb::Manager *mol = get_mol(imol);
            gemmi::Structure st = gemmi::copy_from_mmdb(mol);
            gemmi::setup_entities(st);
            gemmi::remove_ligands_and_waters(st);
            std::string molecule_type = "protein";

            std::vector<std::pair<std::string,std::array<float,3>>> atoms;

            for(const auto &model : st.models){
                for(const auto &chain : model.chains){
                    for(const auto &residue : chain.residues){
                        //FIXME molecule_type should be changeable and mixed, nucleic should be allowed.
                        bool doneThisRes = false;
                        for (const gemmi::Atom& atom : residue.atoms){
                            //std::cout << "--" << atom.name << "--" << std::endl;
                            std::string s = atom.name;
                            s.erase(std::remove_if(s.begin(), s.end(), ::isspace), s.end());
                            if (molecule_type == "protein" && s == "CA" && !doneThisRes) {
                                std::array<float,3> at;
                                at[0] = atom.pos.x;
                                at[1] = atom.pos.y;
                                at[2] = atom.pos.z;
                                std::stringstream cidbuffer;
                                cidbuffer << "/" << model.num << "/" << chain.name << "/" << residue.seqid.num.value;
                                if(residue.seqid.icode!=' ')
                                    cidbuffer << "." << residue.seqid.icode;
                                const std::string cid = cidbuffer.str();
                                std::pair<std::string,std::array<float,3>> thePair;
                                thePair.first = cid;
                                thePair.second = at;
                                atoms.push_back(thePair);
                                doneThisRes = true;
                            }
                        }
                    }
                }
            }
            std::cout << "slicendice_slice atoms.size() " << atoms.size() << std::endl;

            if(atoms.size()>0){
                Eigen::VectorXi labels;
                Eigen::MatrixXd atomic_matrix(atoms.size(), 3);

                for (int i = 0; i < atoms.size(); i++) {
                    atomic_matrix(i, 0) = atoms[i].second[0];
                    atomic_matrix(i, 1) = atoms[i].second[1];
                    atomic_matrix(i, 2) = atoms[i].second[2];
                }

                if (clustering_method == "kmeans") {
                    KMeans kmeans(nclusters);
                    kmeans.fit(atomic_matrix);
                    labels = kmeans.labels_;
                } else if (clustering_method == "agglomerative") {
                    Agglomerative agglomerative(nclusters);
                    agglomerative.fit(atomic_matrix);
                    labels = agglomerative.labels_;
                } else if (clustering_method == "birch") {
                    Birch birch(nclusters);
                    birch.fit(atomic_matrix);
                    labels = birch.labels_;
                } else if (clustering_method == "pae") {
                    std::string pae_file_name = generate_rand_str(32);
                    pae_file_name += ".json";
                    write_text_file(pae_file_name, pae_contents_string);
                    PAE pae(nclusters, pae_file_name);
                    pae.fit(atomic_matrix);
                    labels = pae.labels_;
                } else {
                    std::cout << "Clustering method: " << clustering_method << " not yet implemented." << std::endl;
                }

                for (int i = 0; i < labels.size(); i++) {
                    std::pair<std::string,int> thePair;
                    thePair.first = atoms[i].first;
                    thePair.second = labels[i];
                    //std::cout << "Adding " << thePair.first << " " << thePair.second << std::endl;
                    cid_label_pair.push_back(thePair);
                }
            }
            std::cout << "slicendice_slice return vector of size:" << cid_label_pair.size() << std::endl;
            return cid_label_pair;

        }

        std::vector<coot::residue_spec_t> GetSecondaryStructure(int imol, int imodel=1) {
            mmdb::Manager *mol = get_mol(imol);
            return getSecondaryStructure(mol,imodel);
        }

        coot::instanced_mesh_t DrawGlycoBlocks(int imol, const std::string &cid_str) {
            mmdb::Manager *mol = get_mol(imol);
            return DrawSugarBlocks(mol,cid_str);
        }

        std::vector<TableEntry> privateer_validate(int imol) {
            auto file_content = molecules_container_t::molecule_to_mmCIF_string(imol);
            auto results =  validate(file_content, "");
            return results;
        }

        coot::simple_mesh_t DrawMoorhenMetaBalls(int imol, const std::string &cid_str, float gridSize, float radius, float isoLevel, int n_threads=4) {
            //FIXME - pass in against_a_dark_background
            bool against_a_dark_background = false;
            coot::instanced_mesh_t spheres_mesh = get_bonds_mesh_for_selection_instanced(imol,cid_str,"VDW-BALLS",against_a_dark_background,0.1, 1.0, false, false, false, true, 1);

            return GenerateMoorhenMetaBallsCootInstancedMesh(spheres_mesh,gridSize,radius,isoLevel,n_threads);
        }

        std::pair<std::string, std::string> mol_text_to_pdb(const std::string &mol_text_cpp, const std::string &TLC, int nconf, int maxIters, bool keep_orig_coords, bool minimize) {
            return MolTextToPDB(mol_text_cpp, TLC, nconf, maxIters, keep_orig_coords, minimize);
        }

        std::pair<std::string, std::string> smiles_to_pdb(const std::string &smile_cpp, const std::string &TLC, int nconf, int maxIters) {
            return SmilesToPDB(smile_cpp, TLC, nconf, maxIters);
        }

        bool model_has_glycans(int imol) {
            mmdb::Manager *mol = get_mol(imol);
            int nmodels = mol->GetNumberOfModels();
            for (int imodel=1; imodel <= nmodels; imodel++) {
                mmdb::Model *model = mol->GetModel(imodel);
                int nchains = model->GetNumberOfChains();
                for (int ichain=0; ichain < nchains; ichain++) {
                    mmdb::Chain *chain = model->GetChain(ichain);
                    int nres = chain->GetNumberOfResidues();
                    for (int ires=0; ires<nres; ires++) {
                        mmdb::Residue *residue = chain->GetResidue(ires);
                        if (isSugar(residue->name)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        std::string generate_rand_str(const int &len) {
            const std::string charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            std::string rand_str;
            rand_str.reserve(len);

            std::random_device rand_dev;
            std::mt19937 gen(rand_dev());
            std::uniform_int_distribution<> distrib(0, charset.length() - 1);

            for (int i = 0; i < len; ++i) {
                int randomIndex = distrib(gen);
                rand_str += charset[randomIndex];
            }

            return rand_str;
        }

        std::string read_text_file(const std::string &file_name){
            std::string line;
            std::string file_contents;
            std::ifstream file_stream (file_name.c_str());

            if (file_stream.is_open()) {
                while(!file_stream.eof()) {
                    std::getline(file_stream, line);
                    file_contents += line + "\n";
                }
                file_stream.close();
            } else {
                std::cout << "Unable to open file";
            }

            return file_contents;
        }

        void write_text_file(const std::string &file_name, const std::string &file_contents) {
            std::ofstream file(file_name);
            if (file.is_open()) {
                file << file_contents;
                file.close();
            } else {
                std::cout << "Unable to open or create file '" << file_name << "' for writing." << std::endl;
            }
        }

        void remove_file(const std::string &file_name, const bool &verbose = false) {
            if (!std::filesystem::remove(file_name) && verbose) {
                std::cout << "file " << file_name << " not found!" << std::endl;
            } else if (verbose) {
                std::cout << "file " << file_name << " deleted" << std::endl;
            }
        }

        std::string get_molecule_atoms(int imol, const std::string &format) {
            std::string file_name = generate_rand_str(32);
            std::string pdb_data;
            try {
                if (format == "pdb") {
                    file_name += ".pdb";
                    writePDBASCII(imol, file_name);
                } else if (format == "mmcif") {
                    file_name += ".mmcif";
                    writeCIFASCII(imol, file_name);
                } else {
                    std::cout << "Unrecognised format " << format << std::endl;
                    return "";
                }
                const std::string pdb_data = read_text_file(file_name);
                remove_file(file_name);
                return pdb_data;
            }
            catch(const std::filesystem::filesystem_error& err) {
                std::cout << "Error: " << err.what() << std::endl;
            }
            return "";
        }

        std::string guess_coord_format(const std::string &file_contents) {
            char *c_data = (char *)file_contents.c_str();
            size_t size = file_contents.length();
            const char* end = c_data + size;

            int coor_format = int(gemmi::coor_format_from_content(c_data, end));

            std::string result;
            if (coor_format == 0) {
                result = "unk";
            } else if (coor_format == 1) {
                result = "unk";
            } else if (coor_format == 2) {
                result = "pdb";
            } else if (coor_format == 3) {
                result = "mmcif";
            } else if (coor_format == 4) {
                result = "mmjson";
            } else if (coor_format == 5) {
                result = "xml";
            }

            return result;
        }

        std::pair<int, std::string> read_coords_string(const std::string &pdb_string, const std::string &molecule_name) {
            std::string file_name = generate_rand_str(32);
            std::string coordFormat = guess_coord_format(pdb_string);
            file_name += "." + coordFormat;
            write_text_file(file_name, pdb_string);
            const int imol = molecules_container_t::read_pdb(file_name);
            remove_file(file_name);
            std::pair<int, std::string> result(imol, coordFormat);
            return result;
        }

        int read_dictionary_string (const std::string &dictionary_string, const int &associated_imol) {
            std::string file_name = generate_rand_str(32);
            file_name += ".cif";
            write_text_file(file_name, dictionary_string);
            const int imol = molecules_container_t::import_cif_dictionary(file_name, associated_imol);
            remove_file(file_name);
            return imol;
        }

        void replace_molecule_by_model_from_string (int imol, const std::string &pdb_string) {
            std::string file_name = generate_rand_str(32);
            if (pdb_string.find("data_") == 0) {
                file_name += ".mmcif";
            } else {
                file_name += ".pdb";
            }
            write_text_file(file_name, pdb_string);
            molecules_container_t::replace_molecule_by_model_from_file(imol, file_name);
            remove_file(file_name);
        }

        generic_3d_lines_bonds_box_t make_exportable_environment_bond_box(int imol, const std::string &chainID, int resNo,  const std::string &altLoc, float distanceCutoff) {
            coot::residue_spec_t resSpec(chainID,resNo,altLoc);
            return molecules_container_t::make_exportable_environment_bond_box(imol,resSpec,distanceCutoff);
        }

        std::vector<std::pair<int, int>> get_consecutive_ranges(const std::vector<int> &numbers) {
            std::vector<int> numbers_vec = numbers;
            std::sort(numbers_vec.begin(), numbers_vec.end());

            std::vector<std::pair<int, int>> ranges;
            if (!numbers_vec.empty()) {
                int start = numbers_vec[0];
                int end = numbers_vec[0];
                for (int i = 1; i < numbers_vec.size(); i++) {
                    int i_number = numbers_vec[i];
                    if (i_number == end + 1) {
                        end = i_number;
                    } else {
                        std::pair<int, int> i_pair(start, end);
                        ranges.push_back(i_pair);
                        start = i_number;
                        end = i_number;
                    }
                }
                std::pair<int, int> i_pair(start, end);
                ranges.push_back(i_pair);
            }

            return ranges;
        }

        // Returns a "||" separated string of cids.
        std::string get_neighbours_cid(int imol, const std::string &central_Cid_str, double max_dist){
            std::string neighb_cid = "";
            std::map<std::string, std::vector<int>> chainsResidues;
            mmdb::Manager *mol = get_mol(imol);
            const char * central_Cid = central_Cid_str.c_str();
            int central_SelHnd = mol->NewSelection();
            int neighb_SelHnd = mol->NewSelection();
            mol->Select(central_SelHnd, mmdb::STYPE_ATOM, central_Cid, mmdb::SKEY_NEW);
            int n_central_SelAtoms;
            mmdb::PPAtom central_SelAtom;
            mol->GetSelIndex(central_SelHnd, central_SelAtom, n_central_SelAtoms);
            mol->SelectNeighbours(neighb_SelHnd, mmdb::STYPE_RESIDUE, central_SelAtom, n_central_SelAtoms, 0.4, max_dist, mmdb::SKEY_NEW);
            int n_neighb_residues;
            mmdb::PPResidue neighb_residues;
            mol->GetSelIndex(neighb_SelHnd, neighb_residues, n_neighb_residues);
            for(int i=0; i<n_neighb_residues; i++){
                std::string chainId = std::string(neighb_residues[i]->GetChainID());
                if(!chainsResidues.count(chainId)){
                    std::vector<int> int_vec;
                    chainsResidues[chainId] = int_vec;
                }
                chainsResidues[chainId].push_back(neighb_residues[i]->GetSeqNum());
            }
            for (auto const& [key, val] : chainsResidues){
                auto residue_ranges = get_consecutive_ranges(val);
                for (int i=0; i < residue_ranges.size(); i++) {
                    auto i_residue_range = residue_ranges[i];
                    neighb_cid += std::string("//") + key + std::string("/") + std::to_string(i_residue_range.first) + "-" + std::to_string(i_residue_range.second) + std::string("/*||");
                }
            }
            neighb_cid = neighb_cid.substr(0,neighb_cid.length()-2);
            return neighb_cid;
        }

        std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>> get_symmetry_with_matrices(int imol, float symmetry_search_radius, float x, float y, float z) {
            coot::symmetry_info_t si = get_symmetry(imol, symmetry_search_radius, x, y, z);
            mmdb::Manager *mol = get_mol(imol);
            mmdb::Cryst *cryst = mol->GetCrystData();
            std::vector<std::array<float, 16>> matrices;
            mmdb::mat44 my_matt;
            mmdb::mat44 mol_to_origin_matt;

            for (unsigned i = 0; i < si.symm_trans.size(); i++) {

                symm_trans_t symm_trans = si.symm_trans[i].first;
                Cell_Translation cell_trans = si.symm_trans[i].second;

                cryst->GetTMatrix(mol_to_origin_matt, 0,
                              -cell_trans.us,
                              -cell_trans.vs,
                              -cell_trans.ws);

                cryst->GetTMatrix(my_matt,
                                         symm_trans.isym(),
                                         symm_trans.x(),
                                         symm_trans.y(),
                                         symm_trans.z());

                //m = mol_to_origin_matt * my_matt
                std::array<float, 16> theMat;
                int idx = 0;

                matrix mat1 = matrix(4,4);
                matrix mat2 = matrix(4,4);

                for(int j=0;j<4;j++){
                    for(int k=0;k<4;k++){
                        mat1(j,k) = my_matt[j][k];
                        mat2(j,k) = mol_to_origin_matt[j][k];
                    }
                }
                matrix mat3 = mat1 * mat2;

                for(int j=0;j<4;j++){
                    for(int k=0;k<4;k++){
                        theMat[idx] = mat3(k,j);
                        idx++;
                    }
                }

                matrices.push_back(theMat);
            }

            std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>> thePair;
            thePair.first = si;
            thePair.second = matrices;
            return thePair;
        }

        std::vector<float> getFloats(unsigned nFloats) {
            std::vector<float> fs;
            for(unsigned i=0;i<nFloats;i++){
                fs.push_back(i*1.0);
            }
            return fs;
        }
        int add(int ic) {
            return ic + 1;
        }
        int writePDBASCII(int imol, const std::string &file_name) {
            const char *fname_cp = file_name.c_str();
            return get_mol(imol)->WritePDBASCII(fname_cp);
        }
        int writeCIFASCII(int imol, const std::string &file_name) {
            const auto mol = get_mol(imol);
            mmdb::Manager *mol_copy  = new mmdb::Manager;
            mol_copy->Copy(mol, mmdb::MMDBFCM_All);
            int ierr = mol_copy->WriteCIFASCII(file_name.c_str());
            return ierr;
        }
        int writeCCP4Map(int imol, const std::string &file_name) {
            auto xMap = (*this)[imol].xmap;
            auto clipperMap = clipper::CCP4MAPfile();
            clipperMap.open_write(file_name);
            clipperMap.export_xmap(xMap);
            return 0;
        }
        int count_simple_mesh_vertices(const coot::simple_mesh_t &m) { return m.vertices.size(); }
        std::vector<float> go_to_blob_array(float x1, float y1, float z1, float x2, float y2, float z2, float contour_level){
            std::vector<float> o;
            std::pair<bool, clipper::Coord_orth> pp = molecules_container_t::go_to_blob(x1, y1, z1, x2, y2, z2, contour_level);
            if(pp.first){
                o.push_back(pp.second.x());
                o.push_back(pp.second.y());
                o.push_back(pp.second.z());
            }
            return o;
        }

        clipper::Spacegroup get_map_spacegroup(int imol){
            clipper::Spacegroup sg;
            if(is_valid_map_molecule(imol)){
                auto xMap = (*this)[imol].xmap;
                sg = xMap.spacegroup();
            }
            return sg;
        }


    std::pair<std::array<float,3>,float> get_map_bounding_sphere(int imol, double threshold)
    {
        auto xMap = (*this)[imol].xmap;
        clipper::Grid_sampling gs = xMap.grid_sampling();
        clipper::Cell cell = xMap.cell();

        std::pair<std::array<float,3>,float> result;
        std::array<float,3> center_array;

        int min_u = gs.nu(), max_u = 0;
        int min_v = gs.nv(), max_v = 0;
        int min_w = gs.nw(), max_w = 0;

        bool found = false;

        // ---- First pass: bounding box ----
        for (clipper::Xmap<float>::Map_reference_index ix = xMap.first();
            !ix.last(); ix.next())
        {
            if (xMap[ix] >= threshold)
            {
                found = true;
                clipper::Coord_grid cg = ix.coord();

                min_u = std::min(min_u, cg.u());
                min_v = std::min(min_v, cg.v());
                min_w = std::min(min_w, cg.w());

                max_u = std::max(max_u, cg.u());
                max_v = std::max(max_v, cg.v());
                max_w = std::max(max_w, cg.w());
            }
        }

        if (!found) {
            result.first = {0.0, 0.0, 0.0};
            result.second = 0.0;
            return result;
        }

        // Convert box corners to orthogonal coords
        auto to_orth = [&](int u, int v, int w) {
            return clipper::Coord_grid(u,v,w)
                .coord_frac(gs)
                .coord_orth(cell);
        };

        clipper::Coord_orth omin = to_orth(min_u, min_v, min_w);
        clipper::Coord_orth omax = to_orth(max_u, max_v, max_w);

        // Center = midpoint of box
        clipper::Coord_orth center(
            0.5 * (omin.x() + omax.x()),
            0.5 * (omin.y() + omax.y()),
            0.5 * (omin.z() + omax.z())
        );

        // ---- Second pass: max radius ----
        double r2_max = 0.0;

        for (clipper::Xmap<float>::Map_reference_index ix = xMap.first();
            !ix.last(); ix.next())
        {
            if (xMap[ix] >= threshold)
            {
                clipper::Coord_orth pos =
                    ix.coord().coord_frac(gs).coord_orth(cell);

                double dx = pos.x() - center.x();
                double dy = pos.y() - center.y();
                double dz = pos.z() - center.z();

                double r2 = dx*dx + dy*dy + dz*dz;
                r2_max = std::max(r2_max, r2);
            }
        }

        double radius = std::sqrt(r2_max);

        center_array[0] = center.x();
        center_array[1] = center.y();
        center_array[2] = center.z();

        result.first = center_array;
        result.second = radius;

        return result;
    }

        double get_map_data_resolution(int imol){
            /* This can only work if associate_data_mtz_file_with_map has be called. */
            if(is_valid_map_molecule(imol)){
                try {
                    (*this)[imol].fill_fobs_sigfobs();
                    auto fobs = (*this)[imol].get_original_fobs_sigfobs();
                    auto reso = fobs->resolution();
                    return reso.limit();
                } catch(std::exception e){
                    //Presumably we do not have original fobs.
                }
            }
            return -1.0;
        }

        clipper::Cell get_map_cell(int imol){
            clipper::Cell cell;
            if(is_valid_map_molecule(imol)){
                auto xMap = (*this)[imol].xmap;
                cell = xMap.cell();
            }
            return cell;
        }

        void write_simple_mesh_to_3mf_xml_file(const coot::simple_mesh_t &sm, const std::string &file_name){
            std::string xml_header = R""""(<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">Moorhen Model</metadata>
  <metadata name="Designer">The Moorhen Team</metadata>
  <resources>)"""";
            std::string xml_footer = R""""(</resources>
  <build>
    <item objectid="1" />
  </build>
</model>)"""";

            std::ofstream out(file_name);
            out << xml_header << std::endl;

            out << "<m:colorgroup id=\"2\">" << std::endl;
            out << std::hex;
            out.fill('0');
            for(const auto &tri : sm.triangles){
                int r = static_cast<int>((sm.vertices[tri[0]].color[0] + sm.vertices[tri[1]].color[0] + sm.vertices[tri[2]].color[0]) / 3.0 * 255.0);
                int g = static_cast<int>((sm.vertices[tri[0]].color[1] + sm.vertices[tri[1]].color[1] + sm.vertices[tri[2]].color[1]) / 3.0 * 255.0);
                int b = static_cast<int>((sm.vertices[tri[0]].color[2] + sm.vertices[tri[1]].color[2] + sm.vertices[tri[2]].color[2]) / 3.0 * 255.0);
                if(r>255) r = 255;
                if(g>255) g = 255;
                if(b>255) b = 255;
                out << "<m:color color=\"#" << std::setw(2) << r << std::setw(2) << g << std::setw(2) << b << "\"/>" << std::endl;
            }
            out << std::dec;
            out << "</m:colorgroup>" << std::endl;
            out << "<object id=\"1\" name=\"Moorhen model (colour)\" type=\"model\">" << std::endl;
            out << "<mesh>" << std::endl;
            out << "<vertices>" << std::endl;
            for(const auto &vert : sm.vertices){
                const auto &pos = vert.pos;
                out << "<vertex x=\"" << pos[0] << "\" y=\"" << pos[1] << "\" z=\"" << pos[2] << "\" />" << std::endl;
            }
            out << "</vertices>" << std::endl;
            out << "<triangles>" << std::endl;
            int itri = 0;
            for(const auto &tri : sm.triangles){
                out << "<triangle v1=\"" << tri[0] << "\" v2=\"" << tri[1] << "\" v3=\"" << tri[2] << "\" pid=\"2\" p1=\"" << itri << "\" />" << std::endl;
                itri++;
            }
            out << "</triangles>" << std::endl;
            out << "</mesh>" << std::endl;
            out << "</object>" << std::endl;

            out << xml_footer << std::endl;
            out.close();
        }

        void write_simple_mesh_to_obj_file(const coot::simple_mesh_t &sm, const std::string &file_name){

            std::ofstream out(file_name);
            for(const auto &vert : sm.vertices){
                const auto &pos = vert.pos;
                out << "v " << pos[0] << " " << pos[1] << " " << pos[2] << " 1.0" << std::endl;
            }
            for(const auto &vert : sm.vertices){
                const auto &norm = vert.normal;
                out << "vn " << norm[0] << " " << norm[1] << " " << norm[2] << std::endl;
            }
            for(const auto &tri : sm.triangles){
                out << "f " << tri[0]+1 << "//" << tri[0]+1 << " " << tri[1]+1 << "//" << tri[1]+1<< " " << tri[2]+1 << "//"  << tri[2]+1 << std::endl;
            }
            out.close();
        }

        void export_model_molecule_as_obj(int imol,
                                          const std::string &selection_cid,
                                          const std::string &mode,
                                          bool against_a_dark_background,
                                          float bonds_width, float atom_radius_to_bond_width_ratio, int smoothness_factor,
                                          bool draw_hydrogen_atoms_flag, bool draw_missing_residue_loops,
                                          const std::string &file_name) {

        if (is_valid_model_molecule(imol)) {
            bool show_atoms_as_aniso_flag = true;
            bool show_aniso_atoms_as_ortep_flag = false; // pass these

            coot::instanced_mesh_t im = get_bonds_mesh_for_selection_instanced(imol,  selection_cid,
                                                                mode,
                                                                against_a_dark_background,
                                                                bonds_width, atom_radius_to_bond_width_ratio,
                                                                show_atoms_as_aniso_flag,
                                                                show_aniso_atoms_as_ortep_flag,
                                                                false,
                                                                draw_hydrogen_atoms_flag,
                                                                smoothness_factor);

            coot::simple_mesh_t sm = coot::instanced_mesh_to_simple_mesh(im);
            //Now write this mesh as .obj
            write_simple_mesh_to_obj_file(sm,file_name);
        }
     }

     void export_molecular_representation_as_obj(int imol, const std::string &atom_selection_cid,
                                                 const std::string &colour_scheme, const std::string &style,
                                                 int secondary_structure_usage_flag,
                                                 const std::string &file_name) {

        if (is_valid_model_molecule(imol)) {
            coot::simple_mesh_t sm = get_molecular_representation_mesh(imol, atom_selection_cid, colour_scheme, style,
                                                                  secondary_structure_usage_flag);
            //Now write this mesh as .obj
            write_simple_mesh_to_obj_file(sm,file_name);
        }
     }
     void export_map_molecule_as_obj(int imol, float pos_x, float pos_y, float pos_z, float radius, float contour_level,
                                                   const std::string &file_name){
         if (is_valid_map_molecule(imol)) {
            coot::simple_mesh_t sm = get_map_contours_mesh(imol, pos_x, pos_y, pos_z, radius, contour_level);
            //Now write this mesh as .obj
            write_simple_mesh_to_obj_file(sm,file_name);
         } else {
            std::cout << "WARNING:: " << __FUNCTION__ << "(): not a valid map molecule " << imol << std::endl;
         }
     }

     void export_model_molecule_as_3mf_xml(int imol,
                                          const std::string &selection_cid,
                                          const std::string &mode,
                                          bool against_a_dark_background,
                                          float bonds_width, float atom_radius_to_bond_width_ratio, int smoothness_factor,
                                          bool draw_hydrogen_atoms_flag, bool draw_missing_residue_loops,
                                          const std::string &file_name) {

        if (is_valid_model_molecule(imol)) {
            bool show_atoms_as_aniso_flag = true;
            bool show_aniso_atoms_as_ortep_flag = false; // pass these

            coot::instanced_mesh_t im = get_bonds_mesh_for_selection_instanced(imol,  selection_cid,
                                                                mode,
                                                                against_a_dark_background,
                                                                bonds_width, atom_radius_to_bond_width_ratio,
                                                                show_atoms_as_aniso_flag,
                                                                show_aniso_atoms_as_ortep_flag,
                                                                false,
                                                                draw_hydrogen_atoms_flag,
                                                                smoothness_factor);

            coot::simple_mesh_t sm = coot::instanced_mesh_to_simple_mesh(im);
            //Now write this mesh as 3mf xml
            write_simple_mesh_to_3mf_xml_file(sm,file_name);
        }
     }

     void export_molecular_representation_as_3mf_xml(int imol, const std::string &atom_selection_cid,
                                                 const std::string &colour_scheme, const std::string &style,
                                                 int secondary_structure_usage_flag,
                                                 const std::string &file_name) {

        if (is_valid_model_molecule(imol)) {
            coot::simple_mesh_t sm = get_molecular_representation_mesh(imol, atom_selection_cid, colour_scheme, style,
                                                                  secondary_structure_usage_flag);
            //Now write this mesh as 3mf xml
            write_simple_mesh_to_3mf_xml_file(sm,file_name);
        }
     }
     void export_map_molecule_as_3mf_xml(int imol, float pos_x, float pos_y, float pos_z, float radius, float contour_level,
                                                   const std::string &file_name){
         if (is_valid_map_molecule(imol)) {
            coot::simple_mesh_t sm = get_map_contours_mesh(imol, pos_x, pos_y, pos_z, radius, contour_level);
            //Now write this mesh as 3mf xml
            write_simple_mesh_to_3mf_xml_file(sm,file_name);
         } else {
            std::cout << "WARNING:: " << __FUNCTION__ << "(): not a valid map molecule " << imol << std::endl;
         }
     }

     void export_metaballs_as_gltf(int imol, const std::string &cid_str, float gridSize, float radius, float isoLevel, const std::string &file_name) {
         coot::simple_mesh_t sm = DrawMoorhenMetaBalls(imol, cid_str, gridSize, radius, isoLevel);
         //Now write this mesh as .glb
         bool as_binary = true; // test the extension of file_name
         float gltf_pbr_roughness = 0.2;
         float gltf_pbr_metalicity = 0.0;
         sm.export_to_gltf(file_name, gltf_pbr_roughness, gltf_pbr_metalicity, as_binary);
     }

     void export_metaballs_as_obj(int imol, const std::string &cid_str, float gridSize, float radius, float isoLevel, const std::string &file_name) {
         coot::simple_mesh_t sm = DrawMoorhenMetaBalls(imol, cid_str, gridSize, radius, isoLevel);
         //Now write this mesh as .obj
         write_simple_mesh_to_obj_file(sm,file_name);
     }

     void export_metaballs_as_3mf_xml(int imol, const std::string &cid_str, float gridSize, float radius, float isoLevel, const std::string &file_name) {
         coot::simple_mesh_t sm = DrawMoorhenMetaBalls(imol, cid_str, gridSize, radius, isoLevel);
         //Now write this mesh as 3mf xml
         write_simple_mesh_to_3mf_xml_file(sm,file_name);
     }

};

inline std::string GetAtomNameFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetAtomName());
}

inline std::string GetChainIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetChainID());
}

inline std::string GetLabelAsymIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelAsymID());
}

inline std::string GetLabelCompIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelCompID());
}

inline std::string GetInsCodeFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetInsCode());
}

inline std::string GetResNameFromResidue(mmdb::Residue *res){
    return std::string(res->GetResName());
}

inline std::string GetChainIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetChainID());
}

inline std::string GetLabelAsymIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelAsymID());
}

inline std::string GetLabelCompIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelCompID());
}

inline std::string GetInsCodeFromResidue(mmdb::Residue *res){
    return std::string(res->GetInsCode());
}

inline emscripten::val uint32ArrayFromVector(const std::vector<unsigned int> &uintArray){
    emscripten::val view{ emscripten::typed_memory_view(uintArray.size(), uintArray.data()) };
    auto result = emscripten::val::global("Uint32Array").new_(uintArray.size());
    result.call<void>("set", view);
    return result;
}

inline emscripten::val float32ArrayFromVector(const std::vector<float> &floatArray){
    emscripten::val view{ emscripten::typed_memory_view(floatArray.size(), floatArray.data()) };
    auto result = emscripten::val::global("Float32Array").new_(floatArray.size());
    result.call<void>("set", view);
    return result;
}

inline void setFloat32ArrayFromVector(const std::vector<float> &floatArray, const emscripten::val &v){
    emscripten::val view{ emscripten::typed_memory_view(floatArray.size(), floatArray.data()) };
    v.call<void>("set", view);
}

inline void setUint32ArrayFromVector(const std::vector<unsigned> &uintArray, const emscripten::val &v){
    emscripten::val view{ emscripten::typed_memory_view(uintArray.size(), uintArray.data()) };
    v.call<void>("set", view);
}

inline void getTextureArray(const texture_as_floats_t &m, const emscripten::val &v){
    const auto &image_data = m.image_data;
    const auto &width = m.width;
    const auto &height = m.height;

    std::vector<float> floatArray;
    floatArray.reserve(width*height);

    auto s = width*height;

    for(int i=0;i<s;i++){
        floatArray.push_back(image_data[i]);
    }

    setFloat32ArrayFromVector(floatArray,v);

}

inline void getPositionsFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){
    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(v.pos[0]);
        floatArray.push_back(v.pos[1]);
        floatArray.push_back(v.pos[2]);
    }

    setFloat32ArrayFromVector(floatArray,v);
}

inline void getReversedNormalsFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(-v.normal[0]);
        floatArray.push_back(-v.normal[1]);
        floatArray.push_back(-v.normal[2]);
    }

    setFloat32ArrayFromVector(floatArray,v);

}

inline void getReversedNormalsFromSimpleMesh3(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(v.normal[0]);
        floatArray.push_back(v.normal[1]);
        floatArray.push_back(v.normal[2]);
    }

    setFloat32ArrayFromVector(floatArray,v);

}

inline void getNormalsFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(v.normal[0]);
        floatArray.push_back(v.normal[1]);
        floatArray.push_back(v.normal[2]);
    }

    setFloat32ArrayFromVector(floatArray,v);

}

inline void getColoursFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*4);

    for(const auto &v : vertices){
        floatArray.push_back(v.color[0]);
        floatArray.push_back(v.color[1]);
        floatArray.push_back(v.color[2]);
        floatArray.push_back(v.color[3]);
    }

    setFloat32ArrayFromVector(floatArray,v);

}

inline void getTriangleIndicesFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*3);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[2]);
    }

    setUint32ArrayFromVector(uintArray,v);

}

inline void getPermutedTriangleIndicesFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*3);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[2]);
        uintArray.push_back(idx[1]);
    }

    setUint32ArrayFromVector(uintArray,v);

}

inline emscripten::val getPositionsFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(v.pos[0]);
        floatArray.push_back(v.pos[1]);
        floatArray.push_back(v.pos[2]);
    }

    return float32ArrayFromVector(floatArray);

}

inline emscripten::val getReversedNormalsFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(-v.normal[0]);
        floatArray.push_back(-v.normal[1]);
        floatArray.push_back(-v.normal[2]);
    }

    return float32ArrayFromVector(floatArray);

}

inline emscripten::val getNormalsFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*3);

    for(const auto &v : vertices){
        floatArray.push_back(v.normal[0]);
        floatArray.push_back(v.normal[1]);
        floatArray.push_back(v.normal[2]);
    }

    return float32ArrayFromVector(floatArray);

}

inline emscripten::val getColoursFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &vertices = m.vertices;

    std::vector<float> floatArray;
    floatArray.reserve(vertices.size()*4);

    for(const auto &v : vertices){
        floatArray.push_back(v.color[0]);
        floatArray.push_back(v.color[1]);
        floatArray.push_back(v.color[2]);
        floatArray.push_back(v.color[3]);
    }

    return float32ArrayFromVector(floatArray);

}

inline emscripten::val getTriangleIndicesFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*3);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[2]);
    }

    return uint32ArrayFromVector(uintArray);

}

inline emscripten::val getPermutedTriangleIndicesFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*3);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[2]);
        uintArray.push_back(idx[1]);
    }

    return uint32ArrayFromVector(uintArray);

}

inline void getLineIndicesFromSimpleMesh2(const coot::simple_mesh_t &m, const emscripten::val &v){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*6);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[2]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[2]);
    }

    setUint32ArrayFromVector(uintArray,v);

}

inline emscripten::val getLineIndicesFromSimpleMesh(const coot::simple_mesh_t &m){

    const auto &triangles = m.triangles;

    std::vector<unsigned int> uintArray;
    uintArray.reserve(triangles.size()*6);

    for(const auto &t : triangles){
        auto &idx = t.point_id;
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[0]);
        uintArray.push_back(idx[2]);
        uintArray.push_back(idx[1]);
        uintArray.push_back(idx[2]);
    }

    return uint32ArrayFromVector(uintArray);

}

inline emscripten::val testFloat32Array(const emscripten::val &floatArrayObject){

    auto floatArray = emscripten::convertJSArrayToNumberVector<float>(floatArrayObject);
    unsigned int length = floatArray.size();

    std::cout << "In testFloat32Array " << length << " " << floatArray[0] << std::endl;
    floatArray[0] = 555.555;

    emscripten::val view{ emscripten::typed_memory_view(floatArray.size(), floatArray.data()) };
    auto result = emscripten::val::global("Float32Array").new_(floatArray.size());
    // copy data from generated floatArray to return object
    result.call<void>("set", view);
    return result;
}

inline void unzipFileToFP(const std::string &file_name, FILE *fp){

    const int LENGTH = 1024;
    struct stat s;
    int fstat = stat(file_name.c_str(), &s);
    if (fstat == 0) {
        gzFile file = gzopen(file_name.c_str(), "rb");
        int z_status = Z_OK;
        unsigned char buffer[LENGTH];
        size_t read_pos = 0;
        while (!gzeof(file)) {
            int bytes_read = gzread(file, buffer, LENGTH - 1);
            const char *error_message = gzerror(file, &z_status);
            if ((bytes_read == -1) || z_status != Z_OK) {
                std::cerr << "WARNING:: gz read error for " << file_name << " "
                    << error_message << std::endl;
                break;
            }
            if(bytes_read>0){
                int bytes_wrote = fwrite(buffer,1,bytes_read,fp);
                if(bytes_wrote==-1) {
                    std::cerr << "Failed to write in unzipFileToFP" << std::endl;
                    return;
                }
            }
        }
        z_status = gzclose_r(file);
        if (z_status != Z_OK) {
            std::cerr << "WARNING:: gz close read error for " << file_name << std::endl;
        }
    } else {
        std::cerr << "Error in unzipFileToFP, file " << file_name<< " does not exist" << std::endl;
    }
}


inline void unpackCootDataFile(const std::string &fileName, bool doUnzip, const std::string &unzipFileName, const std::string &targetDir){

    char *cwd;
    if(targetDir.length()>0){
        char buf[4096];
        cwd = getcwd(buf,4096);
        const char *dir_cp = targetDir.c_str();
        chdir(dir_cp);
    }

    const char *fn_cp;

    if(doUnzip){
        fn_cp = unzipFileName.c_str();
        FILE *tf = fopen(fn_cp, "wb+");
        if(!tf) perror("fopen:");
        unzipFileToFP(fileName,tf);
        fclose(tf);
    } else {
        std::cout << "Not unzipping (file already unzipped)" << std::endl;
        fn_cp = fileName.c_str();
    }

    FILE *a = fopen(fn_cp, "rb");
    untar(a, fn_cp);
    fclose(a);

    if(targetDir.length()>0){
        chdir(cwd);
    }
}

std::pair<std::string,std::string> SmallMoleculeCifToMMCif(const std::string &small_molecule_cif);

inline std::string cidToNeighboursCid(gemmi::Structure &st, const std::string &cid, const std::string &cidNeighbours, float d, bool excl){

    auto splitNeighboursCid = coot::util::split_string(cidNeighbours, "||");
    auto splitCid = coot::util::split_string(cid, "||");

    auto d2 = d*d;

    auto distsq = [](const gemmi::Atom &a1, const gemmi::Atom &a2){
        return (a1.pos.x-a2.pos.x)*(a1.pos.x-a2.pos.x) + (a1.pos.y-a2.pos.y)*(a1.pos.y-a2.pos.y) + (a1.pos.z-a2.pos.z)*(a1.pos.z-a2.pos.z);
    };

    std::string sel_str = "";

    std::vector<gemmi::Atom> atoms;

    for(const auto &_neighboursCid : splitNeighboursCid){
        gemmi::Selection sel2(_neighboursCid);
        for(auto m: sel2.models(st)){
            for(auto c: sel2.chains(m)){
                for(auto r: sel2.residues(c)){
                    for(auto a: sel2.atoms(r)){
                        atoms.push_back(a);
                    }
                }
            }
        }
    }

    for(const auto &_cid : splitCid){
        gemmi::Selection sel(_cid);
        for(auto m: sel.models(st)){
            for(auto c: sel.chains(m)){
                for(auto r: sel.residues(c)){
                    auto num = r.seqid.num;
                    bool found_residue = false;
                    if(num.has_value()){
                        for(auto a: sel.atoms(r)){
                            for(auto a2:atoms){
                                if(distsq(a,a2)<d2){
                                    found_residue = true;
                                    break;
                                }
                            }
                            if(found_residue) break;
                        }
                        if(found_residue!=excl) sel_str += c.name + "/" + std::to_string(num.value) + "||";
                    }
                }
            }
        }
    }

    if(sel_str.length()>2)
        return sel_str.substr(0,sel_str.length()-2);

    return "";

}

inline int run_conkit_validate_with_exception(ValidateOptions& opts){
    try {
        return run_conkit_validate(opts);
    } catch(std::exception e){
        //ConKit failed ...
        std::cout << "ConKit failed ..." << std::endl;
        return -1;
    }
}

