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
#include "ligand/chi-angles.hh"
#include "ligand/primitive-chi-angles.hh"
#include "ligand/rotamer.hh"
#include "api/interfaces.hh"
#include "api/molecules_container.hh"
#include "api/validation-information.hh"
#include "api/g_triangle.hh"
#include "api/vertex.hh"

#include "mmdb_manager.h"
#include "clipper/core/ramachandran.h"
#include "clipper/clipper-ccp4.h"

#include "cartesian.h"
#include "geomutil.h"

#include <gemmi/span.hpp>
#include <gemmi/mmread.hpp>
#include <gemmi/gz.hpp>
#include <gemmi/model.hpp>

#define _SAJSON_H_INCLUDED_

using namespace emscripten;

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

std::map<std::string,std::vector<coot::simple_rotamer> > getRotamersMap(){

    std::map<std::string,std::vector<coot::simple_rotamer> > all_rots;

    std::vector<std::string> rotamerAcids = {"VAL","PRO","SER","THR","LEU","ILE","CYS","ASP","GLU","ASN","GLN","ARG","LYS","MET","MSE","HIS","PHE","TYR","TRP"};

    coot::rotamer rot(0);

    for(unsigned ia=0;ia<rotamerAcids.size();ia++){
        std::vector<coot::simple_rotamer> rots =  rot.get_rotamers(rotamerAcids[ia], 0.001);
        all_rots[rotamerAcids[ia]] = rots;
    }

    return all_rots;
}

class IntVectorMergeMolInfoPair {
    public:
        int first;
        std::vector<merge_molecule_results_info_t> second;
};

class ResSpecStringPair {
    public:
        coot::residue_spec_t first;
        std::string second;
};

class molecules_container_js : public molecules_container_t {
    public:
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

        IntVectorMergeMolInfoPair merge_molecules(int imol, const std::string &list_of_other_molecules) {
            IntVectorMergeMolInfoPair retval;
            std::pair<int, std::vector<merge_molecule_results_info_t> > p = molecules_container_t::merge_molecules(imol,list_of_other_molecules);
            retval.first = p.first;
            retval.second = p.second;
            return retval;
        }

        std::vector<ResSpecStringPair> get_single_letter_codes_for_chain(int imol, const std::string &chain_id) {
            std::vector<ResSpecStringPair> retval;
            std::vector<std::pair<coot::residue_spec_t, std::string> > seq = molecules_container_t::get_single_letter_codes_for_chain(imol, chain_id);
            for(unsigned i=0;i<seq.size();i++){
                ResSpecStringPair p;
                p.first = seq[i].first;
                p.second = seq[i].second;
                retval.push_back(p);
            }
            return retval;
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
};

std::string GetAtomNameFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetAtomName());
}

std::string GetChainIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetChainID());
}

std::string GetLabelAsymIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelAsymID());
}

std::string GetLabelCompIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelCompID());
}

std::string GetInsCodeFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetInsCode());
}

std::string GetResNameFromResidue(mmdb::Residue *res){
    return std::string(res->GetResName());
}

std::string GetChainIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetChainID());
}

std::string GetLabelAsymIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelAsymID());
}

std::string GetLabelCompIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelCompID());
}
 
std::string GetInsCodeFromResidue(mmdb::Residue *res){
    return std::string(res->GetInsCode());
}


