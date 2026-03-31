#pragma once

// Shared helper functions and structs for split gemmi wrapper files.
// Extracted from the original monolithic gemmi-wrappers.cc.

#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

#include <complex>
#include <iostream>
#include <string>
#include <vector>

#include <math.h>
#ifndef M_PI
#define M_PI           3.14159265358979323846
#endif

#include <emscripten.h>
#include <emscripten/bind.h>

#include <gemmi/to_cif.hpp>
#include <gemmi/to_mmcif.hpp>
#include <gemmi/to_pdb.hpp>
#include <gemmi/span.hpp>
#include <gemmi/neighbor.hpp>
#include <gemmi/mmread.hpp>
#include <gemmi/gz.hpp>
#include <gemmi/model.hpp>
#include <gemmi/monlib.hpp>
#include <gemmi/polyheur.hpp>
#include <gemmi/select.hpp>
#include <gemmi/small.hpp>
#include <gemmi/asudata.hpp>
#include <gemmi/refln.hpp>
#include <gemmi/cif2mtz.hpp>
#include <gemmi/ccp4.hpp>
#include <gemmi/modify.hpp>
#include <gemmi/assembly.hpp>
#include <gemmi/calculate.hpp>
#include <gemmi/util.hpp>
#include <gemmi/fstream.hpp>
#include <gemmi/resinfo.hpp>
#include <gemmi/cifdoc.hpp>
#include <gemmi/smcif.hpp>

using namespace emscripten;

#define _SAJSON_H_INCLUDED_

using GemmiSMat33double = gemmi::SMat33<double>;
using GemmiSMat33float = gemmi::SMat33<float>;

// --- Free functions ---

inline bool structure_is_ligand(const gemmi::Structure &Structure) {
    bool isLigand = true;
    auto structure_copy = Structure;
    gemmi::remove_ligands_and_waters(structure_copy);
    gemmi::remove_hydrogens(structure_copy);
    structure_copy.remove_empty_chains();
    for (const auto& model : structure_copy.models) {
        if (model.chains.size() > 0) {
            isLigand = false;
        }
    }
    return isLigand;
}

inline std::string get_mmcif_string_from_gemmi_struct(const gemmi::Structure &Structure){
    gemmi::cif::Document doc = gemmi::make_mmcif_document(Structure);
    std::ostringstream oss;
    gemmi::cif::write_cif_to_stream(oss, doc);
    std::string s = oss.str();
    return s;
}

inline std::string get_pdb_string_from_gemmi_struct(const gemmi::Structure &Structure){
    std::ostringstream oss;
    gemmi::write_pdb(Structure, oss);
    std::string s = oss.str();
    return s;
}

inline bool is_small_structure(const std::string &data){
    try {
        auto document = gemmi::cif::read_string(data);
        if(document.blocks.size()==0) return false;
        auto block = document.sole_block();
        gemmi::SmallStructure small = gemmi::make_small_structure_from_block(block);
        if(small.sites.size()>0)
            return true;
    } catch(...) {
        return false;
    }
    return false;
}

inline gemmi::Structure copy_to_assembly_to_new_structure(const gemmi::Structure &s, const std::string &name){
    gemmi::Structure assembly = s;
    gemmi::HowToNameCopiedChain how = gemmi::HowToNameCopiedChain::AddNumber;
    gemmi::Logger logger{&gemmi::Logger::to_stdout,  3};
    gemmi::transform_to_assembly(assembly,name,how,logger);
    return assembly;
}

inline gemmi::cif::Document read_string(const std::string &data){
    gemmi::cif::Document doc = gemmi::cif::read_string(data);
    return doc;
}

inline gemmi::Structure read_structure_from_string(const std::string &data, const std::string& path){
    char *c_data = (char *)data.c_str();
    size_t size = data.length();
    return gemmi::read_structure_from_char_array(c_data,size,path);
}

struct CompoundInfo {
    std::string name;
    std::string three_letter_code;
};

