#include "moorhen-wrappers-helpers.h"

EMSCRIPTEN_BINDINGS(moorhen_types) {
        // PRIVATEER
    value_object<TorsionEntry>("TorsionEntry")
      .field("sugar_1", &TorsionEntry::sugar_1)
      .field("sugar_2", &TorsionEntry::sugar_2)
      .field("atom_number_1", &TorsionEntry::atom_number_1)
      .field("atom_number_2", &TorsionEntry::atom_number_2)
      .field("phi", &TorsionEntry::phi)
      .field("psi", &TorsionEntry::psi)
    ;

    register_vector<TorsionEntry>("vector<TorsionEntry>");
    register_vector<coot::residue_range_t>("vector_residue_range_t");
    register_vector<coot::geometry_distortion_info_container_t>("vector_geometry_distortion_info_container_t");
    register_vector<coot::geometry_distortion_info_t>("vector_geometry_distortion_info_t");

    value_object<TableEntry>("TableEntry")
      .field("svg", &TableEntry::svg)
      .field("wurcs", &TableEntry::wurcs)
      .field("chain", &TableEntry::chain)
      .field("glyconnect_id", &TableEntry::glyconnect_id)
      .field("glytoucan_id", &TableEntry::glytoucan_id)
      .field("id", &TableEntry::id)
      .field("torsion_err", &TableEntry::torsion_err)
      .field("conformation_err", &TableEntry::conformation_err)
      .field("anomer_err", &TableEntry::anomer_err)
      .field("puckering_err", &TableEntry::puckering_err)
      .field("chirality_err", &TableEntry::chirality_err)
      .field("torsions", &TableEntry::torsions)
    ;

    function("validate", &validate);
    register_vector<TableEntry>("Table");
    // END PRIVATEER

    function("unpackCootDataFile",&unpackCootDataFile);
    function("testFloat32Array", &testFloat32Array);
    function("getPositionsFromSimpleMesh2", &getPositionsFromSimpleMesh2);
    function("getReversedNormalsFromSimpleMesh2", &getReversedNormalsFromSimpleMesh2);
    function("getReversedNormalsFromSimpleMesh3", &getReversedNormalsFromSimpleMesh3);
    function("getNormalsFromSimpleMesh2", &getNormalsFromSimpleMesh2);
    function("getColoursFromSimpleMesh2", &getColoursFromSimpleMesh2);
    function("getPositionsFromSimpleMesh", &getPositionsFromSimpleMesh);
    function("getReversedNormalsFromSimpleMesh", &getReversedNormalsFromSimpleMesh);
    function("getNormalsFromSimpleMesh", &getNormalsFromSimpleMesh);
    function("getColoursFromSimpleMesh", &getColoursFromSimpleMesh);
    function("getLineIndicesFromSimpleMesh", &getLineIndicesFromSimpleMesh);
    function("getPermutedTriangleIndicesFromSimpleMesh", &getPermutedTriangleIndicesFromSimpleMesh);
    function("getTriangleIndicesFromSimpleMesh", &getTriangleIndicesFromSimpleMesh);
    function("getLineIndicesFromSimpleMesh2", &getLineIndicesFromSimpleMesh2);
    function("getPermutedTriangleIndicesFromSimpleMesh2", &getPermutedTriangleIndicesFromSimpleMesh2);
    function("getTriangleIndicesFromSimpleMesh2", &getTriangleIndicesFromSimpleMesh2);
    function("getTextureArray", &getTextureArray);
    class_<clipper::Coord_orth>("Coord_orth")
    .constructor<const clipper::ftype&, const clipper::ftype&, const clipper::ftype&>()
    .function("x", &clipper::Coord_orth::x)
    .function("y", &clipper::Coord_orth::y)
    .function("z", &clipper::Coord_orth::z)
    ;
    value_object<coot::util::map_molecule_centre_info_t>("map_molecule_centre_info_t")
    .field("success", &coot::util::map_molecule_centre_info_t::success)
    .field("updated_centre", &coot::util::map_molecule_centre_info_t::updated_centre)
    .field("suggested_radius", &coot::util::map_molecule_centre_info_t::suggested_radius)
    .field("suggested_contour_level", &coot::util::map_molecule_centre_info_t::suggested_contour_level)
    ;
    value_object<std::pair<std::array<float,3>,float>>("pair_position_value")
    .field("position", &std::pair<std::array<float,3>,float>::first)
    .field("value", &std::pair<std::array<float,3>,float>::second)
    ;

    value_object<coot::atom_overlap_t>("atom_overlap_t")
    .field("overlap_volume", &coot::atom_overlap_t::overlap_volume)
    .field("r_1", &coot::atom_overlap_t::r_1)
    .field("r_2", &coot::atom_overlap_t::r_2)
    .field("is_h_bond", &coot::atom_overlap_t::is_h_bond)
    .field("ligand_atom_index", &coot::atom_overlap_t::ligand_atom_index)
    ;
    register_vector<coot::atom_overlap_t>("vector_overlap");
    class_<clipper::Spgr_descr>("Spgr_descr")
    .function("spacegroup_number", &clipper::Spgr_descr::spacegroup_number)
    .function("symbol_hall", &clipper::Spgr_descr::symbol_hall)
    .function("symbol_hm", &clipper::Spgr_descr::symbol_hm)
    .function("symbol_xhm", &clipper::Spgr_descr::symbol_xhm)
    .function("symbol_hm_ext", &clipper::Spgr_descr::symbol_hm_ext)
    ;
    class_<clipper::Spacegroup, base<clipper::Spgr_descr>>("Spacegroup")
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
    .function("as_string", &clipperStringAsString)
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
    class_<coot::geometry_distortion_info_container_t>("geometry_distortion_info_container_t")
      .constructor()
      .property("geometry_distortion",&coot::geometry_distortion_info_container_t::geometry_distortion)
      .property("chain_id",&coot::geometry_distortion_info_container_t::chain_id)
      .property("n_atoms",&coot::geometry_distortion_info_container_t::n_atoms)
      .property("min_resno",&coot::geometry_distortion_info_container_t::min_resno)
      .property("max_resno",&coot::geometry_distortion_info_container_t::max_resno)
      .function("set_min_max",&coot::geometry_distortion_info_container_t::set_min_max)
      .function("size",&coot::geometry_distortion_info_container_t::size)
      .function("print",&coot::geometry_distortion_info_container_t::print)
      .function("distortion",&coot::geometry_distortion_info_container_t::distortion)
      .function("distortion_sum",&coot::geometry_distortion_info_container_t::distortion_sum)
      .function("get_geometry_distortion_info",&coot::geometry_distortion_info_container_t::get_geometry_distortion_info)
    ;
    //FIXME - this ignores simple_restraint
    class_<coot::geometry_distortion_info_t>("geometry_distortion_info_t")
      .constructor()
      .property("is_set",&coot::geometry_distortion_info_t::is_set)
      .property("distortion_score",&coot::geometry_distortion_info_t::distortion_score)
      .property("atom_indices",&coot::geometry_distortion_info_t::atom_indices)
      .property("atom_specs",&coot::geometry_distortion_info_t::atom_specs)
      .property("residue_spec",&coot::geometry_distortion_info_t::residue_spec)
      .function("initialised_p",&coot::geometry_distortion_info_t::initialised_p)
    ;
    class_<coot::residue_range_t>("residue_range_t")
      .constructor()
      .constructor<const std::string&, int, int>()
      .property("chain_id",&coot::residue_range_t::chain_id)
      .property("res_no_start",&coot::residue_range_t::res_no_start)
      .property("res_no_end",&coot::residue_range_t::res_no_end)
    ;
    class_<coot::mutate_insertion_range_info_t>("mutate_insertion_range_info_t")
      .constructor<int, const std::vector<std::string>&>()
      .property("start_resno",&coot::mutate_insertion_range_info_t::start_resno)
      .property("types",&coot::mutate_insertion_range_info_t::types)
      .function("end_resno",&coot::mutate_insertion_range_info_t::end_resno)
    ;
    class_<coot::chain_mutation_info_container_t>("chain_mutation_info_container_t")
      .constructor()
      .constructor<const std::string&>()
      .property("chain_id",&coot::chain_mutation_info_container_t::chain_id)
      .property("alignedS",&coot::chain_mutation_info_container_t::alignedS)
      .property("alignedT",&coot::chain_mutation_info_container_t::alignedT)
      .property("alignedS_label",&coot::chain_mutation_info_container_t::alignedS_label)
      .property("alignedT_label",&coot::chain_mutation_info_container_t::alignedT_label)
      .property("alignment_string",&coot::chain_mutation_info_container_t::alignment_string)
      .property("alignment_score",&coot::chain_mutation_info_container_t::alignment_score)
      .property("insertions",&coot::chain_mutation_info_container_t::insertions)
      .property("single_insertions",&coot::chain_mutation_info_container_t::single_insertions)
      .property("deletions",&coot::chain_mutation_info_container_t::deletions)
      .property("mutations",&coot::chain_mutation_info_container_t::mutations)
      .function("add_deletion",&coot::chain_mutation_info_container_t::add_deletion)
      .function("add_mutation",&coot::chain_mutation_info_container_t::add_mutation)
      .function("add_insertion",&coot::chain_mutation_info_container_t::add_insertion)
      .function("rationalize_insertions",&coot::chain_mutation_info_container_t::rationalize_insertions)
      .function("get_residue_type",&coot::chain_mutation_info_container_t::get_residue_type)
      .function("print",&coot::chain_mutation_info_container_t::print)
      .function("dissimilarity_score",&coot::chain_mutation_info_container_t::dissimilarity_score)
    ;
    value_object<merge_molecule_results_info_t>("merge_molecule_results_info_t")
    .field("chain_id", &merge_molecule_results_info_t::chain_id)
    .field("spec", &merge_molecule_results_info_t::spec)
    .field("is_chain", &merge_molecule_results_info_t::is_chain)
    ;
    value_object<coot::acedrg_types_for_bond_t>("acedrg_types_for_bond_t")
       .field("atom_id_1",   &coot::acedrg_types_for_bond_t::atom_id_1)
       .field("atom_id_2",   &coot::acedrg_types_for_bond_t::atom_id_2)
       .field("atom_type_1", &coot::acedrg_types_for_bond_t::atom_type_1)
       .field("atom_type_2", &coot::acedrg_types_for_bond_t::atom_type_2)
       .field("bond_length", &coot::acedrg_types_for_bond_t::bond_length)
    ;
    register_vector<coot::acedrg_types_for_bond_t>("VectorAcedrgTypesForBond_t");

    value_object<coot::acedrg_types_for_residue_t>("acedrg_types_for_residue_t")
       .field("bond_types",   &coot::acedrg_types_for_residue_t::bond_types)
    ;
    value_object<coot::residue_validation_information_t>("residue_validation_information_t")
    .field("function_value", &coot::residue_validation_information_t::function_value)
    .field("label", &coot::residue_validation_information_t::label)
    .field("residue_spec", &coot::residue_validation_information_t::residue_spec)
    .field("atom_spec", &coot::residue_validation_information_t::atom_spec)
    ;
    value_object<coot::chain_validation_information_t>("chain_validation_information_t")
    .field("chain_id", &coot::chain_validation_information_t::chain_id)
    .field("rviv", &coot::chain_validation_information_t::rviv)
    ;
    class_<coot::validation_information_t>("validation_information_t")
    .property("name", &coot::validation_information_t::name)
    .property("type", &coot::validation_information_t::type)
    .property("cviv", &coot::validation_information_t::cviv)
    .function("get_index_for_chain",&coot::validation_information_t::get_index_for_chain)
    .function("empty",&coot::validation_information_t::empty)
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
    .function("residue_name", &coot::phi_psi_prob_t::residue_name)// Should be function?
    .function("is_allowed", &coot::phi_psi_prob_t::is_allowed)
    ;
    class_<coot::api::moved_atom_t>("moved_atom_t")
    .constructor<const std::string&, const std::string&, float, float, float, int>()
    .property("atom_name", &coot::api::moved_atom_t::atom_name)
    .property("alt_conf", &coot::api::moved_atom_t::alt_conf)
    .property("x", &coot::api::moved_atom_t::x)
    .property("y", &coot::api::moved_atom_t::y)
    .property("z", &coot::api::moved_atom_t::z)
    .property("index", &coot::api::moved_atom_t::index)
    ;
    value_object<molecules_container_t::auto_read_mtz_info_t>("auto_read_mtz_info_t")
    .field("idx", &molecules_container_t::auto_read_mtz_info_t::idx)
    .field("F", &molecules_container_t::auto_read_mtz_info_t::F)
    .field("F_obs", &molecules_container_t::auto_read_mtz_info_t::F_obs)
    .field("sigF_obs", &molecules_container_t::auto_read_mtz_info_t::sigF_obs)
    .field("Rfree", &molecules_container_t::auto_read_mtz_info_t::Rfree)
    .field("phi", &molecules_container_t::auto_read_mtz_info_t::phi)
    .field("w", &molecules_container_t::auto_read_mtz_info_t::w)
    .field("weights_used", &molecules_container_t::auto_read_mtz_info_t::weights_used)
    ;
    value_object<coot::molecule_t::interesting_place_t>("interesting_place_t")
    .field("feature_type", &coot::molecule_t::interesting_place_t::feature_type)
    .field("residue_spec", &coot::molecule_t::interesting_place_t::residue_spec)
    .field("button_label", &coot::molecule_t::interesting_place_t::button_label)
    .field("feature_value", &coot::molecule_t::interesting_place_t::feature_value)
    .field("badness", &coot::molecule_t::interesting_place_t::badness)
    .field("x", &coot::molecule_t::interesting_place_t::x)
    .field("y", &coot::molecule_t::interesting_place_t::y)
    .field("z", &coot::molecule_t::interesting_place_t::z)
    ;
    class_<coot::api::moved_residue_t>("moved_residue_t")
    .constructor<const std::string&, int, const std::string&>()
    .property("chain_id", &coot::api::moved_residue_t::chain_id)
    .property("res_no", &coot::api::moved_residue_t::res_no)
    .property("ins_code", &coot::api::moved_residue_t::ins_code)
    .property("moved_atoms", &coot::api::moved_residue_t::moved_atoms)
    .function("add_atom",&coot::api::moved_residue_t::add_atom)
    ;
    value_object<coot::Cell>("Coot_Cell")
    .field("a", &coot::Cell::a)
    .field("b", &coot::Cell::b)
    .field("c", &coot::Cell::c)
    .field("alpha", &coot::Cell::alpha)
    .field("beta", &coot::Cell::beta)
    .field("gamma", &coot::Cell::gamma)
    ;
    value_object<coot::symmetry_info_t>("symmetry_info_t")
    .field("cell",&coot::symmetry_info_t::cell)
    .field("symm_trans",&coot::symmetry_info_t::symm_trans)
    ;
    value_object<texture_as_floats_t>("texture_as_floats_t")
    .field("width", &texture_as_floats_t::width)
    .field("height", &texture_as_floats_t::height)
    .field("x_size", &texture_as_floats_t::x_size)
    .field("y_size", &texture_as_floats_t::y_size)
    .field("z_position", &texture_as_floats_t::z_position)
    //.field("image_data", &texture_as_floats_t::image_data)
    ;
    value_object<molecules_container_t::fit_ligand_info_t>("fit_ligand_info_t")
    .field("imol", &molecules_container_t::fit_ligand_info_t::imol)
    .field("cluster_idx", &molecules_container_t::fit_ligand_info_t::cluster_idx)
    .field("ligand_idx", &molecules_container_t::fit_ligand_info_t::ligand_idx)
    .field("fitting_score", &molecules_container_t::fit_ligand_info_t::fitting_score)
    .field("cluster_volume", &molecules_container_t::fit_ligand_info_t::cluster_volume)
    ;
    value_object<generic_3d_lines_bonds_box_t>("generic_3d_lines_bonds_box_t")
    .field("line_segments", &generic_3d_lines_bonds_box_t::line_segments)
    ;
    class_<coot::CartesianPair>("CartesianPair")
    .function("getStart", &coot::CartesianPair::getStart)
    .function("getFinish", &coot::CartesianPair::getFinish)
    .function("amplitude", &coot::CartesianPair::amplitude)
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
    value_object<coot::instancing_data_type_A_t>("instancing_data_type_A_t")
    .field("position",&coot::instancing_data_type_A_t::position)
    .field("colour",&coot::instancing_data_type_A_t::colour)
    .field("size",&coot::instancing_data_type_A_t::size)
    ;
    value_object<coot::instancing_data_type_B_t>("instancing_data_type_B_t")
    .field("position",&coot::instancing_data_type_B_t::position)
    .field("colour",&coot::instancing_data_type_B_t::colour)
    .field("size",&coot::instancing_data_type_B_t::size)
    .field("orientation",&coot::instancing_data_type_B_t::orientation)
    ;
    value_object<coot::instanced_geometry_t>("instanced_geometry_t")
    .field("vertices",&coot::instanced_geometry_t::vertices)
    .field("triangles",&coot::instanced_geometry_t::triangles)
    .field("instancing_data_A",&coot::instanced_geometry_t::instancing_data_A)
    .field("instancing_data_B",&coot::instanced_geometry_t::instancing_data_B)
    .field("name",&coot::instanced_geometry_t::name)
    ;
    value_object<coot::instanced_mesh_t>("instanced_mesh_t")
    .field("geom",&coot::instanced_mesh_t::geom)
    .field("markup",&coot::instanced_mesh_t::markup)
    ;
    value_object<coot::atom_spec_t>("atom_spec_t")
    .field("chain_id",&coot::atom_spec_t::chain_id)
    .field("res_no",&coot::atom_spec_t::res_no)
    .field("ins_code",&coot::atom_spec_t::ins_code)
    .field("atom_name",&coot::atom_spec_t::atom_name)
    .field("alt_conf",&coot::atom_spec_t::alt_conf)
    .field("int_user_data",&coot::atom_spec_t::int_user_data)
    .field("float_user_data",&coot::atom_spec_t::float_user_data)
    .field("string_user_data",&coot::atom_spec_t::string_user_data)
    .field("model_number",&coot::atom_spec_t::model_number)
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
    value_object<coot::residue_spec_t>("residue_spec_t")
    .field("model_number",&coot::residue_spec_t::model_number)
    .field("chain_id",&coot::residue_spec_t::chain_id)
    .field("res_no",&coot::residue_spec_t::res_no)
    .field("ins_code",&coot::residue_spec_t::ins_code)
    .field("int_user_data",&coot::residue_spec_t::int_user_data)
    ;
    value_object<coot::api::vnc_vertex>("vnc_vertex")
    .field("pos",&coot::api::vnc_vertex::pos)
    .field("normal",&coot::api::vnc_vertex::normal)
    .field("color",&coot::api::vnc_vertex::color)
    ;
    value_object<coot::api::vn_vertex>("vn_vertex")
    .field("pos",&coot::api::vn_vertex::pos)
    .field("normal",&coot::api::vn_vertex::normal)
    ;
    value_object<coot::molecule_t::rotamer_change_info_t>("rotamer_change_info_t")
    .field("rank", &coot::molecule_t::rotamer_change_info_t::rank)
    .field("name", &coot::molecule_t::rotamer_change_info_t::name)
    .field("richardson_probability", &coot::molecule_t::rotamer_change_info_t::richardson_probability)
    .field("status", &coot::molecule_t::rotamer_change_info_t::status)
    ;
    value_object<g_triangle>("g_triangle")
    .field("point_id", &g_triangle::point_id)
    ;
    value_object<Cell_Translation>("Cell_Translation")
    .field("us", &Cell_Translation::us)
    .field("ws", &Cell_Translation::ws)
    .field("vs", &Cell_Translation::vs)
    ;
    class_<symm_trans_t>("symm_trans_t")
    .property("symm_as_string",&symm_trans_t::symm_as_string)
    .function("is_identity",&symm_trans_t::is_identity)
    .function("add_shift",&symm_trans_t::add_shift)
    .function("isym",&symm_trans_t::isym)
    .function("x",&symm_trans_t::x)
    .function("y",&symm_trans_t::y)
    .function("z",&symm_trans_t::z)
    ;
    value_object<coot::simple_mesh_t>("simple_mesh_t")
    .field("vertices",&coot::simple_mesh_t::vertices)
    .field("triangles",&coot::simple_mesh_t::triangles)
    .field("status",&coot::simple_mesh_t::status)
    .field("name",&coot::simple_mesh_t::name)
    ;

    class_<coot::util::density_correlation_stats_info_t>("density_correlation_stats_info_t")
    .property("n",&coot::util::density_correlation_stats_info_t::n)
    .property("sum_xy",&coot::util::density_correlation_stats_info_t::sum_xy)
    .property("sum_sqrd_x",&coot::util::density_correlation_stats_info_t::sum_sqrd_x)
    .property("sum_sqrd_y",&coot::util::density_correlation_stats_info_t::sum_sqrd_y)
    .property("sum_x",&coot::util::density_correlation_stats_info_t::sum_x)
    .property("sum_y",&coot::util::density_correlation_stats_info_t::sum_y)
    .function("var_x",&coot::util::density_correlation_stats_info_t::var_x)
    .function("var_y",&coot::util::density_correlation_stats_info_t::var_y)
    .function("correlation",&coot::util::density_correlation_stats_info_t::correlation)
    ;

    value_object<superpose_results_t>("superpose_results_t")
    .field("superpose_info",     &superpose_results_t::superpose_info) // a json file (string)
    .field("alignment",          &superpose_results_t::alignment)
    .field("alignment_info_vec", &superpose_results_t::alignment_info_vec)
    .field("aligned_pairs",      &superpose_results_t::aligned_pairs)
    ;

    value_array<std::array<float, 16>>("array_native_float_16")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
        .element(emscripten::index<4>())
        .element(emscripten::index<5>())
        .element(emscripten::index<6>())
        .element(emscripten::index<7>())
        .element(emscripten::index<8>())
        .element(emscripten::index<9>())
        .element(emscripten::index<10>())
        .element(emscripten::index<11>())
        .element(emscripten::index<12>())
        .element(emscripten::index<13>())
        .element(emscripten::index<14>())
        .element(emscripten::index<15>())
    ;

    value_array<std::array<float, 3>>("array_native_float_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;

    value_array<std::array<float, 4>>("array_native_float_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;

    value_object<moorhen::header_info_t>("moorhen_header_info_t")
        .field("title", &moorhen::header_info_t::title)
        .field("journal_lines", &moorhen::header_info_t::journal_lines)
        .field("author_lines", &moorhen::header_info_t::author_lines)
        .field("compound_lines", &moorhen::header_info_t::compound_lines)
        .field("helix_info", &moorhen::header_info_t::helix_info)
    ;

    register_vector<moorhen::header_info_t>("vector_header_info_t");

    value_object<coot::molecule_t::histogram_info_t>("histogram_info_t")
        .field("base", &coot::molecule_t::histogram_info_t::base)
        .field("bin_width", &coot::molecule_t::histogram_info_t::bin_width)
        .field("counts", &coot::molecule_t::histogram_info_t::counts)
    ;

    value_object<moorhen::h_bond>("h_bond")
        .field("hb_hydrogen",&moorhen::h_bond::hb_hydrogen)
        .field("donor",&moorhen::h_bond::donor)
        .field("acceptor",&moorhen::h_bond::acceptor)
        .field("donor_neigh",&moorhen::h_bond::donor_neigh)
        .field("acceptor_neigh",&moorhen::h_bond::acceptor_neigh)
        .field("angle_1",&moorhen::h_bond::angle_1)
        .field("angle_2",&moorhen::h_bond::angle_2)
        .field("angle_3",&moorhen::h_bond::angle_3)
        .field("dist",&moorhen::h_bond::dist)
        .field("ligand_atom_is_donor",&moorhen::h_bond::ligand_atom_is_donor)
        .field("hydrogen_is_ligand_atom",&moorhen::h_bond::hydrogen_is_ligand_atom)
        .field("bond_has_hydrogen_flag",&moorhen::h_bond::bond_has_hydrogen_flag)
    ;

    value_object<moorhen::h_bond_atom>("h_bond_atom")
        .field("serial",&moorhen::h_bond_atom::serial)
        .field("x",&moorhen::h_bond_atom::x)
        .field("y",&moorhen::h_bond_atom::y)
        .field("z",&moorhen::h_bond_atom::z)
        .field("charge",&moorhen::h_bond_atom::charge)
        .field("occ",&moorhen::h_bond_atom::occ)
        .field("b_iso",&moorhen::h_bond_atom::b_iso)
        .field("element",&moorhen::h_bond_atom::element)
        .field("name",&moorhen::h_bond_atom::name)
        .field("model",&moorhen::h_bond_atom::model)
        .field("chain",&moorhen::h_bond_atom::chain)
        .field("res_no",&moorhen::h_bond_atom::res_no)
        .field("residue_name",&moorhen::h_bond_atom::residue_name)
        .field("altLoc",&moorhen::h_bond_atom::altLoc)
    ;

    value_object<ValidateOptions>("ConKitValidateOptions")
        .field("seqfile",&ValidateOptions::seqfile)
        .field("seqformat",&ValidateOptions::seqformat)
        .field("model_file",&ValidateOptions::model_file)
        .field("pdb_file",&ValidateOptions::pdb_file)
        .field("pdb_chain",&ValidateOptions::pdb_chain)
        .field("model_chain",&ValidateOptions::model_chain)
        .field("output",&ValidateOptions::output)
        .field("overwrite",&ValidateOptions::overwrite)
        .field("gap_opening_penalty",&ValidateOptions::gap_opening_penalty)
        .field("gap_extension_penalty",&ValidateOptions::gap_extension_penalty)
        .field("seq_separation_cutoff",&ValidateOptions::seq_separation_cutoff)
        .field("n_iterations",&ValidateOptions::n_iterations)
        .field("use_gap_ss",&ValidateOptions::use_gap_ss)
        .field("gap_ss_w",&ValidateOptions::gap_ss_w)
        .field("use_prf",&ValidateOptions::use_prf)
        .field("prf_w",&ValidateOptions::prf_w)
        .field("map_align_silent",&ValidateOptions::map_align_silent)
        .field("silent",&ValidateOptions::silent)
        .field("renumber",&ValidateOptions::renumber)
    ;

    register_vector<molecules_container_t::fit_ligand_info_t>("VectorFitLigandInfo_t");
    register_vector<coot::atom_spec_t>("VectorAtomSpec_t");
    register_vector<molecules_container_t::auto_read_mtz_info_t>("VectorAutoReadMtzInfo_t");
    register_vector<coot::CartesianPair>("VectorCootCartesianPair");
    register_vector<std::vector<coot::CartesianPair>>("VectorVectorCootCartesianPair");
    register_vector<coot::Cartesian>("VectorCootCartesian");
    register_vector<std::vector<coot::Cartesian>>("VectorVectorCootCartesian");
    register_map<std::string,std::vector<std::string>>("MapStringVectorString");
    register_map<unsigned int, std::array<float, 3>>("MapIntFloat3");
    register_map<unsigned int, std::array<float, 4>>("MapIntFloat4");
    register_map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>("Map_residue_spec_t_density_correlation_stats_info_t");
    register_vector<std::array<float, 16>>("VectorArrayFloat16");
    register_vector<std::pair<clipper::Coord_orth, float>>("VectorClipperCoordOrth_float_pair");
    register_vector<std::pair<std::string, int>>("VectorStringInt_pair");
    register_vector<std::pair<int, int>>("VectorInt_pair");
    register_vector<std::pair<float, float>>("VectorFloat_pair");
    register_vector<std::pair<double, double>>("VectorDouble_pair");
    register_vector<std::pair<std::string, unsigned int> >("VectorStringUInt_pair");
    register_vector<std::pair<symm_trans_t, Cell_Translation>>("Vectorsym_trans_t_Cell_Translation_pair");
    register_vector<std::pair<std::string, std::string>>("Vectorstring_string_pair");
    register_vector<moorhen_hbond>("Vectormoorhen_hbond");
    register_vector<coot::instanced_geometry_t>("Vectorinstanced_geometry_t");
    register_vector<coot::api::moved_residue_t>("Vectormoved_residue_t");
    register_vector<coot::api::moved_atom_t>("Vectormoved_atom_t");
    register_vector<std::string>("VectorString");
    register_vector<std::vector<std::string>>("VectorVectorString");
    register_vector<float>("VectorFloat");
    register_vector<double>("VectorDouble");
    register_vector<int>("VectorInt");
    register_vector<char>("VectorChar");
    register_vector<coot::validation_information_t>("VectorValidationInformation");
    register_vector<std::pair<coot::residue_validation_information_t, coot::residue_validation_information_t> >("VectorResidueValidationInformationPair");
    register_vector<RamachandranInfo>("VectorResidueIdentifier");
    register_vector<ResiduePropertyInfo>("VectorResiduePropertyInfo");
    register_vector<coot::chain_validation_information_t>("Vectorchain_validation_information_t");
    register_vector<coot::residue_validation_information_t>("Vectorresidue_validation_information_t");
    register_vector<coot::simple_rotamer>("Vectorsimple_rotamer");
    register_vector<coot::residue_spec_t>("Vectorresidue_spec_t");
    register_vector<coot::api::vnc_vertex>("Vectorvnc_veertex");
    register_vector<coot::api::vn_vertex>("Vectorvn_vertex");
    register_vector<coot::molecule_t::interesting_place_t>("Vectorinteresting_place_t");
    register_vector<g_triangle>("Vectorg_triangle");
    register_vector<coot::instancing_data_type_A_t>("Vectorinstancing_data_type_A_t");
    register_vector<coot::instancing_data_type_B_t>("Vectorinstancing_data_type_B_t");
    register_vector<std::pair<coot::residue_spec_t,std::string>>("Vectorresidue_spec_t_string_pair");
    register_vector<merge_molecule_results_info_t>("Vectormerge_molecule_results_info_t");
    register_vector<coot::phi_psi_prob_t>("Vectophi_psi_prob_t");
    register_vector<moorhen::h_bond>("Vectorh_bond");

    value_object<coot::util::sfcalc_genmap_stats_t>("sfcalc_genmap_stats_t")
        .field("r_factor",&coot::util::sfcalc_genmap_stats_t::r_factor)
        .field("free_r_factor",&coot::util::sfcalc_genmap_stats_t::free_r_factor)
        .field("bulk_solvent_volume",&coot::util::sfcalc_genmap_stats_t::bulk_solvent_volume)
        .field("bulk_correction",&coot::util::sfcalc_genmap_stats_t::bulk_correction)
        .field("n_splines",&coot::util::sfcalc_genmap_stats_t::n_splines)
    ;
    value_object<molecules_container_t::r_factor_stats>("r_factor_stats")
        .field("r_factor",&molecules_container_t::r_factor_stats::r_factor)
        .field("free_r_factor",&molecules_container_t::r_factor_stats::free_r_factor)
        .field("rail_points_total",&molecules_container_t::r_factor_stats::rail_points_total)
        .field("rail_points_new",&molecules_container_t::r_factor_stats::rail_points_new)
    ;
    value_object<std::pair<bool, float>>("pair_bool_float")
        .field("first",&std::pair<bool, float>::first)
        .field("second",&std::pair<bool, float>::second)
    ;
    value_object<std::pair<double, std::vector<double> > >("pair_double_vector_double")
        .field("first",&std::pair<double, std::vector<double>>::first)
        .field("second",&std::pair<double, std::vector<double>>::second)
    ;
    value_object<std::pair<clipper::Coord_orth, float>>("pair_clipper_coord_orth_float")
        .field("first",&std::pair<clipper::Coord_orth, float>::first)
        .field("second",&std::pair<clipper::Coord_orth, float>::second)
    ;
    value_object<std::pair<int,std::vector<merge_molecule_results_info_t>>>("int_vector_merge_molecule_results_info_t_pair")
        .field("first",&std::pair<int,std::vector<merge_molecule_results_info_t>>::first)
        .field("second",&std::pair<int,std::vector<merge_molecule_results_info_t>>::second)
    ;
    value_object<std::pair<coot::residue_spec_t,std::string>>("residue_spec_t_string_pair")
        .field("first",&std::pair<coot::residue_spec_t,std::string>::first)
        .field("second",&std::pair<coot::residue_spec_t,std::string>::second)
    ;
    value_object<std::pair<symm_trans_t, Cell_Translation>>("sym_trans_t_cell_translation_pair")
        .field("first",&std::pair<symm_trans_t, Cell_Translation>::first)
        .field("second",&std::pair<symm_trans_t, Cell_Translation>::second)
    ;
    value_object<std::pair<std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>,std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>>>("map_residue_spec_t_:density_correlation_stats_info_t_pair")
        .field("first",&std::pair<std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>,std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>>::first)
        .field("second",&std::pair<std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>,std::map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>>::second)
    ;
    value_object<std::pair<std::string,std::string>>("string_string_pair")
        .field("first",&std::pair<std::string, std::string>::first)
        .field("second",&std::pair<std::string, std::string>::second)
    ;
    value_object<std::pair<std::string,int>>("string_int_pair")
        .field("first",&std::pair<std::string,int>::first)
        .field("second",&std::pair<std::string,int>::second)
    ;
    value_object<std::pair<int,std::string>>("int_string_pair")
        .field("first",&std::pair<int,std::string>::first)
        .field("second",&std::pair<int,std::string>::second)
    ;
    value_object<std::pair<unsigned int,int>>("uint_int_pair")
        .field("first",&std::pair<unsigned int,int>::first)
        .field("second",&std::pair<unsigned int,int>::second)
    ;
    value_object<std::pair<int,unsigned int>>("int_uint_pair")
        .field("first",&std::pair<int,unsigned int>::first)
        .field("second",&std::pair<int,unsigned int>::second)
    ;
    value_object<std::pair<int,int>>("int_int_pair")
        .field("first",&std::pair<int,int>::first)
        .field("second",&std::pair<int,int>::second)
    ;
    value_object<std::pair<float,float>>("float_float_pair")
        .field("first",&std::pair<float,float>::first)
        .field("second",&std::pair<float,float>::second)
    ;
    value_object<std::pair<double,double>>("double_double_pair")
        .field("first",&std::pair<double,double>::first)
        .field("second",&std::pair<double,double>::second)
    ;
    value_object<std::pair<int,double>>("int_double_pair")
        .field("first",&std::pair<int,double>::first)
        .field("second",&std::pair<int,double>::second)
    ;
    value_object<std::pair<std::string, unsigned int>>("string_uint_pair")
        .field("first",&std::pair<std::string, unsigned int>::first)
        .field("second",&std::pair<std::string, unsigned int>::second)
    ;

    value_object<std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>>("symmetry_info_t_matrixVector_pair")
        .field("first", &std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>::first)
        .field("second",&std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>::second)
    ;

    value_object<std::pair<coot::residue_validation_information_t, coot::residue_validation_information_t>>("residue_validation_information_pair")
        .field("first",  &std::pair<coot::residue_validation_information_t, coot::residue_validation_information_t>::first)
        .field("second", &std::pair<coot::residue_validation_information_t, coot::residue_validation_information_t>::second)
    ;

    value_object<lsq_results_t>("lsq_results_t")
      .field("rotation_matrix", &lsq_results_t::rotation_matrix)
      .field("translation",     &lsq_results_t::translation)
    ;

    class_<moorhen::helix_t>("helix_t")
       .constructor<int, const std::string &, const std::string &, const std::string &,
              int, const std::string &,
              const std::string &, const std::string &, int, const std::string &,
              int, const std::string &, int>()
       .property("serNum", &moorhen::helix_t::serNum)
       .property("helixID", &moorhen::helix_t::helixID)
       .property("initResName", &moorhen::helix_t::initResName)
       .property("initChainID", &moorhen::helix_t::initChainID)
       .property("initSeqNum", &moorhen::helix_t::initSeqNum)
       .property("initICode", &moorhen::helix_t::initICode)
       .property("endResName", &moorhen::helix_t::endResName)
       .property("endChainID", &moorhen::helix_t::endChainID)
       .property("endSeqNum", &moorhen::helix_t::endSeqNum)
       .property("endICode", &moorhen::helix_t::endICode)
       .property("helixClass", &moorhen::helix_t::helixClass)
       .property("comment", &moorhen::helix_t::comment)
       .property("length", &moorhen::helix_t::length)
    ;

    register_vector<moorhen::helix_t>("vector_helix_t");
    register_vector<std::pair<double, std::vector<double>>>("vector_pair_double_vector_double");

    value_object<moorhen_hbond>("moorhen_hbond")
      .field("hb_hydrogen",&moorhen_hbond::hb_hydrogen)
      .field("donor",      &moorhen_hbond::donor)
      .field("acceptor",   &moorhen_hbond::acceptor)
      .field("donor_neigh",&moorhen_hbond::donor_neigh)
      .field("acceptor_neigh",&moorhen_hbond::acceptor_neigh)
      .field("angle_1",    &moorhen_hbond::angle_1)
      .field("angle_2",    &moorhen_hbond::angle_2)
      .field("angle_3",    &moorhen_hbond::angle_3)
      .field("dist",       &moorhen_hbond::dist)
      .field("ligand_atom_is_donor",&moorhen_hbond::ligand_atom_is_donor)
      .field("hydrogen_is_ligand_atom",&moorhen_hbond::hydrogen_is_ligand_atom)
      .field("bond_has_hydrogen_flag",&moorhen_hbond::bond_has_hydrogen_flag)
      .field("donor",&moorhen_hbond::donor)
      .field("acceptor",&moorhen_hbond::acceptor)
      .field("donor_neigh",&moorhen_hbond::donor_neigh)
      .field("acceptor_neigh",&moorhen_hbond::acceptor_neigh)
    ;
    value_object<moorhen_hbond::moorhen_hbond_atom>("moorhen_hbond_atom")
      .field("serial",&moorhen_hbond::moorhen_hbond_atom::serial)
      .field("x",&moorhen_hbond::moorhen_hbond_atom::x)
      .field("y",&moorhen_hbond::moorhen_hbond_atom::y)
      .field("z",&moorhen_hbond::moorhen_hbond_atom::z)
      .field("b_iso",&moorhen_hbond::moorhen_hbond_atom::b_iso)
      .field("occ",&moorhen_hbond::moorhen_hbond_atom::occ)
      .field("charge",&moorhen_hbond::moorhen_hbond_atom::charge)
      .field("element",&moorhen_hbond::moorhen_hbond_atom::element)
      .field("name",&moorhen_hbond::moorhen_hbond_atom::name)
      .field("model",&moorhen_hbond::moorhen_hbond_atom::model)
      .field("chain",&moorhen_hbond::moorhen_hbond_atom::chain)
      .field("resNum",&moorhen_hbond::moorhen_hbond_atom::resNum)
      .field("residueName",&moorhen_hbond::moorhen_hbond_atom::residueName)
      .field("altLoc",&moorhen_hbond::moorhen_hbond_atom::altLoc)
    ;

    value_object<std::pair<int,coot::instanced_mesh_t>>("int_instanced_mesh_pair")
        .field("first",&std::pair<int,coot::instanced_mesh_t>::first)
        .field("second",&std::pair<int,coot::instanced_mesh_t>::second)
    ;

    value_object<CoordinateHeaderInfo>("CoordinateHeaderInfo")
        .field("title",&CoordinateHeaderInfo::title)
        .field("author",&CoordinateHeaderInfo::author)
        .field("journal",&CoordinateHeaderInfo::journal)
        .field("software",&CoordinateHeaderInfo::software)
        .field("compound",&CoordinateHeaderInfo::compound)
    ;

    value_array<glm::mat4>("array_mat4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;
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

    function("SmallMoleculeCifToMMCif",&SmallMoleculeCifToMMCif);

    function("get_mtz_columns",&get_mtz_columns);
    function("get_coord_header_info",&get_coord_header_info);
    function("is64bit",&is64bit);

    function("run_conkit_validate",&run_conkit_validate_with_exception);

    // Fix unbound types for --emit-tsd
    class_<coot::atom_overlaps_dots_container_t>("coot_atom_overlaps_dots_container_t");
    class_<coot::geometry_distortion_info_pod_container_t>("coot_geometry_distortion_info_pod_container_t");
    register_vector<coot::geometry_distortion_info_pod_container_t>("Vector_coot_geometry_distortion_info_pod_container_t");
    register_vector<coot::mutate_insertion_range_info_t>("Vector_coot_mutate_insertion_range_info_t");
    value_object<std::pair<bool, clipper::Coord_orth>>("pair_bool_Coord_orth")
        .field("first", &std::pair<bool, clipper::Coord_orth>::first)
        .field("second", &std::pair<bool, clipper::Coord_orth>::second)
    ;
    class_<api::cell_t>("api_cell_t");
    register_map<std::string, std::string>("MapStringString_2");
    register_map<std::string, std::vector<coot::simple_rotamer>>("MapStringVectorSimpleRotamer");
    enum_<gemmi::HowToNameCopiedChain>("HowToNameCopiedChain")
        .value("Short", gemmi::HowToNameCopiedChain::Short)
        .value("AddNumber", gemmi::HowToNameCopiedChain::AddNumber)
        .value("Dup", gemmi::HowToNameCopiedChain::Dup)
    ;
}