EMSCRIPTEN_BINDINGS(my_module) {
    class_<clipper::Coord_orth>("Coord_orth")
    .constructor<const clipper::ftype&, const clipper::ftype&, const clipper::ftype&>()
    .function("x", &clipper::Coord_orth::x)
    .function("y", &clipper::Coord_orth::y)
    .function("z", &clipper::Coord_orth::z)
    ;
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
    class_<coot::simple_rotamer>("simple_rotamer")
    .function("P_r1234",&coot::simple_rotamer::P_r1234)
    .function("Probability_rich",&coot::simple_rotamer::Probability_rich)
    .function("get_chi",&coot::simple_rotamer::get_chi)
    ;
    class_<merge_molecule_results_info_t>("merge_molecule_results_info_t")
    .property("chain_id", &merge_molecule_results_info_t::chain_id)
    .property("spec", &merge_molecule_results_info_t::spec)
    .property("is_chain", &merge_molecule_results_info_t::is_chain)
    ;
    class_<coot::residue_validation_information_t>("residue_validation_information_t")
    .property("function_value", &coot::residue_validation_information_t::function_value)
    .property("label", &coot::residue_validation_information_t::label)
    .property("residue_spec", &coot::residue_validation_information_t::residue_spec)
    .property("atom_spec", &coot::residue_validation_information_t::atom_spec)
    ;
    class_<coot::chain_validation_information_t>("chain_validation_information_t")
    .property("name", &coot::chain_validation_information_t::name)
    .property("chain_id", &coot::chain_validation_information_t::chain_id)
    .property("rviv", &coot::chain_validation_information_t::rviv)
    ;
    class_<coot::validation_information_t>("validation_information_t")
    .property("name", &coot::validation_information_t::name)
    .property("type", &coot::validation_information_t::type)
    .property("cviv", &coot::validation_information_t::cviv)
    .function("get_index_for_chain",&coot::validation_information_t::get_index_for_chain)
    ;
    class_<mmdb::Atom>("Atom")
    .constructor<>()
    .property("x",&mmdb::Atom::x)
    .property("y",&mmdb::Atom::y)
    .property("z",&mmdb::Atom::z)
    .property("serNum",&mmdb::Atom::serNum)
    .property("occupancy",&mmdb::Atom::occupancy)
    .property("tempFactor",&mmdb::Atom::tempFactor)
    .property("charge",&mmdb::Atom::charge)
    .property("sigX",&mmdb::Atom::sigX)
    .property("sigY",&mmdb::Atom::sigY)
    .property("sigZ",&mmdb::Atom::sigZ)
    .property("sigOcc",&mmdb::Atom::sigOcc)
    .property("sigTemp",&mmdb::Atom::sigTemp)
    .property("u11",&mmdb::Atom::u11)
    .property("u22",&mmdb::Atom::u22)
    .property("u33",&mmdb::Atom::u33)
    .property("u12",&mmdb::Atom::u12)
    .property("u13",&mmdb::Atom::u13)
    .property("u23",&mmdb::Atom::u23)
    .property("Het",&mmdb::Atom::Het)
    .property("Ter",&mmdb::Atom::Ter)
    .function("GetNBonds",&mmdb::Atom::GetNBonds)
    .function("GetModelNum",&mmdb::Atom::GetModelNum)
    .function("GetSeqNum",&mmdb::Atom::GetSeqNum)
    .function("GetLabelSeqID",&mmdb::Atom::GetLabelSeqID)
    .function("GetLabelEntityID",&mmdb::Atom::GetLabelEntityID)
    .function("GetSSEType",&mmdb::Atom::GetSSEType)
    .function("isTer",&mmdb::Atom::isTer)
    .function("isMetal",&mmdb::Atom::isMetal)
    .function("isSolvent",&mmdb::Atom::isSolvent)
    .function("isInSelection",&mmdb::Atom::isInSelection)
    .function("isNTerminus",&mmdb::Atom::isNTerminus)
    .function("isCTerminus",&mmdb::Atom::isCTerminus)
    .function("GetResidueNo",&mmdb::Atom::GetResidueNo)
    .function("GetIndex",&mmdb::Atom::GetIndex)
    .function("GetAtomName",&GetAtomNameFromAtom, allow_raw_pointers())
    .function("GetChainID",&GetChainIDFromAtom, allow_raw_pointers())
    .function("GetLabelAsymID",&GetLabelAsymIDFromAtom, allow_raw_pointers())
    .function("GetLabelCompID",&GetLabelCompIDFromAtom, allow_raw_pointers())
    .function("GetInsCode",&GetInsCodeFromAtom, allow_raw_pointers())
    ;
    class_<mmdb::Residue>("Residue")
    .constructor<>()
    .property("seqNum",&mmdb::Residue::seqNum)
    .property("label_seq_id",&mmdb::Residue::label_seq_id)
    .property("label_entity_id",&mmdb::Residue::label_entity_id)
    .property("index",&mmdb::Residue::index)
    .property("nAtoms",&mmdb::Residue::nAtoms)
    .function("GetModelNum",&mmdb::Residue::GetModelNum)
    .function("GetSeqNum",&mmdb::Residue::GetSeqNum)
    .function("GetLabelSeqID",&mmdb::Residue::GetLabelSeqID)
    .function("GetLabelEntityID",&mmdb::Residue::GetLabelEntityID)
    .function("GetResidueNo",&mmdb::Residue::GetResidueNo)
    .function("GetNofAltLocations",&mmdb::Residue::GetNofAltLocations)
    .function("isAminoacid",&mmdb::Residue::isAminoacid)
    .function("isNucleotide",&mmdb::Residue::isNucleotide)
    .function("isDNARNA",&mmdb::Residue::isDNARNA)
    .function("isSugar",&mmdb::Residue::isSugar)
    .function("isSolvent",&mmdb::Residue::isSolvent)
    .function("isModRes",&mmdb::Residue::isModRes)
    .function("isInSelection",&mmdb::Residue::isInSelection)
    .function("isNTerminus",&mmdb::Residue::isNTerminus)
    .function("isCTerminus",&mmdb::Residue::isCTerminus)
    .function("GetResName",&GetResNameFromResidue, allow_raw_pointers())
    .function("GetChainID",&GetChainIDFromResidue, allow_raw_pointers())
    .function("GetLabelAsymID",&GetLabelAsymIDFromResidue, allow_raw_pointers())
    .function("GetLabelCompID",&GetLabelCompIDFromResidue, allow_raw_pointers())
    .function("GetInsCode",&GetInsCodeFromResidue, allow_raw_pointers())
    .function("GetAtom", select_overload<mmdb::Atom*(int)>(&mmdb::Residue::GetAtom), allow_raw_pointers())
    .function("GetNumberOfAtoms", select_overload<int(void)>(&mmdb::Residue::GetNumberOfAtoms))
    .function("GetNumberOfAtoms_countTers", select_overload<int(bool)>(&mmdb::Residue::GetNumberOfAtoms))
    ;
    class_<coot::phi_psi_prob_t>("phi_psi_prob_t")
    .property("phi_psi", &coot::phi_psi_prob_t::phi_psi)
    .property("position", &coot::phi_psi_prob_t::position)
    .property("is_allowed_flag", &coot::phi_psi_prob_t::is_allowed_flag)
    .property("residue_name", &coot::phi_psi_prob_t::residue_name)
    .function("is_allowed", &coot::phi_psi_prob_t::is_allowed)
    ;
    class_<coot::molecule_t::moved_atom_t>("moved_atom_t")
    .constructor<const std::string&, const std::string&, float, float, float, int>()
    .property("atom_name", &coot::molecule_t::moved_atom_t::atom_name)
    .property("alt_conf", &coot::molecule_t::moved_atom_t::alt_conf)
    .property("x", &coot::molecule_t::moved_atom_t::x)
    .property("y", &coot::molecule_t::moved_atom_t::y)
    .property("z", &coot::molecule_t::moved_atom_t::z)
    .property("index", &coot::molecule_t::moved_atom_t::index)
    ;
    class_<coot::molecule_t::interesting_place_t>("interesting_place_t")
    .constructor<const std::string &, const coot::residue_spec_t &, const clipper::Coord_orth &, const std::string &>()
    .constructor<const std::string &, const clipper::Coord_orth &, const std::string &>()
    .property("feature_type", &coot::molecule_t::interesting_place_t::feature_type)
    .property("residue_spec", &coot::molecule_t::interesting_place_t::residue_spec)
    .property("button_label", &coot::molecule_t::interesting_place_t::button_label)
    .property("feature_value", &coot::molecule_t::interesting_place_t::feature_value)
    .property("badness", &coot::molecule_t::interesting_place_t::badness)
    .property("x", &coot::molecule_t::interesting_place_t::x)
    .property("y", &coot::molecule_t::interesting_place_t::y)
    .property("z", &coot::molecule_t::interesting_place_t::z)
    ;
    class_<coot::molecule_t::moved_residue_t>("moved_residue_t")
    .constructor<const std::string&, int, const std::string&>()
    .property("chain_id", &coot::molecule_t::moved_residue_t::chain_id)
    .property("res_no", &coot::molecule_t::moved_residue_t::res_no)
    .property("ins_code", &coot::molecule_t::moved_residue_t::ins_code)
    .property("moved_atoms", &coot::molecule_t::moved_residue_t::moved_atoms)
    ;
    class_<molecules_container_t>("molecules_container_t")
    .constructor<>()
    .function("is_valid_model_molecule",&molecules_container_t::is_valid_model_molecule)
    .function("is_valid_map_molecule",&molecules_container_t::is_valid_map_molecule)
    .function("read_pdb",&molecules_container_t::read_pdb)
    .function("read_ccp4_map",&molecules_container_t::read_ccp4_map)
    .function("read_mtz",&molecules_container_t::read_mtz)
    //   int import_cif_dictionary(const std::string &cif_file_name, int imol_enc);
    .function("import_cif_dictionary",&molecules_container_t::import_cif_dictionary)
    .function("density_fit_analysis",&molecules_container_t::density_fit_analysis)
    //Using allow_raw_pointers(). Perhaps suggests we need to do something different from exposing mmdb pointers to JS.
    .function("get_residue",&molecules_container_t::get_residue, allow_raw_pointers())
    .function("get_atom",&molecules_container_t::get_atom, allow_raw_pointers())
    .function("flipPeptide_cid",   select_overload<int(int, const std::string&,      const std::string&)>(&molecules_container_t::flip_peptide_using_cid))
    .function("flipPeptide",       select_overload<int(int, const coot::atom_spec_t&,const std::string&)>(&molecules_container_t::flip_peptide))
    .function("side_chain_180",    select_overload<int(int, const std::string&)>                         (&molecules_container_t::side_chain_180))
    .function("eigen_flip_ligand", select_overload<void(int, const std::string&)>                        (&molecules_container_t::eigen_flip_ligand_using_cid))
    .function("jed_flip",          select_overload<std::string(int, const std::string&, bool)>           (&molecules_container_t::jed_flip))
    .function("add_terminal_residue_directly_using_cid", select_overload<int(int,  const std::string&)>(&molecules_container_t::add_terminal_residue_directly_using_cid))
    .function("test_origin_cube",&molecules_container_t::test_origin_cube)
    .function("ramachandran_validation_markup_mesh",&molecules_container_t::ramachandran_validation_markup_mesh)
    .function("get_rotamer_dodecs",&molecules_container_t::get_rotamer_dodecs)
    .function("auto_fit_rotamer",&molecules_container_t::auto_fit_rotamer)
    .function("get_map_contours_mesh",&molecules_container_t::get_map_contours_mesh)
    .function("geometry_init_standard",&molecules_container_t::geometry_init_standard)
    .function("fill_rotamer_probability_tables",&molecules_container_t::fill_rotamer_probability_tables)
    .function("copy_fragment_using_residue_range",&molecules_container_t::copy_fragment_using_residue_range)
    .function("close_molecule",&molecules_container_t::close_molecule)
    .function("undo",&molecules_container_t::undo)
    .function("redo",&molecules_container_t::redo)
    .function("refine_residues_using_atom_cid",&molecules_container_t::refine_residues_using_atom_cid)
    .function("set_imol_refinement_map",&molecules_container_t::set_imol_refinement_map)
    .function("mutate",&molecules_container_t::mutate)
    .function("delete_using_cid",&molecules_container_t::delete_using_cid)
    .function("get_bonds_mesh",&molecules_container_t::get_bonds_mesh)
    .function("go_to_blob",&molecules_container_t::go_to_blob)
    .function("set_map_sampling_rate",&molecules_container_t::set_map_sampling_rate)
    .function("get_monomer",&molecules_container_t::get_monomer)
    .function("get_monomer_and_position_at",&molecules_container_t::get_monomer_and_position_at)
    .function("move_molecule_to_new_centre",&molecules_container_t::move_molecule_to_new_centre)
    .function("apply_transformation_to_atom_selection",&molecules_container_t::apply_transformation_to_atom_selection)
    .function("new_positions_for_residue_atoms",&molecules_container_t::new_positions_for_residue_atoms)
    .function("new_positions_for_atoms_in_residues",&molecules_container_t::new_positions_for_atoms_in_residues)
    //.function("get_interesting_places",&molecules_container_t::get_interesting_places)
    .function("difference_map_peaks",&molecules_container_t::difference_map_peaks)
    .function("pepflips_using_difference_map",&molecules_container_t::pepflips_using_difference_map)
    .function("add_waters",&molecules_container_t::add_waters)
    .function("ramachandran_analysis",&molecules_container_t::ramachandran_analysis)
    .function("density_correlation_analysis",&molecules_container_t::density_correlation_analysis)
    .function("difference_map_peaks",&molecules_container_t::difference_map_peaks)
    .function("rotamer_analysis",&molecules_container_t::rotamer_analysis)
    .function("associate_data_mtz_file_with_map",&molecules_container_t::associate_data_mtz_file_with_map)
    .function("connect_updating_maps",&molecules_container_t::connect_updating_maps)
    .function("ramachandran_validation",&molecules_container_t::ramachandran_validation)
    ;
    class_<molecules_container_js, base<molecules_container_t>>("molecules_container_js")
    .constructor<>()
    .function("writePDBASCII",&molecules_container_js::writePDBASCII)
    .function("writeCCP4Map",&molecules_container_js::writeCCP4Map)
    .function("count_simple_mesh_vertices",&molecules_container_js::count_simple_mesh_vertices)
    .function("go_to_blob_array",&molecules_container_js::go_to_blob_array)
    .function("get_single_letter_codes_for_chain",&molecules_container_js::get_single_letter_codes_for_chain)
    .function("add",&molecules_container_js::add)
    .function("getFloats",&molecules_container_js::getFloats)
    .function("merge_molecules",&molecules_container_js::merge_molecules)
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
    class_<coot::atom_spec_t>("atom_spec_t")
    .constructor<const std::string &, int, const std::string &, const std::string &, const std::string &>()
    .property("chain_id",&coot::atom_spec_t::chain_id)
    .property("res_no",&coot::atom_spec_t::res_no)
    .property("ins_code",&coot::atom_spec_t::ins_code)
    .property("atom_name",&coot::atom_spec_t::atom_name)
    .property("alt_conf",&coot::atom_spec_t::alt_conf)
    .property("int_user_data",&coot::atom_spec_t::int_user_data)
    .property("float_user_data",&coot::atom_spec_t::float_user_data)
    .property("string_user_data",&coot::atom_spec_t::string_user_data)
    .property("model_number",&coot::atom_spec_t::model_number)
    ;
    class_<ResSpecStringPair>("ResSpecStringPair")
    .property("first",&ResSpecStringPair::first)
    .property("second",&ResSpecStringPair::second)
    ;
    class_<IntVectorMergeMolInfoPair>("IntVectorMergeMolInfoPair")
    .property("first",&IntVectorMergeMolInfoPair::first)
    .property("second",&IntVectorMergeMolInfoPair::second)
    ;
    class_<coot::util::phi_psi_t>("phi_psi_t")
    .function("phi",&coot::util::phi_psi_t::phi)
    .function("psi",&coot::util::phi_psi_t::psi)
    .function("label",&coot::util::phi_psi_t::label)
    .function("residue_name",&coot::util::phi_psi_t::residue_name)
    .function("is_filled",&coot::util::phi_psi_t::is_filled)
    .function("is_pre_pro",&coot::util::phi_psi_t::is_pre_pro)
    .property("ins_code",&coot::util::phi_psi_t::ins_code)
    .property("chain_id",&coot::util::phi_psi_t::chain_id)
    .property("residue_number",&coot::util::phi_psi_t::residue_number)
    ;
    class_<coot::Cartesian>("Cartesian")
    .function("x",&coot::Cartesian::x)
    .function("y",&coot::Cartesian::y)
    .function("z",&coot::Cartesian::z)
    ;
    class_<coot::residue_spec_t>("residue_spec_t")
    .constructor<const std::string &, int, const std::string &>()
    .property("model_number",&coot::residue_spec_t::model_number)
    .property("chain_id",&coot::residue_spec_t::chain_id)
    .property("res_no",&coot::residue_spec_t::res_no)
    .property("ins_code",&coot::residue_spec_t::ins_code)
    .property("int_user_data",&coot::residue_spec_t::int_user_data)
    ;
    class_<coot::api::vnc_vertex>("vnc_vertex")
    .constructor<const glm::vec3 &, const glm::vec3 &, const glm::vec4 &>()
    .property("pos",&coot::api::vnc_vertex::pos)
    .property("normal",&coot::api::vnc_vertex::normal)
    .property("color",&coot::api::vnc_vertex::color)
    ;
    value_object<g_triangle>("g_triangle")
    .field("point_id", &g_triangle::point_id)
    ;
    class_<coot::simple_mesh_t>("simple_mesh_t")
    .property("vertices",&coot::simple_mesh_t::vertices)
    .property("triangles",&coot::simple_mesh_t::triangles)
    ;
    register_vector<coot::molecule_t::moved_residue_t>("Vectormoved_residue_t");
    register_vector<coot::molecule_t::moved_atom_t>("Vectormoved_atom_t");
    register_vector<std::string>("VectorString");
    register_vector<float>("VectorFloat");
    register_vector<RamachandranInfo>("VectorResidueIdentifier");
    register_vector<ResiduePropertyInfo>("VectorResiduePropertyInfo");
    register_vector<coot::chain_validation_information_t>("Vectorchain_validation_information_t");
    register_vector<coot::residue_validation_information_t>("Vectorresidue_validation_information_t");
    register_vector<coot::simple_rotamer>("Vectorsimple_rotamer");
    register_vector<coot::residue_spec_t>("Vectorresidue_spec_t");
    register_vector<coot::api::vnc_vertex>("Vectorvnc_veertex");
    register_vector<coot::molecule_t::interesting_place_t>("Vectorinteresting_place_t");
    register_vector<g_triangle>("Vectorg_triangle");
    register_vector<ResSpecStringPair>("VectorResSpecStringPair");
    register_vector<merge_molecule_results_info_t>("Vectormerge_molecule_results_info_t");
    register_vector<coot::phi_psi_prob_t>("Vectophi_psi_prob_t");

    register_vector<gemmi::Model>("VectorGemmiModel");
    register_vector<gemmi::NcsOp>("VectorGemmiNcsOp");
    register_vector<gemmi::Entity>("VectorGemmiEntity");
    register_vector<gemmi::Connection>("VectorGemmiConnection");
    register_vector<gemmi::Helix>("VectorGemmiHelix");
    register_vector<gemmi::Sheet>("VectorGemmiSheet");
    register_vector<gemmi::Assembly>("VectorGemmiAssembly");
    register_vector<gemmi::Chain>("VectorGemmiChain");
    register_vector<gemmi::Residue>("VectorGemmiResidue");
    register_vector<gemmi::ResidueSpan>("VectorGemmiResidueSpan");
    register_vector<gemmi::ConstResidueSpan>("VectorGemmiConstResidueSpan");

    value_array<glm::vec3>("array_float_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;
    value_array<glm::vec4>("array_float_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;
    value_array<std::array<unsigned int, 3>>("array_unsigned_int_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;
    function("getRotamersMap",&getRotamersMap);

    enum_<gemmi::CoorFormat>("CoorFormat")
        .value("Unknown", gemmi::CoorFormat::Unknown)
        .value("Detect", gemmi::CoorFormat::Detect)
        .value("Pdb", gemmi::CoorFormat::Pdb)
        .value("Mmcif", gemmi::CoorFormat::Mmcif)
        .value("Mmjson", gemmi::CoorFormat::Mmjson)
        .value("ChemComp", gemmi::CoorFormat::ChemComp)
    ;

    class_<gemmi::Span<const gemmi::Residue>>("SpanConstResidue")
    .function("front",select_overload<const gemmi::Residue&()const>(&gemmi::Span<const gemmi::Residue>::front))
    .function("back",select_overload<const gemmi::Residue&()const>(&gemmi::Span<const gemmi::Residue>::back))
    .function("at",select_overload<const gemmi::Residue&(std::size_t)const>(&gemmi::Span<const gemmi::Residue>::at))
    .function("size",&gemmi::Span<const gemmi::Residue>::size)
    .function("empty",&gemmi::Span<const gemmi::Residue>::empty)
    .function("children",select_overload<const gemmi::Span<const gemmi::Residue>&()const>(&gemmi::Span<const gemmi::Residue>::children))
    ;

    class_<gemmi::Span<gemmi::Residue>>("SpanResidue")
    .function("front",select_overload<gemmi::Residue&()>(&gemmi::Span<gemmi::Residue>::front))
    .function("back",select_overload<gemmi::Residue&()>(&gemmi::Span<gemmi::Residue>::back))
    .function("at",select_overload<gemmi::Residue&(std::size_t)>(&gemmi::Span<gemmi::Residue>::at))
    .function("size",&gemmi::Span<gemmi::Residue>::size)
    .function("set_size",&gemmi::Span<gemmi::Residue>::set_size)
    .function("empty",&gemmi::Span<gemmi::Residue>::empty)
    .function("children",select_overload<gemmi::Span<gemmi::Residue>&()>(&gemmi::Span<gemmi::Residue>::children))
    ;

    class_<gemmi::UnitCell>("UnitCell")
    .constructor<>()
    .constructor<double,  double, double, double, double, double>()
    .property("a",&gemmi::UnitCell::a)
    .property("b",&gemmi::UnitCell::b)
    .property("c",&gemmi::UnitCell::c)
    .property("alpha",&gemmi::UnitCell::alpha)
    .property("beta",&gemmi::UnitCell::beta)
    .property("gamma",&gemmi::UnitCell::gamma)
    .property("orth",&gemmi::UnitCell::orth)
    .property("frac",&gemmi::UnitCell::frac)
    .property("volume",&gemmi::UnitCell::volume)
    .property("ar",&gemmi::UnitCell::ar)
    .property("br",&gemmi::UnitCell::br)
    .property("cr",&gemmi::UnitCell::cr)
    .property("cos_alphar",&gemmi::UnitCell::cos_alphar)
    .property("cos_betar",&gemmi::UnitCell::cos_betar)
    .property("cos_gammar",&gemmi::UnitCell::cos_gammar)
    .property("explicit_matrices",&gemmi::UnitCell::explicit_matrices)
    .property("cs_count",&gemmi::UnitCell::cs_count)
    .property("images",&gemmi::UnitCell::images)
    .function("is_crystal",&gemmi::UnitCell::is_crystal)
    .function("approx",&gemmi::UnitCell::approx)
    .function("is_similar",&gemmi::UnitCell::is_similar)
    .function("calculate_properties",&gemmi::UnitCell::calculate_properties)
    .function("cos_alpha",&gemmi::UnitCell::cos_alpha)
    .function("calculate_matrix_B",&gemmi::UnitCell::calculate_matrix_B)
    .function("set_matrices_from_fract",&gemmi::UnitCell::set_matrices_from_fract)
    .function("set",&gemmi::UnitCell::set)
    .function("set_from_vectors",&gemmi::UnitCell::set_from_vectors)
    .function("changed_basis_backward",&gemmi::UnitCell::changed_basis_backward)
    .function("changed_basis_forward",&gemmi::UnitCell::changed_basis_forward)
    .function("is_compatible_with_groupops",&gemmi::UnitCell::is_compatible_with_groupops)
    .function("add_ncs_images_to_cs_images",&gemmi::UnitCell::add_ncs_images_to_cs_images)
    .function("get_ncs_transforms",&gemmi::UnitCell::get_ncs_transforms)
    .function("orthogonalize",&gemmi::UnitCell::orthogonalize)
    .function("fractionalize",&gemmi::UnitCell::fractionalize)
    .function("orthogonalize_difference",&gemmi::UnitCell::orthogonalize_difference)
    .function("fractionalize_difference",&gemmi::UnitCell::fractionalize_difference)
    .function("op_as_transform",&gemmi::UnitCell::op_as_transform)
    .function("distance_sq_frac",select_overload<double(const gemmi::Fractional&,const gemmi::Fractional&)const>(&gemmi::UnitCell::distance_sq))
    .function("distance_sq_pos",select_overload<double(const gemmi::Position&,const gemmi::Position&)const>(&gemmi::UnitCell::distance_sq))
    .function("volume_per_image",&gemmi::UnitCell::volume_per_image)
    .function("search_pbc_images",&gemmi::UnitCell::search_pbc_images)
    .function("find_nearest_image",&gemmi::UnitCell::find_nearest_image)
    .function("apply_transform",&gemmi::UnitCell::apply_transform)
    .function("find_nearest_pbc_image_frac",select_overload<gemmi::NearestImage(const gemmi::Fractional&,gemmi::Fractional,int)const>(&gemmi::UnitCell::find_nearest_pbc_image))
    .function("find_nearest_pbc_image_pos",select_overload<gemmi::NearestImage(const gemmi::Position&,const gemmi::Position&,int)const>(&gemmi::UnitCell::find_nearest_pbc_image))
    .function("orthogonalize_in_pbc",&gemmi::UnitCell::orthogonalize_in_pbc)
    .function("find_nearest_pbc_position",&gemmi::UnitCell::find_nearest_pbc_position)
    .function("is_special_position_frac",select_overload<int(const gemmi::Fractional&,double)const>(&gemmi::UnitCell::is_special_position))
    .function("is_special_position_pos",select_overload<int(const gemmi::Position&,double)const>(&gemmi::UnitCell::is_special_position))
    .function("calculate_1_d2_double",&gemmi::UnitCell::calculate_1_d2_double)
    .function("calculate_1_d2",&gemmi::UnitCell::calculate_1_d2)
    .function("calculate_d",&gemmi::UnitCell::calculate_d)
    .function("calculate_stol_sq",&gemmi::UnitCell::calculate_stol_sq)
    .function("reciprocal",&gemmi::UnitCell::reciprocal)
    .function("get_hkl_limits",&gemmi::UnitCell::get_hkl_limits)
    .function("primitive_orth_matrix",&gemmi::UnitCell::primitive_orth_matrix)
    //.function("calculate_u_eq",&gemmi::UnitCell::calculate_u_eq) //This requires const SMat33<double>
    //.function("metric_tensor",&gemmi::UnitCell::metric_tensor) //This requires SMat33<double>
    //.function("reciprocal_metric_tensor",&gemmi::UnitCell::reciprocal_metric_tensor) //This requires SMat33<double>
    //.function("is_compatible_with_spacegroup",&gemmi::UnitCell::is_compatible_with_spacegroup) // Requires const SpaceGroup* sg
    //.function("set_cell_images_from_spacegroup",&gemmi::UnitCell::set_cell_images_from_spacegroup) // Requires const SpaceGroup* sg
    ;

    class_<gemmi::Model>("Model")
    .property("name",&gemmi::Model::name)
    .property("chains",&gemmi::Model::chains)
    .function("remove_chain",&gemmi::Model::remove_chain)
    .function("merge_chain_parts",&gemmi::Model::merge_chain_parts)
    .function("get_subchain",select_overload<gemmi::ResidueSpan(const std::string&)>(&gemmi::Model::get_subchain))
    .function("get_subchain_const",select_overload<gemmi::ConstResidueSpan(const std::string&)const>(&gemmi::Model::get_subchain))
    .function("subchains",select_overload<std::vector<gemmi::ResidueSpan> ()>(&gemmi::Model::subchains))
    .function("subchains",select_overload<std::vector<gemmi::ConstResidueSpan> ()const>(&gemmi::Model::subchains))
    .function("get_all_residue_names",&gemmi::Model::get_all_residue_names)
    .function("find_residue_group",&gemmi::Model::find_residue_group)
    .function("sole_residue",&gemmi::Model::sole_residue)
    .function("find_cra",select_overload<gemmi::CRA(const gemmi::AtomAddress&, bool)>(&gemmi::Model::find_cra))
    .function("find_cra_const",select_overload<gemmi::const_CRA(const gemmi::AtomAddress&, bool)const>(&gemmi::Model::find_cra))
    .function("all",select_overload<gemmi::CraProxy()>(&gemmi::Model::all))
    .function("all_const",select_overload<gemmi::ConstCraProxy()const>(&gemmi::Model::all))
    .function("empty_copy",&gemmi::Model::empty_copy)
    .function("children",select_overload<std::vector<gemmi::Chain>&()>(&gemmi::Model::children))
    .function("children_const",select_overload<const std::vector<gemmi::Chain>&()const>(&gemmi::Model::children))
    ;

    class_<gemmi::Chain>("Chain")
    .property("name",&gemmi::Chain::name)
    .property("residues",&gemmi::Chain::residues)
    .property("empty_copy",&gemmi::Chain::empty_copy)
    .function("is_first_in_group",&gemmi::Chain::is_first_in_group)
    .function("whole_const",select_overload<gemmi::ConstResidueSpan()const>(&gemmi::Chain::whole))
    .function("get_polymer_const",select_overload<gemmi::ConstResidueSpan()const>(&gemmi::Chain::get_polymer))
    .function("get_ligands_const",select_overload<gemmi::ConstResidueSpan()const>(&gemmi::Chain::get_ligands))
    .function("get_waters_const",select_overload<gemmi::ConstResidueSpan()const>(&gemmi::Chain::get_waters))
    .function("get_subchain_const",select_overload<gemmi::ConstResidueSpan(const std::string&)const>(&gemmi::Chain::get_subchain))
    .function("subchains_const",select_overload<std::vector<gemmi::ConstResidueSpan> ()const>(&gemmi::Chain::subchains))
    .function("find_residue_group_const",select_overload<gemmi::ConstResidueGroup(gemmi::SeqId id)const>(&gemmi::Chain::find_residue_group))
    .function("children_const",select_overload<const std::vector<gemmi::Residue>&()const>(&gemmi::Chain::children))
    .function("whole",select_overload<gemmi::ResidueSpan()>(&gemmi::Chain::whole))
    .function("get_polymer",select_overload<gemmi::ResidueSpan()>(&gemmi::Chain::get_polymer))
    .function("get_ligands",select_overload<gemmi::ResidueSpan()>(&gemmi::Chain::get_ligands))
    .function("get_waters",select_overload<gemmi::ResidueSpan()>(&gemmi::Chain::get_waters))
    .function("get_subchain",select_overload<gemmi::ResidueSpan(const std::string&)>(&gemmi::Chain::get_subchain))
    .function("subchains",select_overload<std::vector<gemmi::ResidueSpan> ()>(&gemmi::Chain::subchains))
    .function("find_residue_group",select_overload<gemmi::ResidueGroup(gemmi::SeqId id)>(&gemmi::Chain::find_residue_group))
    .function("children",select_overload<std::vector<gemmi::Residue>&()>(&gemmi::Chain::children))
    //.function("first_conformer_const",select_overload<gemmi::ConstUniqProxy<gemmi::Residue>()const>(&gemmi::Chain::first_conformer))
    //.function("first_conformer_const",select_overload<gemmi::UniqProxy<gemmi::Residue>()>(&gemmi::Chain::first_conformer))
    //And various pointer return  methods ...
    ;

    class_<gemmi::ConstResidueSpan, base<gemmi::Span<const gemmi::Residue>>>("ConstResidueSpan")
    .function("length",&gemmi::ConstResidueSpan::length)
    .function("subchain_id",&gemmi::ConstResidueSpan::subchain_id)
    .function("find_residue_group",&gemmi::ConstResidueSpan::find_residue_group)
    .function("extract_sequence",&gemmi::ConstResidueSpan::extract_sequence)
    //.function("front",&gemmi::ConstResidueSpan::front)
    //.function("back",&gemmi::ConstResidueSpan::back)
    //ConstUniqProxy<Residue, ConstResidueSpan> first_conformer() const {
    //SeqId::OptionalNum extreme_num(bool label, int sign) const {
    //ConstUniqProxy<Residue, ConstResidueSpan> first_conformer() const {
    //SeqId label_seq_id_to_auth(SeqId::OptionalNum label_seq_id) const {
    //SeqId::OptionalNum auth_seq_id_to_label(SeqId auth_seq_id) const {
    ;

    //TODO Wrap the following
    class_<gemmi::ResidueSpan>("ResidueSpan")
    ;
    class_<gemmi::Residue>("GemmiResidue")
    ;
    class_<gemmi::CraProxy>("CraProxy")
    ;
    class_<gemmi::ConstCraProxy>("ConstCraProxy")
    ;
    class_<gemmi::const_CRA>("const_CRA")
    ;
    class_<gemmi::AtomAddress>("AtomAddress")
    ;
    class_<gemmi::ResidueId>("ResidueId")
    ;
    class_<gemmi::ResidueGroup>("ResidueGroup")
    ;
    class_<gemmi::SeqId>("SeqId")
    ;
    class_<gemmi::ConstResidueGroup>("ConstResidueGroup")
    ;
    class_<gemmi::NcsOp>("NcsOp")
    ;
    class_<gemmi::Entity>("Entity")
    ;
    class_<gemmi::Connection>("Connection")
    ;
    class_<gemmi::Helix>("Helix")
    ;
    class_<gemmi::Sheet>("Sheet")
    ;
    class_<gemmi::Assembly>("Assembly")
    ;
    class_<gemmi::Metadata>("Metadata")
    ;
    class_<gemmi::Transform>("Transform")
    ;
    class_<gemmi::FTransform>("FTransform")
    ;
    class_<gemmi::Mat33>("Mat33")
    ;
    class_<gemmi::Vec3>("Vec3")
    ;
    class_<gemmi::Op>("Op")
    ;
    class_<gemmi::GroupOps>("GroupOps")
    ;
    class_<gemmi::SpaceGroup>("SpaceGroup")
    ;
    class_<gemmi::Position>("Position")
    ;
    class_<gemmi::Fractional>("Fractional")
    ;
    class_<gemmi::NearestImage>("NearestImage")
    ;
    class_<gemmi::Miller>("Miller")
    ;
    class_<gemmi::Structure>("Structure")
    .constructor<>()
    .property("name",&gemmi::Structure::name)
    .property("spacegroup_hm",&gemmi::Structure::spacegroup_hm)
    .property("has_origx",&gemmi::Structure::has_origx)
    .property("models",&gemmi::Structure::models)
    .property("ncs",&gemmi::Structure::ncs)
    .property("entities",&gemmi::Structure::entities)
    .property("connections",&gemmi::Structure::connections)
    .property("helices",&gemmi::Structure::helices)
    .property("sheets",&gemmi::Structure::sheets)
    .property("assemblies",&gemmi::Structure::assemblies)
    .property("cell",&gemmi::Structure::cell)
    .property("meta",&gemmi::Structure::meta)
    .property("origx",&gemmi::Structure::origx)
    .property("resolution",&gemmi::Structure::resolution)
    .property("raw_remarks",&gemmi::Structure::raw_remarks)
    .property("input_format",&gemmi::Structure::input_format)
    .function("get_info",&gemmi::Structure::get_info)
    .function("remove_model",&gemmi::Structure::remove_model)
    .function("renumber_models",&gemmi::Structure::renumber_models)
    .function("ncs_given_count",&gemmi::Structure::ncs_given_count)
    .function("get_ncs_multiplier",&gemmi::Structure::get_ncs_multiplier)
    .function("ncs_not_expanded",&gemmi::Structure::ncs_not_expanded)
    .function("merge_chain_parts",&gemmi::Structure::merge_chain_parts)
    .function("remove_empty_chains",&gemmi::Structure::remove_empty_chains)
    .function("empty_copy",&gemmi::Structure::empty_copy)
    .function("setup_cell_images",&gemmi::Structure::setup_cell_images)
    .function("first_model",select_overload<const gemmi::Model&(void)const>(&gemmi::Structure::first_model))
    ;
    function("read_structure_file",&gemmi::read_structure_file);
}