inline std::vector<CompoundInfo> parse_mon_lib_list_cif(const std::string &data) {
    gemmi::cif::Document doc = gemmi::cif::read_string(data);
    gemmi::cif::Block block = doc.blocks[1];
    gemmi::cif::Item item = block.items[0];
    gemmi::cif::Table table = block.item_as_table(item);
    std::vector<CompoundInfo> result;
    for (const auto& row : table) {
        CompoundInfo compound;
        compound.three_letter_code = row.value_at(0);
        compound.name = row.value_at(2);
        result.push_back(std::move(compound));
    }
    return result;
}

struct LigandDictInfo {
    std::string comp_id;
    std::string dict_contents;
};

inline std::vector<LigandDictInfo> parse_ligand_dict_info(const std::string &data) {
    std::vector<LigandDictInfo> result;
    gemmi::cif::Document doc = gemmi::cif::read_string(data);
    for (const auto& block : doc.blocks) {
        if (block.name != "comp_list") {
            LigandDictInfo ligandDict;
            const size_t pos = block.name.find("comp_");
            if (pos != std::string::npos) {
                ligandDict.comp_id = block.name.substr(pos + 5);
            } else {
                ligandDict.comp_id =  block.name;
            }
            std::ostringstream oss;
            gemmi::cif::write_cif_block_to_stream(oss, block);
            ligandDict.dict_contents = oss.str();
            result.push_back(ligandDict);
        }
    }
    return result;
}

inline std::vector<int> get_nearest_image_pbc_shift(const gemmi::NearestImage &ni){
    std::vector<int> ret;
    ret.push_back(ni.pbc_shift[0]);
    ret.push_back(ni.pbc_shift[1]);
    ret.push_back(ni.pbc_shift[2]);
    return ret;
}

inline int count_residues_in_selection(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
    int result = 0;
    for (const auto& model : Structure.models) {
        if (!Selection.matches(model)) continue;
        for (const auto& chain : model.chains) {
            if (!Selection.matches(chain)) continue;
            for (const auto& residue : chain.residues) {
                if (Selection.matches(residue)) result += 1;
            }
        }
    }
    return result;
}

inline gemmi::Structure remove_selected_residues(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
    auto new_structure = Structure;
    for (auto modelIndex = 0; modelIndex < Structure.models.size(); modelIndex++) {
        const auto& model = Structure.models[modelIndex];
        if (!Selection.matches(model)) continue;
        for (auto chainIndex = 0; chainIndex < Structure.models[modelIndex].chains.size(); chainIndex++) {
            const auto& chain = Structure.models[modelIndex].chains[chainIndex];
            if (!Selection.matches(chain)) continue;
            gemmi::vector_remove_if(new_structure.models[modelIndex].chains[chainIndex].residues, [&](const gemmi::Residue& res) { return Selection.matches(res); });
        }
    }
    new_structure.remove_empty_chains();
    return new_structure;
}

inline std::string cifDocument_as_string_with_style(const gemmi::cif::Document &doc, const gemmi::cif::Style &style) {
    std::ostringstream os;
    write_cif_to_stream(os, doc, style);
    return os.str();
}

inline std::string cifDocument_as_string_with_options(const gemmi::cif::Document &doc, const gemmi::cif::WriteOptions &opt) {
    std::ostringstream os;
    write_cif_to_stream(os, doc, opt);
    return os.str();
}

inline std::string cifDocument_as_string(const gemmi::cif::Document &doc) {
    gemmi::cif::WriteOptions opt;
    return cifDocument_as_string_with_options(doc,opt);
}

inline void cifDocument_write_file_with_style(const gemmi::cif::Document &doc, const std::string &filename, const gemmi::cif::Style &style) {
    gemmi::Ofstream os(filename);
    write_cif_to_stream(os.ref(), doc, style);
}

