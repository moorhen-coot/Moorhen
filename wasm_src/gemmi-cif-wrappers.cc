#include "gemmi-wrappers-helpers.h"

EMSCRIPTEN_BINDINGS(gemmi_cif) {
    class_<gemmi::cif::Block>("cifBlock")
    .property("name",&gemmi::cif::Block::name)
    .property("items",&gemmi::cif::Block::items)
    .function("swap",&gemmi::cif::Block::swap)
    .function("find_values",&gemmi::cif::Block::find_values)
    .function("has_tag",&gemmi::cif::Block::has_tag)
    .function("has_any_value",&gemmi::cif::Block::has_any_value)
    .function("find_with_prefix",select_overload<gemmi::cif::Table(const std::string&, const std::vector<std::string>&)>(&gemmi::cif::Block::find))
    .function("find",select_overload<gemmi::cif::Table(const std::vector<std::string>&)>(&gemmi::cif::Block::find))
    .function("find_any",&gemmi::cif::Block::find_any)
    .function("find_or_add",&gemmi::cif::Block::find_or_add)
    .function("get_index",&gemmi::cif::Block::get_index)
    .function("set_pair",&gemmi::cif::Block::set_pair)
    .function("init_loop",&gemmi::cif::Block::init_loop)
    .function("move_item",&gemmi::cif::Block::move_item)
    .function("get_mmcif_category_names",&gemmi::cif::Block::get_mmcif_category_names)
    .function("find_mmcif_category",&gemmi::cif::Block::find_mmcif_category)
    .function("has_mmcif_category",&gemmi::cif::Block::has_mmcif_category)
    .function("init_mmcif_loop",&gemmi::cif::Block::init_mmcif_loop)
    .function("find_loop",&gemmi::cif::Block::find_loop)
    ;

    class_<gemmi::cif::WriteOptions>("WriteOptions")
    .constructor<>()
    .property("prefer_pairs", &gemmi::cif::WriteOptions::prefer_pairs)
    .property("compact", &gemmi::cif::WriteOptions::compact)
    .property("misuse_hash", &gemmi::cif::WriteOptions::misuse_hash)
    .property("align_pairs", &gemmi::cif::WriteOptions::align_pairs)
    .property("align_loops", &gemmi::cif::WriteOptions::align_loops)
    ;

    class_<gemmi::cif::Document>("cifDocument")
    .constructor<>()
    .property("source",&gemmi::cif::Document::source)
    .property("blocks",&gemmi::cif::Document::blocks)
    .function("add_new_block",&gemmi::cif::Document::add_new_block)
    .function("clear",&gemmi::cif::Document::clear)
    .function("sole_block",select_overload<gemmi::cif::Block&()>(&gemmi::cif::Document::sole_block))
    .function("sole_block_const",select_overload<const gemmi::cif::Block&()const>(&gemmi::cif::Document::sole_block))
    .function("write_file",&cifDocument_write_file)
    .function("write_file_with_options",&cifDocument_write_file_with_options)
    .function("write_file_with_style",&cifDocument_write_file_with_style)
    .function("as_string",&cifDocument_as_string)
    .function("as_string_with_options",&cifDocument_as_string_with_options)
    .function("as_string_with_style",&cifDocument_as_string_with_style)
    ;

    class_<gemmi::cif::Column>("cifColumn")
    .function("length",&gemmi::cif::Column::length)
    .function("at",select_overload<std::string&(int)>(&gemmi::cif::Column::at))
    .function("at_const",select_overload<const std::string&(int)const>(&gemmi::cif::Column::at))
    .function("str",&gemmi::cif::Column::str)
    .function("col",&gemmi::cif::Column::col)
    ;

    class_<gemmi::cif::Table::Row>("cifTableRow")
    .property("row_index",&gemmi::cif::Table::Row::row_index)
    .function("value_at_unsafe",&gemmi::cif::Table::Row::value_at_unsafe)
    .function("value_at",select_overload<std::string&(int)>(&gemmi::cif::Table::Row::value_at))
    .function("value_at_const",select_overload<const std::string&(int)const>(&gemmi::cif::Table::Row::value_at))
    .function("at",select_overload<std::string&(int)>(&gemmi::cif::Table::Row::at))
    .function("at_const",select_overload<const std::string&(int)const>(&gemmi::cif::Table::Row::at))
    .function("has",&gemmi::cif::Table::Row::has)
    .function("has2",&gemmi::cif::Table::Row::has2)
    .function("one_of",&gemmi::cif::Table::Row::one_of)
    .function("size",&gemmi::cif::Table::Row::size)
    .function("str",&gemmi::cif::Table::Row::str)
    ;

    class_<gemmi::cif::Table>("cifTable")
    .property("positions",&gemmi::cif::Table::positions)
    .property("prefix_length",&gemmi::cif::Table::prefix_length)
    .function("ok",&gemmi::cif::Table::ok)
    .function("width",&gemmi::cif::Table::width)
    .function("length",&gemmi::cif::Table::length)
    .function("size",&gemmi::cif::Table::size)
    .function("has_column",&gemmi::cif::Table::has_column)
    .function("at",&gemmi::cif::Table::at)
    .function("one",&gemmi::cif::Table::one)
    .function("get_prefix",&gemmi::cif::Table::get_prefix)
    .function("find_row",&gemmi::cif::Table::find_row)
    .function("remove_row",&gemmi::cif::Table::remove_row)
    .function("remove_rows",&gemmi::cif::Table::remove_rows)
    .function("column_at_pos",&gemmi::cif::Table::column_at_pos)
    .function("column",&gemmi::cif::Table::column)
    .function("move_row",&gemmi::cif::Table::move_row)
    .function("find_column_position",&gemmi::cif::Table::find_column_position)
    .function("find_column",&gemmi::cif::Table::find_column)
    .function("erase",&gemmi::cif::Table::erase)
    ;

    class_<gemmi::cif::Item>("cifItem")
    .property("type",&gemmi::cif::Item::type)
    .property("line_number",&gemmi::cif::Item::line_number)
    .function("erase",&gemmi::cif::Item::erase)
    .function("has_prefix",&gemmi::cif::Item::has_prefix)
    .function("set_value",&gemmi::cif::Item::set_value)
    ;

    class_<gemmi::cif::Loop>("cifLoop")
    .property("tags",&gemmi::cif::Loop::tags)
    .property("values",&gemmi::cif::Loop::values)
    .function("find_tag_lc",&gemmi::cif::Loop::find_tag_lc)
    .function("has_tag",&gemmi::cif::Loop::has_tag)
    .function("width",&gemmi::cif::Loop::width)
    .function("val",select_overload<const std::string&(size_t , size_t )const>(&gemmi::cif::Loop::val))
    .function("clear",&gemmi::cif::Loop::clear)
    .function("pop_row",&gemmi::cif::Loop::pop_row)
    .function("move_row",&gemmi::cif::Loop::move_row)
    .function("set_all_values",&gemmi::cif::Loop::set_all_values)
    ;

    class_<gemmi::cif::ItemSpan>("cifItemSpan")
    .function("set_pair",&gemmi::cif::ItemSpan::set_pair)
    ;

    class_<gemmi::cif::LoopArg>("cifLoopArg")
    ;

    class_<gemmi::cif::FrameArg>("cifFrameArg")
    ;

    class_<gemmi::cif::CommentArg>("cifCommentArg")
    ;

    class_<gemmi::ChemMod::AtomMod>("AtomMod")
    .property("func",&gemmi::ChemMod::AtomMod::func)
    .property("old_id",&gemmi::ChemMod::AtomMod::old_id)
    .property("new_id",&gemmi::ChemMod::AtomMod::new_id)
    .property("el",&gemmi::ChemMod::AtomMod::el)
    .property("charge",&gemmi::ChemMod::AtomMod::charge)
    .property("chem_type",&gemmi::ChemMod::AtomMod::chem_type)
    ;

    class_<gemmi::ChemComp::Atom>("ChemCompAtom")
    .property("id",&gemmi::ChemComp::Atom::id)
    .property("el",&gemmi::ChemComp::Atom::el)
    .property("charge",&gemmi::ChemComp::Atom::charge)
    .property("chem_type",&gemmi::ChemComp::Atom::chem_type)
    .function("is_hydrogen",&gemmi::ChemComp::Atom::is_hydrogen)
    ;

    class_<gemmi::ChemComp::Aliasing>("ChemCompAliasing")
    .property("group",&gemmi::ChemComp::Aliasing::group)
    ;

    class_<gemmi::ChemComp>("ChemComp")
    .property("name",&gemmi::ChemComp::name)
    .property("type_or_group",&gemmi::ChemComp::type_or_group)
    .property("group",&gemmi::ChemComp::group)
    .property("atoms",&gemmi::ChemComp::atoms)
    .property("aliases",&gemmi::ChemComp::aliases)
    .property("rt",&gemmi::ChemComp::rt)
    .function("get_aliasing",&gemmi::ChemComp::get_aliasing)
    .class_function("read_group",&gemmi::ChemComp::read_group)
    .function("set_group",&gemmi::ChemComp::set_group)
    .function("has_atom",&gemmi::ChemComp::has_atom)
    .function("get_atom_index",&gemmi::ChemComp::get_atom_index)
    .function("get_atom",&gemmi::ChemComp::get_atom)
    .class_function("is_peptide_group",&gemmi::ChemComp::is_peptide_group)
    .class_function("is_nucleotide_group",&gemmi::ChemComp::is_nucleotide_group)
    .function("remove_nonmatching_restraints",&gemmi::ChemComp::remove_nonmatching_restraints)
    .function("remove_hydrogens",&gemmi::ChemComp::remove_hydrogens)
    ;

    class_<gemmi::ChemMod>("ChemMod")
    .property("id",&gemmi::ChemMod::id)
    .property("name",&gemmi::ChemMod::name)
    .property("comp_id",&gemmi::ChemMod::comp_id)
    .property("group_id",&gemmi::ChemMod::group_id)
    .property("atom_mods",&gemmi::ChemMod::atom_mods)
    .property("rt",&gemmi::ChemMod::rt)
    .property("block",&gemmi::ChemMod::block)
    .function("apply_to",&gemmi::ChemMod::apply_to)
    ;

    class_<gemmi::EnerLib::Atom>("EnerLibAtom")
    .property("element",&gemmi::EnerLib::Atom::element)
    .property("hb_type",&gemmi::EnerLib::Atom::hb_type)
    .property("vdw_radius",&gemmi::EnerLib::Atom::vdw_radius)
    .property("vdwh_radius",&gemmi::EnerLib::Atom::vdwh_radius)
    .property("ion_radius",&gemmi::EnerLib::Atom::ion_radius)
    .property("valency",&gemmi::EnerLib::Atom::valency)
    .property("sp",&gemmi::EnerLib::Atom::sp)
    ;

    class_<gemmi::EnerLib::Bond>("EnerLibBond")
    .property("atom_type_2",&gemmi::EnerLib::Bond::atom_type_2)
    .property("type",&gemmi::EnerLib::Bond::type)
    .property("length",&gemmi::EnerLib::Bond::length)
    .property("value_esd",&gemmi::EnerLib::Bond::value_esd)
    ;

    class_<gemmi::EnerLib>("EnerLib")
    .function("read",&gemmi::EnerLib::read)
    //std::map<std::string, Atom> atoms; // type->Atom TODO
    //std::multimap<std::string, Bond> bonds; // atom_type_1->Bond TODO
    ;

    class_<gemmi::MonLib>("MonLib")
    .property("monomer_dir",&gemmi::MonLib::monomer_dir)
    .property("ener_lib",&gemmi::MonLib::ener_lib)
    /* TODO
  std::map<std::string, ChemComp> monomers;
  std::map<std::string, ChemLink> links;
  std::map<std::string, ChemMod> modifications;
  std::map<std::string, ChemComp::Group> cc_groups;
    */
    .function("add_monomer_if_present",&gemmi::MonLib::add_monomer_if_present)
    .function("path",&gemmi::MonLib::path)
    .class_function("relative_monomer_path",&gemmi::MonLib::relative_monomer_path)
    .function("read_monomer_doc",&gemmi::MonLib::read_monomer_doc)
    //.function("read_monomer_cif",&gemmi::MonLib::read_monomer_cif) TODO
    .function("set_monomer_dir",&gemmi::MonLib::set_monomer_dir)
    .function("find_ideal_distance",&gemmi::MonLib::find_ideal_distance)
    ;

    class_<gemmi::CRA>("CRA")
    ;

    class_<gemmi::const_CRA>("const_CRA")
    ;

    class_<gemmi::Selection::List>("SelectionList")
    .property("all",&gemmi::Selection::List::all)
    .property("inverted",&gemmi::Selection::List::inverted)
    .property("list",&gemmi::Selection::List::list)
    .function("str",&gemmi::Selection::List::str)
    .function("has",&gemmi::Selection::List::has)
    ;

    class_<gemmi::Selection::FlagList>("SelectionFlagList")
    .property("pattern",&gemmi::Selection::FlagList::pattern)
    .function("has",&gemmi::Selection::FlagList::has)
    ;

    class_<gemmi::Selection::SequenceId>("SelectionSequenceId")
    .property("seqnum",&gemmi::Selection::SequenceId::seqnum)
    .property("icode",&gemmi::Selection::SequenceId::icode)
    .function("empty",&gemmi::Selection::SequenceId::empty)
    .function("str",&gemmi::Selection::SequenceId::str)
    .function("compare",&gemmi::Selection::SequenceId::compare)
    ;

    class_<gemmi::Selection::AtomInequality>("SelectionAtomInequality")
    .property("property",&gemmi::Selection::AtomInequality::property)
    .property("relation",&gemmi::Selection::AtomInequality::relation)
    .property("value",&gemmi::Selection::AtomInequality::value)
    .function("matches",&gemmi::Selection::AtomInequality::matches)
    .function("str",&gemmi::Selection::AtomInequality::str)
    ;

    class_<gemmi::Selection>("Selection")
    .constructor<std::string>()
    .property("mdl",&gemmi::Selection::mdl)
    .property("chain_ids",&gemmi::Selection::chain_ids)
    .property("from_seqid",&gemmi::Selection::from_seqid)
    .property("to_seqid",&gemmi::Selection::to_seqid)
    .property("residue_names",&gemmi::Selection::residue_names)
    .property("entity_types",&gemmi::Selection::entity_types)
    //.property("et_flags",&gemmi::Selection::et_flags) // std::array<char, 6>
    .property("atom_names",&gemmi::Selection::atom_names)
    .property("elements",&gemmi::Selection::elements)
    .property("altlocs",&gemmi::Selection::altlocs)
    .property("residue_flags",&gemmi::Selection::residue_flags)
    .property("atom_flags",&gemmi::Selection::atom_flags)
    .property("atom_inequalities",&gemmi::Selection::atom_inequalities)
    .function("str",&gemmi::Selection::str)
    .function("matches_structure",select_overload<bool(const gemmi::Structure&)const>(&gemmi::Selection::matches))
    .function("matches_model",select_overload<bool(const gemmi::Model&)const>(&gemmi::Selection::matches))
    .function("matches_chain",select_overload<bool(const gemmi::Chain&)const>(&gemmi::Selection::matches))
    .function("matches_residue",select_overload<bool(const gemmi::Residue&)const>(&gemmi::Selection::matches))
    .function("matches_atom",select_overload<bool(const gemmi::Atom&)const>(&gemmi::Selection::matches))
    .function("matches_cra",select_overload<bool(const gemmi::CRA&)const>(&gemmi::Selection::matches))
    .function("first_in_model",&gemmi::Selection::first_in_model)
    .function("set_residue_flags",&gemmi::Selection::set_residue_flags)
    .function("set_atom_flags",&gemmi::Selection::set_atom_flags)
    .function("remove_selected_residue",&GemmiSelectionRemoveSelectedResidue)
    .function("remove_not_selected_residue",&GemmiSelectionRemoveNotSelectedResidue)
    //.function("first",&gemmi::Selection::first) // returns pair<Model*, CRA>, not TSD-compatible
    //.function("chains",&gemmi::Selection::chains) // returns FilterProxy, not TSD-compatible
    //.function("models",&gemmi::Selection::models) // returns FilterProxy, not TSD-compatible
    //.function("residues",&gemmi::Selection::residues) // returns FilterProxy, not TSD-compatible
    //.function("atoms",&gemmi::Selection::atoms) // returns FilterProxy, not TSD-compatible
    //I have no ide what is wrong with these 2.
    //.function("remove_not_selected_atom",select_overload<void(gemmi::Atom&)const>(&gemmi::Selection::remove_not_selected))
    //.function("remove_not_selected_residue",select_overload<void(gemmi::Residue&)const>(&gemmi::Selection::remove_not_selected))
    //.function("remove_selected_residue",select_overload<void(gemmi::Residue&)const>(&gemmi::Selection::remove_selected))
    //.function("add_matching_children",select_overload<void(const gemmi::Atom&, gemmi::Atom&)const>(&gemmi::Selection::add_matching_children))
    ;

    class_<gemmi::ResidueInfo>("ResidueInfo")
    .property("kind",&gemmi::ResidueInfo::kind)
    .property("one_letter_code",&gemmi::ResidueInfo::one_letter_code)
    .property("hydrogen_count",&gemmi::ResidueInfo::hydrogen_count)
    .property("weight",&gemmi::ResidueInfo::weight)
    .function("found",&gemmi::ResidueInfo::found)
    .function("is_water",&gemmi::ResidueInfo::is_water)
    .function("is_dna",&gemmi::ResidueInfo::is_dna)
    .function("is_rna",&gemmi::ResidueInfo::is_rna)
    .function("is_nucleic_acid",&gemmi::ResidueInfo::is_nucleic_acid)
    .function("is_amino_acid",&gemmi::ResidueInfo::is_amino_acid)
    .function("is_buffer_or_water",&gemmi::ResidueInfo::is_buffer_or_water)
    .function("is_standard",&gemmi::ResidueInfo::is_standard)
    .function("fasta_code",&gemmi::ResidueInfo::fasta_code)
    ;

    function("find_tabulated_residue",&gemmi::find_tabulated_residue);

}