inline void cifDocument_write_file_with_options(const gemmi::cif::Document &doc, const std::string &filename, const gemmi::cif::WriteOptions &opt) {
    gemmi::Ofstream os(filename);
    write_cif_to_stream(os.ref(), doc, opt);
}

inline void cifDocument_write_file(const gemmi::cif::Document &doc, const std::string &filename) {
    gemmi::cif::WriteOptions opt;
    cifDocument_write_file_with_options(doc,filename,opt);
}

inline gemmi::Structure remove_non_selected_atoms(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
    auto new_structure = Structure;
    gemmi::vector_remove_if(new_structure.models, [&](const gemmi::Model& model) { return !Selection.matches(model); });
    for (auto modelIndex = 0; modelIndex < new_structure.models.size(); modelIndex++) {
        gemmi::vector_remove_if(new_structure.models[modelIndex].chains, [&](const gemmi::Chain& chain) { return !Selection.matches(chain); });
        for (auto chainIndex = 0; chainIndex < new_structure.models[modelIndex].chains.size(); chainIndex++) {
            gemmi::vector_remove_if(new_structure.models[modelIndex].chains[chainIndex].residues, [&](const gemmi::Residue& res) { return !Selection.matches(res); });
            for (auto residueIndex = 0; residueIndex < new_structure.models[modelIndex].chains[chainIndex].residues.size(); residueIndex++) {
                gemmi::vector_remove_if(new_structure.models[modelIndex].chains[chainIndex].residues[residueIndex].atoms, [&](const gemmi::Atom& atom) { return !Selection.matches(atom); });
            }
        }
    }
    new_structure.remove_empty_chains();
    return new_structure;
}

inline void set_cif_item_pair(gemmi::cif::Item &item, const gemmi::cif::Pair pair){ item.pair = pair; }
inline void set_cif_item_loop(gemmi::cif::Item &item, const gemmi::cif::Loop &loop){ item.loop = loop; }
inline void set_cif_item_frame(gemmi::cif::Item &item, const gemmi::cif::Block &frame){ item.frame = frame; }
inline gemmi::cif::Pair get_cif_item_pair(const gemmi::cif::Item &item){ return item.pair; }
inline gemmi::cif::Loop get_cif_item_loop(const gemmi::cif::Item &item){ return item.loop; }
inline gemmi::cif::Block get_cif_item_frame(const gemmi::cif::Item &item){ return item.frame; }

inline std::string get_spacegroup_hm(const gemmi::SpaceGroup &sg){ return std::string(sg.hm); }
inline std::string get_spacegroup_hall(const gemmi::SpaceGroup &sg){ return std::string(sg.hall); }
inline std::string get_spacegroup_qualifier(const gemmi::SpaceGroup &sg){ return std::string(sg.qualifier); }
inline std::string get_element_name_as_string(const gemmi::Element &el){ return std::string(el.name()); }
inline std::string get_element_upper_name_as_string(const gemmi::Element &el){ return std::string(el.uname()); }

template<typename T, typename C>
C& add_item(T& container, C child, int pos) {
  if ((size_t) pos > container.size()) pos = (int) container.size();
  return *container.insert(container.begin() + pos, std::move(child));
}

template<typename P, typename C>
C& add_child(P& parent, C child, int pos) {
  return add_item(parent.children(), std::move(child), pos);
}

inline std::map<std::string,std::string> residueCodesThreeToOne = {
    {"ALA","A"},{"ARG","R"},{"ASN","N"},{"ASP","D"},{"CYS","C"},
    {"GLN","Q"},{"GLU","E"},{"GLY","G"},{"HIS","H"},{"ILE","I"},
    {"LEU","L"},{"LYS","K"},{"MET","M"},{"PHE","F"},{"PRO","P"},
    {"SER","S"},{"THR","T"},{"TRP","W"},{"TYR","Y"},{"VAL","V"},{"UNK","X"},
};

inline std::map<std::string,std::string> nucleotideCodesThreeToOne = {
    {"A","A"},{"T","T"},{"G","G"},{"C","C"},{"U","U"},{"N","N"},{"I","I"},
    {"DT","T"},{"DG","G"},{"DC","C"},{"DA","A"},{"DU","U"},
    {"ADE","A"},{"THY","T"},{"GUA","G"},{"CYT","C"},{"URA","U"},{"PSU","U"},
    {"UNKOWN","X"},{"UNK","X"},{"MISSING","-"}
};

inline void cif_parse_string(gemmi::cif::Document& doc, const std::string& data) {
  tao::pegtl::memory_input<> in(data, "string");
  gemmi::cif::parse_input(doc, in);
}

inline int guess_coord_data_format(const std::string &file_contents) {
    char *c_data = (char *)file_contents.c_str();
    size_t size = file_contents.length();
    const char* end = c_data + size;
    gemmi::CoorFormat coor_format = gemmi::coor_format_from_content(c_data, end);
    return int(coor_format);
}

struct SequenceResInfo { int resNum; std::string resCode; std::string cid; };

struct SequenceEntry {
    int type;
    std::string name;
    std::string chain;
    std::vector<SequenceResInfo> sequence;
};

inline std::vector<SequenceEntry> get_sequence_info(const gemmi::Structure &Structure, const std::string &mol_name){
    std::vector<SequenceEntry> sequences;
    auto structure_copy = Structure;
    gemmi::remove_ligands_and_waters(structure_copy);
    structure_copy.remove_empty_chains();
    for (const auto& model : structure_copy.models) {
        for (const auto& chain : model.chains) {
            std::vector<SequenceResInfo> currentSequence;
            const auto polymerType = gemmi::check_polymer_type(chain.get_polymer());
            for (const auto& residue : chain.residues) {
                SequenceResInfo seq_entry;
                seq_entry.resNum = std::stoi(residue.seqid.str());
                seq_entry.cid = "//"+chain.name+"/"+residue.seqid.str()+"("+residue.name+")/";
                if(polymerType==gemmi::PolymerType::Dna||polymerType==gemmi::PolymerType::Rna||polymerType==gemmi::PolymerType::DnaRnaHybrid){
                    seq_entry.resCode = nucleotideCodesThreeToOne[residue.name];
                } else {
                    seq_entry.resCode = residueCodesThreeToOne[residue.name];
                }
                currentSequence.push_back(std::move(seq_entry));
            }
            if (currentSequence.size() > 0) {
                SequenceEntry seq_entry;
                seq_entry.name = mol_name + "_" + chain.name;
                seq_entry.chain = chain.name;
                seq_entry.sequence = currentSequence;
                seq_entry.type = int(polymerType);
                sequences.push_back(std::move(seq_entry));
            }
        }
    }
    return sequences;
}

struct ResidueBFactorInfo { std::string cid; float normalised_bFactor; float bFactor; };
struct LigandInfo { std::string resName; std::string chainName; std::string resNum; std::string modelName; std::string cid; };

struct AtomInfo {
    double x; double y; double z;
    float charge; std::string element; std::string symbol;
    float tempFactor; float occupancy; int serial; std::string name;
    bool has_altloc; std::string alt_loc;
    std::string mol_name; std::string chain_id; std::string res_no; std::string res_name; std::string label;
};

inline bool selection_vector_matches_model(const std::vector<gemmi::Selection> &v, const gemmi::Model &m) { for (const auto& s:v) if(s.matches(m)) return true; return false; }
inline bool selection_vector_matches_chain(const std::vector<gemmi::Selection> &v, const gemmi::Chain &c) { for (const auto& s:v) if(s.matches(c)) return true; return false; }
inline bool selection_vector_matches_residue(const std::vector<gemmi::Selection> &v, const gemmi::Residue &r) { for (const auto& s:v) if(s.matches(r)) return true; return false; }
inline bool selection_vector_matches_atom(const std::vector<gemmi::Selection> &v, const gemmi::Atom &a) { for (const auto& s:v) if(s.matches(a)) return true; return false; }

inline std::vector<gemmi::Selection> parse_multi_cid_selections(const std::string &cids) {
    std::vector<gemmi::Selection> selections_vec;
    if (!cids.empty()) {
        std::istringstream stream(cids);
        std::string token;
        while (std::getline(stream, token, '|')) {
            if (!token.empty()) selections_vec.push_back(gemmi::Selection(token));
        }
    }
    return selections_vec;
}

inline std::vector<std::pair<int, int>> get_consecutive_ranges_gemmi(const std::vector<int> &numbers) {
    std::vector<int> numbers_vec = numbers;
    std::sort(numbers_vec.begin(), numbers_vec.end());
    std::vector<std::pair<int, int>> ranges;
    if (!numbers_vec.empty()) {
        int start = numbers_vec[0], end = numbers_vec[0];
        for (int i = 1; i < (int)numbers_vec.size(); i++) {
            if (numbers_vec[i] == end + 1) { end = numbers_vec[i]; }
            else { ranges.push_back({start, end}); start = numbers_vec[i]; end = numbers_vec[i]; }
        }
        ranges.push_back({start, end});
    }
    return ranges;
}

inline std::vector<std::string> get_non_selected_cids(const gemmi::Structure &Structure, const std::string &cids) {
    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);
    std::vector<std::string> result;
    auto structure_copy = Structure;
    for (const auto& selection : selections_vec) structure_copy = remove_selected_residues(structure_copy, selection);
    for (const auto& model : structure_copy.models) {
        if (!selection_vector_matches_model(selections_vec, model)) { result.push_back("/" + std::to_string(model.num) + "//"); continue; }
        for (const auto& chain : model.chains) {
            if (!selection_vector_matches_chain(selections_vec, chain)) { result.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/"); continue; }
            std::vector<int> resNums;
            for (const auto& residue : chain.residues) resNums.push_back(*residue.seqid.num);
            if (resNums.size() > 0) {
                auto residue_ranges = get_consecutive_ranges_gemmi(resNums);
                for (const auto& r : residue_ranges) result.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/" + std::to_string(r.first) + "-" + std::to_string(r.second));
            }
        }
    }
    return result;
}

inline std::vector<ResidueBFactorInfo> get_structure_bfactors(const gemmi::Structure &Structure) {
    std::vector<float> bfactor_vec;
    std::vector<std::string> cid_vec;
    for (const auto& model : Structure.models)
        for (const auto& chain : model.chains)
            for (const auto& residue : chain.residues) {
                cid_vec.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/" + residue.seqid.str() +"(" + residue.name + ")/*");
                float bFactor = 0.0;
                for (const auto& atom : residue.atoms) bFactor += atom.b_iso;
                bFactor /= residue.atoms.size();
                bfactor_vec.push_back(bFactor);
            }
    auto minMax = std::minmax_element(bfactor_vec.begin(), bfactor_vec.end());
    float minBFactor = *minMax.first, maxBFactor = *minMax.second, range = maxBFactor - minBFactor;
    std::vector<ResidueBFactorInfo> res_bfactor_info_vec;
    for (int i = 0; i < (int)bfactor_vec.size(); i++) {
        ResidueBFactorInfo info;
        info.cid = cid_vec[i]; info.bFactor = bfactor_vec[i];
        info.normalised_bFactor = 100.0f * ((bfactor_vec[i] - minBFactor) / range);
        res_bfactor_info_vec.push_back(info);
    }
    return res_bfactor_info_vec;
}

inline std::vector<LigandInfo> get_ligand_info_for_structure(const gemmi::Structure &Structure) {
    std::vector<LigandInfo> ligand_info_vec;
    for (const auto& model : Structure.models)
        for (const auto& chain : model.chains) {
            const auto ligands = chain.get_ligands();
            for (const auto& ligand : ligands) {
                LigandInfo info;
                info.resName = ligand.name; info.resNum = ligand.seqid.str();
                info.cid = "/" + std::to_string(model.num) + "/" + chain.name + "/" + ligand.seqid.str() + "(" + ligand.name + ")";
                info.chainName = chain.name; info.modelName = std::to_string(model.num);
                ligand_info_vec.push_back(info);
            }
        }
    return ligand_info_vec;
}

inline std::vector<std::string> parse_multi_cids(const gemmi::Structure &Structure, const std::string &cids) {
    std::vector<std::string> result;
    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);
    auto structure_copy = Structure;
    gemmi::remove_ligands_and_waters(structure_copy);
    structure_copy.remove_empty_chains();
    const auto& model = structure_copy.first_model();
    for (const auto& selection : selections_vec) {
        std::vector<std::string> chain_id_vec;
        if (selection.chain_ids.all) { for (const auto& chain : model.chains) chain_id_vec.push_back(chain.name); }
        else { chain_id_vec.push_back(selection.chain_ids.str()); }
        for (auto chainIndex = 0; chainIndex < chain_id_vec.size(); chainIndex++) {
            if (!selection.from_seqid.empty()) {
                if (selection.to_seqid.empty()) { result.push_back("/" + std::to_string(model.num) + "/" + chain_id_vec[chainIndex] + "/" + selection.from_seqid.str() + "/*"); }
                else { for (auto resNum = selection.from_seqid.seqnum; resNum <= selection.to_seqid.seqnum; resNum++) result.push_back("/" + std::to_string(model.num) + "/" + chain_id_vec[chainIndex] + "/" + std::to_string(resNum) + "/*"); }
            } else {
                const auto chain = model.find_chain(chain_id_vec[chainIndex]);
                for (int ri = 0; ri < (int)chain->residues.size(); ri++) result.push_back("/" + std::to_string(model.num) + "/" + chain->name + "/" + chain->residues[ri].seqid.str() + "/*");
            }
        }
    }
    return result;
}

inline std::vector<AtomInfo> get_atom_info_for_selection(const gemmi::Structure &Structure, const std::string &cids, const std::string &excluded_cids) {
    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);
    std::vector<gemmi::Selection> excluded_selections_vec = parse_multi_cid_selections(excluded_cids);
    std::vector<AtomInfo> atom_info_vec;
    auto _structure = Structure;
    for (const auto& selection : excluded_selections_vec) _structure = remove_selected_residues(_structure, selection);
    for (const auto& selection : selections_vec) {
        auto structure_copy = remove_non_selected_atoms(_structure, selection);
        for (const auto& model : structure_copy.models)
            for (const auto& chain : model.chains)
                for (const auto& residue : chain.residues)
                    for (const auto& atom : residue.atoms) {
                        AtomInfo info;
                        info.x=atom.pos.x; info.y=atom.pos.y; info.z=atom.pos.z;
                        info.charge=atom.charge; info.element=get_element_name_as_string(atom.element);
                        info.tempFactor=atom.b_iso; info.serial=atom.serial; info.name=atom.name;
                        info.occupancy=atom.occ; info.has_altloc=atom.has_altloc();
                        info.mol_name=std::to_string(model.num); info.chain_id=chain.name;
                        info.res_no=residue.seqid.str(); info.res_name=residue.name;
                        if (atom.has_altloc()) { std::string altloc_str(1, atom.altloc); info.alt_loc = altloc_str; }
                        atom_info_vec.push_back(std::move(info));
                    }
    }
    return atom_info_vec;
}

inline void GemmiSelectionRemoveSelectedResidue(gemmi::Selection &s, gemmi::Residue &r){ s.remove_selected(r); }
inline void GemmiSelectionRemoveNotSelectedResidue(gemmi::Selection &s, gemmi::Residue &r){ s.remove_not_selected(r); }

inline std::array<double, 9> Mat33ToDoubleArray(const gemmi::Mat33 &mat){
    return {mat[0][0],mat[0][1],mat[0][2],mat[1][0],mat[1][1],mat[1][2],mat[2][0],mat[2][1],mat[2][2]};
}

// JS-friendly wrappers for methods that use pointer-to-member or return unbindable types

// Metadata::has() wrappers — replace pointer-to-member with string-based dispatch
inline bool metadata_has_double_field(const gemmi::Metadata& meta, const std::string& field) {
    for (const auto& ref : meta.refinement) {
        if (field == "resolution_high" && !std::isnan(ref.resolution_high)) return true;
        if (field == "resolution_low" && !std::isnan(ref.resolution_low)) return true;
        if (field == "completeness" && !std::isnan(ref.completeness)) return true;
        if (field == "r_all" && !std::isnan(ref.r_all)) return true;
        if (field == "r_work" && !std::isnan(ref.r_work)) return true;
        if (field == "r_free" && !std::isnan(ref.r_free)) return true;
        if (field == "cc_fo_fc_work" && !std::isnan(ref.cc_fo_fc_work)) return true;
        if (field == "cc_fo_fc_free" && !std::isnan(ref.cc_fo_fc_free)) return true;
        if (field == "mean_b" && !std::isnan(ref.mean_b)) return true;
        if (field == "luzzati_error" && !std::isnan(ref.luzzati_error)) return true;
        if (field == "dpi_blow_r" && !std::isnan(ref.dpi_blow_r)) return true;
        if (field == "dpi_blow_rfree" && !std::isnan(ref.dpi_blow_rfree)) return true;
        if (field == "dpi_cruickshank_r" && !std::isnan(ref.dpi_cruickshank_r)) return true;
        if (field == "dpi_cruickshank_rfree" && !std::isnan(ref.dpi_cruickshank_rfree)) return true;
    }
    return false;
}

inline bool metadata_has_int_field(const gemmi::Metadata& meta, const std::string& field) {
    for (const auto& ref : meta.refinement) {
        if (field == "reflection_count" && ref.reflection_count != 0) return true;
        if (field == "rfree_set_count" && ref.rfree_set_count != 0) return true;
        if (field == "bin_count" && ref.bin_count != 0) return true;
    }
    return false;
}

inline bool metadata_has_string_field(const gemmi::Metadata& meta, const std::string& field) {
    for (const auto& ref : meta.refinement) {
        if (field == "id" && !ref.id.empty()) return true;
        if (field == "cross_validation_method" && !ref.cross_validation_method.empty()) return true;
        if (field == "rfree_selection_method" && !ref.rfree_selection_method.empty()) return true;
    }
    return false;
}

// Selection filter wrappers — return vectors instead of FilterProxy iterators
inline std::vector<gemmi::Model> selection_get_models(const gemmi::Selection& sel, gemmi::Structure& st) {
    std::vector<gemmi::Model> result;
    for (auto& model : st.models)
        if (sel.matches(model))
            result.push_back(model);
    return result;
}

inline std::vector<gemmi::Chain> selection_get_chains(const gemmi::Selection& sel, gemmi::Model& model) {
    std::vector<gemmi::Chain> result;
    for (auto& chain : model.chains)
        if (sel.matches(chain))
            result.push_back(chain);
    return result;
}

inline std::vector<gemmi::Residue> selection_get_residues(const gemmi::Selection& sel, gemmi::Chain& chain) {
    std::vector<gemmi::Residue> result;
    for (auto& res : chain.residues)
        if (sel.matches(res))
            result.push_back(res);
    return result;
}

inline std::vector<gemmi::Atom> selection_get_atoms(const gemmi::Selection& sel, gemmi::Residue& res) {
    std::vector<gemmi::Atom> result;
    for (auto& atom : res.atoms)
        if (sel.matches(atom))
            result.push_back(atom);
    return result;
}
