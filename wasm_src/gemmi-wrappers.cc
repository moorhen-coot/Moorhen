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

// Gemmi stuff
using GemmiSMat33double = gemmi::SMat33<double>;
using GemmiSMat33float = gemmi::SMat33<float>;

bool structure_is_ligand(const gemmi::Structure &Structure) {
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

std::string get_mmcif_string_from_gemmi_struct(const gemmi::Structure &Structure){
    gemmi::cif::Document doc = gemmi::make_mmcif_document(Structure);
    std::ostringstream oss;
    gemmi::cif::write_cif_to_stream(oss, doc);
    std::string s = oss.str();
    return s;
}

std::string get_pdb_string_from_gemmi_struct(const gemmi::Structure &Structure){
    std::ostringstream oss;
    gemmi::write_pdb(Structure, oss);
    std::string s = oss.str();
    return s;
}

bool is_small_structure(const std::string &data){
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

gemmi::Structure copy_to_assembly_to_new_structure(const gemmi::Structure &s, const std::string &name){
    gemmi::Structure assembly = s;
    gemmi::HowToNameCopiedChain how = gemmi::HowToNameCopiedChain::AddNumber;
    gemmi::Logger logger{&gemmi::Logger::to_stdout,  3};
    gemmi::transform_to_assembly(assembly,name,how,logger);
    return assembly;
}

gemmi::cif::Document read_string(const std::string &data){
    gemmi::cif::Document doc = gemmi::cif::read_string(data);
    return doc;
}

gemmi::Structure read_structure_from_string(const std::string &data, const std::string& path){
    char *c_data = (char *)data.c_str();
    size_t size = data.length();
    return gemmi::read_structure_from_char_array(c_data,size,path);
}

struct CompoundInfo {
    std::string name;
    std::string three_letter_code;
};

std::vector<CompoundInfo> parse_mon_lib_list_cif(const std::string &data) {
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

std::vector<LigandDictInfo> parse_ligand_dict_info(const std::string &data) {
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

std::vector<int> get_nearest_image_pbc_shift(const gemmi::NearestImage &ni){
    std::vector<int> ret;
    ret.push_back(ni.pbc_shift[0]);
    ret.push_back(ni.pbc_shift[1]);
    ret.push_back(ni.pbc_shift[2]);
    return ret;
}

int count_residues_in_selection(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
    int result = 0;
    for (const auto& model : Structure.models) {
        if (!Selection.matches(model)) {
            continue;
        }
        for (const auto& chain : model.chains) {
            if (!Selection.matches(chain)) {
                continue;
            }
            for (const auto& residue : chain.residues) {
                if (Selection.matches(residue)) {
                    result += 1;
                }
            }
        }
    }
    return result;
}

gemmi::Structure remove_selected_residues(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
    auto new_structure = Structure;

    for (auto modelIndex = 0; modelIndex < Structure.models.size(); modelIndex++) {
        const auto& model = Structure.models[modelIndex];
        if (!Selection.matches(model)) {
            continue;
        }
        for (auto chainIndex = 0; chainIndex < Structure.models[modelIndex].chains.size(); chainIndex++) {
            const auto& chain = Structure.models[modelIndex].chains[chainIndex];
            if (!Selection.matches(chain)) {
                continue;
            }
            gemmi::vector_remove_if(new_structure.models[modelIndex].chains[chainIndex].residues, [&](const gemmi::Residue& res) { return Selection.matches(res); });
        }
    }

    new_structure.remove_empty_chains();

    return new_structure;
}

std::string cifDocument_as_string_with_style(const gemmi::cif::Document &doc, const gemmi::cif::Style &style) {
        std::ostringstream os;
        write_cif_to_stream(os, doc, style);
        return os.str();
}

std::string cifDocument_as_string_with_options(const gemmi::cif::Document &doc, const gemmi::cif::WriteOptions &opt) {
        std::ostringstream os;
        write_cif_to_stream(os, doc, opt);
        return os.str();
}

std::string cifDocument_as_string(const gemmi::cif::Document &doc) {
        gemmi::cif::WriteOptions opt;
        return cifDocument_as_string_with_options(doc,opt);
}

void cifDocument_write_file_with_style(const gemmi::cif::Document &doc, const std::string &filename, const gemmi::cif::Style &style) {
        gemmi::Ofstream os(filename);
        write_cif_to_stream(os.ref(), doc, style);
}

void cifDocument_write_file_with_options(const gemmi::cif::Document &doc, const std::string &filename, const gemmi::cif::WriteOptions &opt) {
        gemmi::Ofstream os(filename);
        write_cif_to_stream(os.ref(), doc, opt);
}

void cifDocument_write_file(const gemmi::cif::Document &doc, const std::string &filename) {
        gemmi::cif::WriteOptions opt;
        cifDocument_write_file_with_options(doc,filename,opt);
}

gemmi::Structure remove_non_selected_atoms(const gemmi::Structure &Structure, const gemmi::Selection &Selection) {
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

void set_cif_item_pair(gemmi::cif::Item &item, const gemmi::cif::Pair pair){
    item.pair = pair;
}

void set_cif_item_loop(gemmi::cif::Item &item, const gemmi::cif::Loop &loop){
    item.loop = loop;
}

void set_cif_item_frame(gemmi::cif::Item &item, const gemmi::cif::Block &frame){
    item.frame = frame;
}

gemmi::cif::Pair get_cif_item_pair(const gemmi::cif::Item &item){
    return item.pair;
}

gemmi::cif::Loop get_cif_item_loop(const gemmi::cif::Item &item){
    return item.loop;
}

gemmi::cif::Block get_cif_item_frame(const gemmi::cif::Item &item){
    return item.frame;
}

std::string get_spacegroup_hm(const gemmi::SpaceGroup &sg){
    return std::string(sg.hm);
}
std::string get_spacegroup_hall(const gemmi::SpaceGroup &sg){
    return std::string(sg.hall);
}
std::string get_spacegroup_qualifier(const gemmi::SpaceGroup &sg){
    return std::string(sg.qualifier);
}
std::string get_element_name_as_string(const gemmi::Element &el){
    return std::string(el.name());
}
std::string get_element_upper_name_as_string(const gemmi::Element &el){
    return std::string(el.uname());
}

template<typename T, typename C>
C& add_item(T& container, C child, int pos) {
  if ((size_t) pos > container.size()) // true also for negative pos
    pos = (int) container.size();
  return *container.insert(container.begin() + pos, std::move(child));
}

template<typename P, typename C>
C& add_child(P& parent, C child, int pos) {
  return add_item(parent.children(), std::move(child), pos);
}

std::map<std::string,std::string> residueCodesThreeToOne = {
        {"ALA","A"},
        {"ARG","R"},
        {"ASN","N"},
        {"ASP","D"},
        {"CYS","C"},
        {"GLN","Q"},
        {"GLU","E"},
        {"GLY","G"},
        {"HIS","H"},
        {"ILE","I"},
        {"LEU","L"},
        {"LYS","K"},
        {"MET","M"},
        {"PHE","F"},
        {"PRO","P"},
        {"SER","S"},
        {"THR","T"},
        {"TRP","W"},
        {"TYR","Y"},
        {"VAL","V"},
        {"UNK","X"},
};

std::map<std::string,std::string> nucleotideCodesThreeToOne = {
    {"A", "A"},
    {"T", "T"},
    {"G", "G"},
    {"C", "C"},
    {"U", "U"},
    {"N", "N"},
    {"I", "I"},
    {"DT", "T"},
    {"DG", "G"},
    {"DC", "C"},
    {"DA", "A"},
    {"DU", "U"},
    {"ADE", "A"},
    {"THY", "T"},
    {"GUA", "G"},
    {"CYT", "C"},
    {"URA", "U"},
    {"PSU", "U"},
    {"UNKOWN", "X"},
    {"UNK", "X"},
    {"MISSING", "-"}
};

void cif_parse_string(gemmi::cif::Document& doc, const std::string& data) {
  tao::pegtl::memory_input<> in(data, "string");
  gemmi::cif::parse_input(doc, in);
}

int guess_coord_data_format(const std::string &file_contents) {
    char *c_data = (char *)file_contents.c_str();
    size_t size = file_contents.length();
    const char* end = c_data + size;
    gemmi::CoorFormat coor_format = gemmi::coor_format_from_content(c_data, end);
    return int(coor_format);
}

struct SequenceResInfo {
    int resNum;
    std::string resCode;
    std::string cid;
};

struct SequenceEntry {
    int type;
    std::string name;
    std::string chain;
    std::vector<SequenceResInfo> sequence;
};

std::vector<SequenceEntry> get_sequence_info(const gemmi::Structure &Structure, const std::string &mol_name){

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
                if(polymerType==gemmi::PolymerType::Dna||polymerType==gemmi::PolymerType::Rna||polymerType==gemmi::PolymerType::DnaRnaHybrid){ // More than just nucleic and peptide ...
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

struct ResidueBFactorInfo {
    std::string cid;
    float normalised_bFactor;
    float bFactor;
};

struct LigandInfo {
    std::string resName;
    std::string chainName;
    std::string resNum;
    std::string modelName;
    std::string cid;
};

struct AtomInfo {
    double x;
    double y;
    double z;
    float charge;
    std::string element;
    std::string symbol;
    float tempFactor;
    float occupancy;
    int serial;
    std::string name;
    bool has_altloc;
    std::string alt_loc;
    std::string mol_name;
    std::string chain_id;
    std::string res_no;
    std::string res_name;
    std::string label;
};

bool selection_vector_matches_model(const std::vector<gemmi::Selection> &selections_vec, const gemmi::Model &model) {
    bool is_match = false;
    for (const auto& selection : selections_vec) {
        if (selection.matches(model)) {
            is_match = true;
            break;
        }
    }
    return is_match;
}

bool selection_vector_matches_chain(const std::vector<gemmi::Selection> &selections_vec, const gemmi::Chain &chain) {
    bool is_match = false;
    for (const auto& selection : selections_vec) {
        if (selection.matches(chain)) {
            is_match = true;
            break;
        }
    }
    return is_match;
}

bool selection_vector_matches_residue(const std::vector<gemmi::Selection> &selections_vec, const gemmi::Residue &residue) {
    bool is_match = false;
    for (const auto& selection : selections_vec) {
        if (selection.matches(residue)) {
            is_match = true;
            break;
        }
    }
    return is_match;
}

bool selection_vector_matches_atom(const std::vector<gemmi::Selection> &selections_vec, const gemmi::Atom &atom) {
    bool is_match = false;
    for (const auto& selection : selections_vec) {
        if (selection.matches(atom)) {
            is_match = true;
            break;
        }
    }
    return is_match;
}

std::vector<gemmi::Selection> parse_multi_cid_selections(const std::string &cids) {
    std::vector<gemmi::Selection> selections_vec;
    if (!cids.empty()) {
        std::istringstream stream(cids);
        std::string token;
        while (std::getline(stream, token, '|')) {
            if (!token.empty()) {
                gemmi::Selection sele(token);
                selections_vec.push_back(sele);
            }
        }
    }
    return selections_vec;
}

std::vector<std::pair<int, int>> get_consecutive_ranges_gemmi(const std::vector<int> &numbers) {
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

std::vector<std::string> get_non_selected_cids(const gemmi::Structure &Structure, const std::string &cids) {
    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);
    std::vector<std::string> result;

    auto structure_copy = Structure;
    for (const auto& selection : selections_vec) {
        structure_copy = remove_selected_residues(structure_copy, selection);
    }

    for (const auto& model : structure_copy.models) {
        if (!selection_vector_matches_model(selections_vec, model)) {
            result.push_back("/" + std::to_string(model.num) + "//");
            continue;
        }
        for (const auto& chain : model.chains) {
            if (!selection_vector_matches_chain(selections_vec, chain)) {
                result.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/");
                continue;
            }
            std::vector<int> resNums;
            for (const auto& residue : chain.residues) {
                resNums.push_back(*residue.seqid.num);
            }
            if (resNums.size() > 0) {
                auto residue_ranges = get_consecutive_ranges_gemmi(resNums);
                for (const auto& i_residue_range : residue_ranges) {
                    result.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/" + std::to_string(i_residue_range.first) + "-" + std::to_string(i_residue_range.second));
                }
            }
        }
    }

    return result;
}

std::vector<ResidueBFactorInfo> get_structure_bfactors(const gemmi::Structure &Structure) {
    std::vector<float> bfactor_vec;
    std::vector<std::string> cid_vec;
    for (const auto& model : Structure.models) {
        for (const auto& chain : model.chains) {
            for (const auto& residue : chain.residues) {
                cid_vec.push_back("/" + std::to_string(model.num) + "/" + chain.name + "/" + residue.seqid.str() +"(" + residue.name + ")/*");
                float bFactor = 0.0;
                for (const auto& atom : residue.atoms) {
                    bFactor += atom.b_iso;
                }
                bFactor /= residue.atoms.size();
                bfactor_vec.push_back(bFactor);
            }
        }
    }

    auto minMax = std::minmax_element(bfactor_vec.begin(), bfactor_vec.end());
    float minBFactor = *minMax.first;
    float maxBFactor = *minMax.second;
    float range = maxBFactor - minBFactor;

    std::vector<ResidueBFactorInfo> res_bfactor_info_vec;
    for (int i = 0; i < bfactor_vec.size(); i++) {
        ResidueBFactorInfo res_bfactor_info;
        res_bfactor_info.cid = cid_vec[i];
        res_bfactor_info.bFactor = bfactor_vec[i];
        res_bfactor_info.normalised_bFactor = 100.0f * ( (bfactor_vec[i] - minBFactor) / (range) );
        res_bfactor_info_vec.push_back(res_bfactor_info);
    }

    return res_bfactor_info_vec;
}

std::vector<LigandInfo> get_ligand_info_for_structure(const gemmi::Structure &Structure) {
    std::vector<LigandInfo> ligand_info_vec;
    for (const auto& model : Structure.models) {
        for (const auto& chain : model.chains) {
            const auto ligands = chain.get_ligands();
            for (const auto& ligand : ligands) {
                LigandInfo ligand_info;
                ligand_info.resName = ligand.name;
                ligand_info.resNum = ligand.seqid.str();
                ligand_info.cid = "/" + std::to_string(model.num) + "/" + chain.name + "/" + ligand.seqid.str() + "(" + ligand.name + ")";
                ligand_info.chainName = chain.name;
                ligand_info.modelName = std::to_string(model.num);
                ligand_info_vec.push_back(ligand_info);
            }
        }
    }
    return ligand_info_vec;
}

std::vector<std::string> parse_multi_cids(const gemmi::Structure &Structure, const std::string &cids) {
    std::vector<std::string> result;
    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);

    auto structure_copy = Structure;
    gemmi::remove_ligands_and_waters(structure_copy);
    structure_copy.remove_empty_chains();
    const auto& model = structure_copy.first_model();

    for (const auto& selection : selections_vec) {

        std::vector<std::string> chain_id_vec;
        if (selection.chain_ids.all) {
            for (const auto& chain : model.chains) {
                chain_id_vec.push_back(chain.name);
            }
        } else {
            chain_id_vec.push_back(selection.chain_ids.str());
        }

        for (auto chainIndex = 0; chainIndex < chain_id_vec.size(); chainIndex++) {
            if (!selection.from_seqid.empty()) {
                if (selection.to_seqid.empty()) {
                    result.push_back("/" + std::to_string(model.num) + "/" + chain_id_vec[chainIndex] + "/" + selection.from_seqid.str() + "/*");
                } else {
                    for (auto resNum = selection.from_seqid.seqnum; resNum <= selection.to_seqid.seqnum; resNum++) {
                        result.push_back("/" + std::to_string(model.num) + "/" + chain_id_vec[chainIndex] + "/" + std::to_string(resNum) + "/*");
                    }
                }
            } else {
                const auto chain = model.find_chain(chain_id_vec[chainIndex]);
                const auto& residues = chain->residues;
                for (int residueIndex = 0; residueIndex < residues.size(); residueIndex++) {
                    const auto residue = residues[residueIndex];
                    result.push_back("/" + std::to_string(model.num) + "/" + chain->name + "/" + residue.seqid.str() + "/*");
                }
            }
        }
    }

    return result;
}

// cids and excluded_cids are strings of CID selections separated with ||
std::vector<AtomInfo> get_atom_info_for_selection(const gemmi::Structure &Structure, const std::string &cids, const std::string &excluded_cids) {

    std::vector<gemmi::Selection> selections_vec = parse_multi_cid_selections(cids);
    std::vector<gemmi::Selection> excluded_selections_vec = parse_multi_cid_selections(excluded_cids);
std::vector<AtomInfo> atom_info_vec;

    auto _structure = Structure;
    for (const auto& selection : excluded_selections_vec) {
        _structure = remove_selected_residues(_structure, selection);
    }

    for (const auto& selection : selections_vec) {
        auto structure_copy = remove_non_selected_atoms(_structure, selection);
        for (const auto& model : structure_copy.models) {
            for (const auto& chain : model.chains) {
                for (const auto& residue : chain.residues) {
                    for (const auto& atom : residue.atoms) {
                        AtomInfo atom_info;
                        atom_info.x = atom.pos.x;
                        atom_info.y = atom.pos.y;
                        atom_info.z = atom.pos.z;
                        atom_info.charge = atom.charge;
                        atom_info.element = get_element_name_as_string(atom.element);
                        atom_info.tempFactor = atom.b_iso;
                        atom_info.serial = atom.serial;
                        atom_info.name = atom.name;
                        atom_info.occupancy = atom.occ;
                        atom_info.has_altloc = atom.has_altloc();
                        atom_info.mol_name = std::to_string(model.num);
                        atom_info.chain_id = chain.name;
                        atom_info.res_no = residue.seqid.str();
                        atom_info.res_name = residue.name;
                        if (atom.has_altloc()) {
                            std::string altloc_str(1, atom.altloc);
                            atom_info.alt_loc = altloc_str;
                        }
                        atom_info_vec.push_back(std::move(atom_info));
                    }
                }
            }
        }
    }
    return atom_info_vec;
}

void GemmiSelectionRemoveSelectedResidue(gemmi::Selection &s, gemmi::Residue &r){
    s.remove_selected(r);
}

void GemmiSelectionRemoveNotSelectedResidue(gemmi::Selection &s, gemmi::Residue &r){
    s.remove_not_selected(r);
}

std::array<double, 9> Mat33ToDoubleArray(const gemmi::Mat33 &mat){
    std::array<double, 9> retval;
    retval[0] = mat[0][0];
    retval[1] = mat[0][1];
    retval[2] = mat[0][2];
    retval[3] = mat[1][0];
    retval[4] = mat[1][1];
    retval[5] = mat[1][2];
    retval[6] = mat[2][0];
    retval[7] = mat[2][1];
    retval[8] = mat[2][2];
    return retval;
}

EMSCRIPTEN_BINDINGS(gemmi_module) {
    //complex could be generally useful, but only used by gemmi at present?
    class_<std::complex<double>>("complexdouble")
    .constructor<double, double>()
    .constructor<const std::complex<float>&>()
    //.constructor<const std::complex<double>&>()
    //.constructor<const std::complex<long double>&>()
    .function("real",select_overload<double(void)const>(&std::complex<double>::real))
    .function("imag",select_overload<double(void)const>(&std::complex<double>::imag))
    ;

    class_<std::complex<long double>>("complexlongdouble")
    .constructor<long double, long double>()
    .constructor<const std::complex<float>&>()
    //.constructor<const std::complex<double>&>()
    //.constructor<const std::complex<long double>&>()
    .function("real",select_overload<long double(void)const>(&std::complex<long double>::real))
    .function("imag",select_overload<long double(void)const>(&std::complex<long double>::imag))
    ;

    //Gemmi from here
    register_vector<gemmi::Selection>("VectorGemmiSelection");
    register_vector<gemmi::GridOp>("VectorGemmiGridOp");
    //register_vector<gemmi::NeighborSearch::Mark*>("VectorGemmiNeighborSearchMark");
    register_vector<gemmi::Mtz::Dataset>("VectorGemmiMtzDataset");
    register_vector<gemmi::Mtz::Column>("VectorGemmiMtzColumn");
    register_vector<gemmi::Mtz::Batch>("VectorGemmiMtzBatch");
    //register_vector<gemmi::ReflnBlock>("VectorGemmiReflnBlock"); //Causes compiler problems ...
    register_vector<gemmi::HklValue<std::complex<float>>>("VectorGemmiHklValueComplexFloat");
    register_vector<gemmi::SmallStructure::Site>("VectorGemmiSmallStructureSite");
    register_vector<gemmi::SmallStructure::AtomType>("VectorGemmiSmallStructureAtomType");
    register_vector<gemmi::Selection::AtomInequality>("VectorGemmiSelectionAtomInequality");
    register_vector<gemmi::ChemComp::Aliasing>("VectorGemmiChemCompAliasing");
    register_vector<gemmi::ChemMod::AtomMod>("VectorGemmiChemModAtomMod");
    register_vector<gemmi::cif::Item>("VectorGemmiCifItem");
    register_vector<gemmi::cif::Block>("VectorGemmiCifBlock");
    register_vector<gemmi::Restraints::Bond>("VectorGemmiRestraintsBond");
    register_vector<gemmi::Restraints::Angle>("VectorGemmiRestraintsAngle");
    register_vector<gemmi::Restraints::Torsion>("VectorGemmiRestraintsTorsion");
    register_vector<gemmi::Restraints::Chirality>("VectorGemmiRestraintsChirality");
    register_vector<gemmi::Restraints::Plane>("VectorGemmiRestraintsPlane");
    register_vector<gemmi::Restraints::AtomId>("VectorGemmiRestraintsAtomId");
    register_vector<gemmi::TlsGroup::Selection>("VectorGemmiTlsGroupSelection");
    register_vector<gemmi::TlsGroup>("VectorGemmiTlsGroup");
    register_vector<gemmi::RefinementInfo::Restr>("VectorGemmiRefinementInfoRestr");
    register_vector<gemmi::DiffractionInfo>("VectorGemmiDiffractionInfo");
    register_vector<gemmi::ReflectionsInfo>("VectorGemmiReflectionsInfo");
    register_vector<gemmi::BasicRefinementInfo>("VectorGemmiBasicRefinementInfo");
    register_vector<gemmi::ExperimentInfo>("VectorGemmiExperimentInfo");
    register_vector<gemmi::CrystalInfo>("VectorGemmiCrystalInfo");
    register_vector<gemmi::RefinementInfo>("VectorGemmiRefinementInfo");
    register_vector<gemmi::SoftwareItem>("VectorGemmiSoftwareItem");
    register_vector<gemmi::Assembly::Gen>("VectorGemmiAssemblyGen");
    register_vector<gemmi::Sheet::Strand>("VectorGemmiSheetStrand");
    register_vector<gemmi::Entity::DbRef>("VectorGemmiEntityDbRef");
    register_vector<gemmi::Atom>("VectorGemmiAtom");
    register_vector<gemmi::Model>("VectorGemmiModel");
    register_vector<gemmi::Op>("VectorGemmiOp");
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

    enum_<gemmi::cif::Style>("CifStyle")
        .value("Simple", gemmi::cif::Style::Simple)
        .value("NoBlankLines", gemmi::cif::Style::NoBlankLines)
        .value("PreferPairs", gemmi::cif::Style::PreferPairs)
        .value("Pdbx", gemmi::cif::Style::Pdbx)
        .value("Indent35", gemmi::cif::Style::Indent35)
        .value("Aligned", gemmi::cif::Style::Aligned)
    ;

    enum_<gemmi::GridSizeRounding>("GridSizeRounding")
        .value("Nearest", gemmi::GridSizeRounding::Nearest)
        .value("Up", gemmi::GridSizeRounding::Up)
        .value("Down", gemmi::GridSizeRounding::Down)
    ;

    enum_<gemmi::AxisOrder>("AxisOrder")
        .value("Unknown", gemmi::AxisOrder::Unknown)
        .value("XYZ", gemmi::AxisOrder::XYZ)
        .value("ZYX", gemmi::AxisOrder::ZYX)
    ;

    enum_<gemmi::MapSetup>("MapSetup")
        .value("Full", gemmi::MapSetup::Full)
        .value("NoSymmetry", gemmi::MapSetup::NoSymmetry)
        .value("ReorderOnly", gemmi::MapSetup::ReorderOnly)
    ;

    enum_<gemmi::DataType>("DataType")
        .value("Unknown", gemmi::DataType::Unknown)
        .value("Unmerged", gemmi::DataType::Unmerged)
        .value("Mean", gemmi::DataType::Mean)
        .value("Anomalous", gemmi::DataType::Anomalous)
    ;

    enum_<gemmi::ResidueKind>("ResidueInfoKind")
        .value("UNKNOWN", gemmi::ResidueKind::UNKNOWN)
        .value("AA", gemmi::ResidueKind::AA)
        .value("AAD", gemmi::ResidueKind::AAD)
        .value("PAA", gemmi::ResidueKind::PAA)
        .value("MAA", gemmi::ResidueKind::MAA)
        .value("RNA", gemmi::ResidueKind::RNA)
        .value("DNA", gemmi::ResidueKind::DNA)
        .value("BUF", gemmi::ResidueKind::BUF)
        .value("HOH", gemmi::ResidueKind::HOH)
        .value("PYR", gemmi::ResidueKind::PYR)
        .value("KET", gemmi::ResidueKind::KET)
        .value("ELS", gemmi::ResidueKind::ELS)
    ;

    enum_<gemmi::EnerLib::RadiusType>("EnerLibRadiusType")
        .value("Vdw", gemmi::EnerLib::RadiusType::Vdw)
        .value("Vdwh", gemmi::EnerLib::RadiusType::Vdwh)
        .value("Ion", gemmi::EnerLib::RadiusType::Ion)
    ;

    enum_<gemmi::cif::ItemType>("CifItemType")
        .value("Pair", gemmi::cif::ItemType::Pair)
        .value("Loop", gemmi::cif::ItemType::Loop)
        .value("Frame", gemmi::cif::ItemType::Frame)
        .value("Comment", gemmi::cif::ItemType::Comment)
        .value("Erased", gemmi::cif::ItemType::Erased)
    ;

    enum_<gemmi::SoftwareItem::Classification>("Classification")
        .value("DataCollection", gemmi::SoftwareItem::Classification::DataCollection)
        .value("DataExtraction", gemmi::SoftwareItem::Classification::DataExtraction)
        .value("DataProcessing", gemmi::SoftwareItem::Classification::DataProcessing)
        .value("DataReduction", gemmi::SoftwareItem::Classification::DataReduction)
        .value("DataScaling", gemmi::SoftwareItem::Classification::DataScaling)
        .value("ModelBuilding", gemmi::SoftwareItem::Classification::ModelBuilding)
        .value("Phasing", gemmi::SoftwareItem::Classification::Phasing)
        .value("Refinement", gemmi::SoftwareItem::Classification::Refinement)
        .value("Unspecified", gemmi::SoftwareItem::Classification::Unspecified)
    ;

    enum_<gemmi::Restraints::DistanceOf>("DistanceOf")
        .value("ElectronCloud", gemmi::Restraints::DistanceOf::ElectronCloud)
        .value("Nucleus", gemmi::Restraints::DistanceOf::Nucleus)
    ;

    enum_<gemmi::BondType>("BondType")
        .value("Unspec", gemmi::BondType::Unspec)
        .value("Single", gemmi::BondType::Single)
        .value("Double", gemmi::BondType::Double)
        .value("Triple", gemmi::BondType::Triple)
        .value("Aromatic", gemmi::BondType::Aromatic)
        .value("Deloc", gemmi::BondType::Deloc)
        .value("Metal", gemmi::BondType::Metal)
    ;

    enum_<gemmi::ChiralityType>("ChiralityType")
        .value("Positive", gemmi::ChiralityType::Positive)
        .value("Negative", gemmi::ChiralityType::Negative)
        .value("Both", gemmi::ChiralityType::Both)
    ;

    enum_<gemmi::ChemComp::Group>("ChemCompGroup")
        .value("Peptide", gemmi::ChemComp::Group::Peptide)
        .value("PPeptide", gemmi::ChemComp::Group::PPeptide)
        .value("MPeptide", gemmi::ChemComp::Group::MPeptide)
        .value("Dna", gemmi::ChemComp::Group::Dna)
        .value("Rna", gemmi::ChemComp::Group::Rna)
        .value("DnaRna", gemmi::ChemComp::Group::DnaRna)
        .value("Pyranose", gemmi::ChemComp::Group::Pyranose)
        .value("Ketopyranose", gemmi::ChemComp::Group::Ketopyranose)
        .value("Furanose", gemmi::ChemComp::Group::Furanose)
        .value("NonPolymer", gemmi::ChemComp::Group::NonPolymer)
        .value("Null", gemmi::ChemComp::Group::Null)
    ;

    enum_<gemmi::Assembly::SpecialKind>("SpecialKind")
        .value("NA", gemmi::Assembly::SpecialKind::NA)
        .value("CompleteIcosahedral", gemmi::Assembly::SpecialKind::CompleteIcosahedral)
        .value("RepresentativeHelical", gemmi::Assembly::SpecialKind::RepresentativeHelical)
        .value("CompletePoint", gemmi::Assembly::SpecialKind::CompletePoint)
    ;

    enum_<gemmi::Connection::Type>("ConnectionType")
        .value("Covale", gemmi::Connection::Type::Covale)
        .value("Disulf", gemmi::Connection::Type::Disulf)
        .value("Hydrog", gemmi::Connection::Type::Hydrog)
        .value("MetalC", gemmi::Connection::Type::MetalC)
        .value("Unknown", gemmi::Connection::Type::Unknown)
    ;

    enum_<gemmi::Helix::HelixClass>("HelixClass")
        .value("UnknownHelix", gemmi::Helix::HelixClass::UnknownHelix)
        .value("RAlpha", gemmi::Helix::HelixClass::RAlpha)
        .value("ROmega", gemmi::Helix::HelixClass::ROmega)
        .value("RPi", gemmi::Helix::HelixClass::RPi)
        .value("RGamma", gemmi::Helix::HelixClass::RGamma)
        .value("R310", gemmi::Helix::HelixClass::R310)
        .value("LAlpha", gemmi::Helix::HelixClass::LAlpha)
        .value("LOmega", gemmi::Helix::HelixClass::LOmega)
        .value("LGamma", gemmi::Helix::HelixClass::LGamma)
        .value("Helix27", gemmi::Helix::HelixClass::Helix27)
        .value("HelixPolyProlineNone", gemmi::Helix::HelixClass::HelixPolyProlineNone)
    ;

    enum_<gemmi::Asu>("Asu")
        .value("Same", gemmi::Asu::Same)
        .value("Different", gemmi::Asu::Different)
        .value("Any", gemmi::Asu::Any)
    ;

    enum_<gemmi::El>("El")
        .value("X", gemmi::El::X)
        .value("He", gemmi::El::He)
        .value("Li", gemmi::El::Li)
        .value("Be", gemmi::El::Be)
        .value("B", gemmi::El::B)
        .value("C", gemmi::El::C)
        .value("N", gemmi::El::N)
        .value("O", gemmi::El::O)
        .value("F", gemmi::El::F)
        .value("Ne", gemmi::El::Ne)
        .value("Na", gemmi::El::Na)
        .value("Mg", gemmi::El::Mg)
        .value("Al", gemmi::El::Al)
        .value("Si", gemmi::El::Si)
        .value("P", gemmi::El::P)
        .value("S", gemmi::El::S)
        .value("Cl", gemmi::El::Cl)
        .value("Ar", gemmi::El::Ar)
        .value("K", gemmi::El::K)
        .value("Ca", gemmi::El::Ca)
        .value("Sc", gemmi::El::Sc)
        .value("Ti", gemmi::El::Ti)
        .value("V", gemmi::El::V)
        .value("Cr", gemmi::El::Cr)
        .value("Mn", gemmi::El::Mn)
        .value("Fe", gemmi::El::Fe)
        .value("Co", gemmi::El::Co)
        .value("Ni", gemmi::El::Ni)
        .value("Cu", gemmi::El::Cu)
        .value("Zn", gemmi::El::Zn)
        .value("Ga", gemmi::El::Ga)
        .value("Ge", gemmi::El::Ge)
        .value("As", gemmi::El::As)
        .value("Se", gemmi::El::Se)
        .value("Br", gemmi::El::Br)
        .value("Kr", gemmi::El::Kr)
        .value("Rb", gemmi::El::Rb)
        .value("Sr", gemmi::El::Sr)
        .value("Y", gemmi::El::Y)
        .value("Zr", gemmi::El::Zr)
        .value("Nb", gemmi::El::Nb)
        .value("Mo", gemmi::El::Mo)
        .value("Tc", gemmi::El::Tc)
        .value("Ru", gemmi::El::Ru)
        .value("Rh", gemmi::El::Rh)
        .value("Pd", gemmi::El::Pd)
        .value("Ag", gemmi::El::Ag)
        .value("Cd", gemmi::El::Cd)
        .value("In", gemmi::El::In)
        .value("Sn", gemmi::El::Sn)
        .value("Sb", gemmi::El::Sb)
        .value("Te", gemmi::El::Te)
        .value("I", gemmi::El::I)
        .value("Xe", gemmi::El::Xe)
        .value("Cs", gemmi::El::Cs)
        .value("Ba", gemmi::El::Ba)
        .value("La", gemmi::El::La)
        .value("Ce", gemmi::El::Ce)
        .value("Pr", gemmi::El::Pr)
        .value("Nd", gemmi::El::Nd)
        .value("Pm", gemmi::El::Pm)
        .value("Sm", gemmi::El::Sm)
        .value("Eu", gemmi::El::Eu)
        .value("Gd", gemmi::El::Gd)
        .value("Tb", gemmi::El::Tb)
        .value("Dy", gemmi::El::Dy)
        .value("Ho", gemmi::El::Ho)
        .value("Er", gemmi::El::Er)
        .value("Tm", gemmi::El::Tm)
        .value("Yb", gemmi::El::Yb)
        .value("Lu", gemmi::El::Lu)
        .value("Hf", gemmi::El::Hf)
        .value("Ta", gemmi::El::Ta)
        .value("W", gemmi::El::W)
        .value("Re", gemmi::El::Re)
        .value("Os", gemmi::El::Os)
        .value("Ir", gemmi::El::Ir)
        .value("Pt", gemmi::El::Pt)
        .value("Au", gemmi::El::Au)
        .value("Hg", gemmi::El::Hg)
        .value("Tl", gemmi::El::Tl)
        .value("Pb", gemmi::El::Pb)
        .value("Bi", gemmi::El::Bi)
        .value("Po", gemmi::El::Po)
        .value("At", gemmi::El::At)
        .value("Rn", gemmi::El::Rn)
        .value("Fr", gemmi::El::Fr)
        .value("Ra", gemmi::El::Ra)
        .value("Ac", gemmi::El::Ac)
        .value("Th", gemmi::El::Th)
        .value("Pa", gemmi::El::Pa)
        .value("U", gemmi::El::U)
        .value("Np", gemmi::El::Np)
        .value("Pu", gemmi::El::Pu)
        .value("Am", gemmi::El::Am)
        .value("Cm", gemmi::El::Cm)
        .value("Bk", gemmi::El::Bk)
        .value("Cf", gemmi::El::Cf)
        .value("Es", gemmi::El::Es)
        .value("Fm", gemmi::El::Fm)
        .value("Md", gemmi::El::Md)
        .value("No", gemmi::El::No)
        .value("Lr", gemmi::El::Lr)
        .value("Rf", gemmi::El::Rf)
        .value("Db", gemmi::El::Db)
        .value("Sg", gemmi::El::Sg)
        .value("Bh", gemmi::El::Bh)
        .value("Hs", gemmi::El::Hs)
        .value("Mt", gemmi::El::Mt)
        .value("Ds", gemmi::El::Ds)
        .value("Rg", gemmi::El::Rg)
        .value("Cn", gemmi::El::Cn)
        .value("Nh", gemmi::El::Nh)
        .value("Fl", gemmi::El::Fl)
        .value("Mc", gemmi::El::Mc)
        .value("Lv", gemmi::El::Lv)
        .value("Ts", gemmi::El::Ts)
        .value("Og", gemmi::El::Og)
        .value("D", gemmi::El::D)
        .value("END", gemmi::El::END)
    ;

    enum_<gemmi::PolymerType>("PolymerType")
        .value("Unknown", gemmi::PolymerType::Unknown)
        .value("PeptideL", gemmi::PolymerType::PeptideL)
        .value("PeptideD", gemmi::PolymerType::PeptideD)
        .value("Dna", gemmi::PolymerType::Dna)
        .value("Rna", gemmi::PolymerType::Rna)
        .value("DnaRnaHybrid", gemmi::PolymerType::DnaRnaHybrid)
        .value("SaccharideD", gemmi::PolymerType::SaccharideD)
        .value("SaccharideL", gemmi::PolymerType::SaccharideL)
        .value("Pna", gemmi::PolymerType::Pna)
        .value("CyclicPseudoPeptide", gemmi::PolymerType::CyclicPseudoPeptide)
        .value("Other", gemmi::PolymerType::Other)
    ;

    enum_<gemmi::PointGroup>("PointGroup")
        .value("C1", gemmi::PointGroup::C1)
        .value("Ci", gemmi::PointGroup::Ci)
        .value("C2", gemmi::PointGroup::C2)
        .value("Cs", gemmi::PointGroup::Cs)
        .value("C2h", gemmi::PointGroup::C2h)
        .value("D2", gemmi::PointGroup::D2)
        .value("C2v", gemmi::PointGroup::C2v)
        .value("D2h", gemmi::PointGroup::D2h)
        .value("C4", gemmi::PointGroup::C4)
        .value("S4", gemmi::PointGroup::S4)
        .value("C4h", gemmi::PointGroup::C4h)
        .value("D4", gemmi::PointGroup::D4)
        .value("C4v", gemmi::PointGroup::C4v)
        .value("D2d", gemmi::PointGroup::D2d)
        .value("D4h", gemmi::PointGroup::D4h)
        .value("C3", gemmi::PointGroup::C3)
        .value("C3i", gemmi::PointGroup::C3i)
        .value("D3", gemmi::PointGroup::D3)
        .value("C3v", gemmi::PointGroup::C3v)
        .value("D3d", gemmi::PointGroup::D3d)
        .value("C6", gemmi::PointGroup::C6)
        .value("C3h", gemmi::PointGroup::C3h)
        .value("C6h", gemmi::PointGroup::C6h)
        .value("D6", gemmi::PointGroup::D6)
        .value("C6v", gemmi::PointGroup::C6v)
        .value("D3h", gemmi::PointGroup::D3h)
        .value("D6h", gemmi::PointGroup::D6h)
        .value("T", gemmi::PointGroup::T)
        .value("Th", gemmi::PointGroup::Th)
        .value("O", gemmi::PointGroup::O)
        .value("Td", gemmi::PointGroup::Td)
        .value("Oh", gemmi::PointGroup::Oh)
    ;

    enum_<gemmi::Laue>("Laue")
        .value("L1", gemmi::Laue::L1)
        .value("L2m", gemmi::Laue::L2m)
        .value("Lmmm", gemmi::Laue::Lmmm)
        .value("L4m", gemmi::Laue::L4m)
        .value("L4mmm", gemmi::Laue::L4mmm)
        .value("L3", gemmi::Laue::L3)
        .value("L3m", gemmi::Laue::L3m)
        .value("L6m", gemmi::Laue::L6m)
        .value("L6mmm", gemmi::Laue::L6mmm)
        .value("Lm3", gemmi::Laue::Lm3)
        .value("Lm3m", gemmi::Laue::Lm3m)
    ;

    enum_<gemmi::EntityType>("EntityType")
        .value("Unknown", gemmi::EntityType::Unknown)
        .value("Polymer", gemmi::EntityType::Polymer)
        .value("NonPolymer", gemmi::EntityType::NonPolymer)
        .value("Branched", gemmi::EntityType::Branched)
        .value("Water", gemmi::EntityType::Water)
    ;

    enum_<gemmi::CalcFlag>("CalcFlag")
        .value("NotSet", gemmi::CalcFlag::NotSet)
        .value("Determined", gemmi::CalcFlag::Determined)
        .value("Calculated", gemmi::CalcFlag::Calculated)
        .value("Dummy", gemmi::CalcFlag::Dummy)
    ;

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

    class_<gemmi::MutableVectorSpan<gemmi::Residue>, base<gemmi::Span<gemmi::Residue>>>("MutableVectorSpanResidue")
    .function("is_beginning",&gemmi::MutableVectorSpan<gemmi::Residue>::is_beginning)
    .function("is_ending",&gemmi::MutableVectorSpan<gemmi::Residue>::is_ending)
    ;

    class_<gemmi::UnitCellParameters>("UnitCellParameters")
    .constructor<>()
    .property("a",&gemmi::UnitCell::a)
    .property("b",&gemmi::UnitCell::b)
    .property("c",&gemmi::UnitCell::c)
    .property("alpha",&gemmi::UnitCell::alpha)
    .property("beta",&gemmi::UnitCell::beta)
    .property("gamma",&gemmi::UnitCell::gamma)
    ;

    class_<gemmi::UnitCell, base<gemmi::UnitCellParameters>>("UnitCell")
    .constructor<>()
    .constructor<double,  double, double, double, double, double>()
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
    .function("calculate_u_eq",&gemmi::UnitCell::calculate_u_eq)
    .function("metric_tensor",&gemmi::UnitCell::metric_tensor)
    .function("reciprocal_metric_tensor",&gemmi::UnitCell::reciprocal_metric_tensor)
    .function("is_compatible_with_spacegroup",&gemmi::UnitCell::is_compatible_with_spacegroup, allow_raw_pointers())
    .function("set_cell_images_from_spacegroup",&gemmi::UnitCell::set_cell_images_from_spacegroup, allow_raw_pointers())
    ;

    class_<gemmi::Model>("Model")
    .property("num",&gemmi::Model::num)
    .property("name",&gemmi::Model::num)
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
    //.function("first_conformer",select_overload<gemmi::UniqProxy<gemmi::Residue>()>(&gemmi::Chain::first_conformer))
    //And various pointer return methods ...
    ;

    class_<gemmi::ConstResidueSpan, base<gemmi::Span<const gemmi::Residue>>>("ConstResidueSpan")
    .function("length",&gemmi::ConstResidueSpan::length)
    .function("subchain_id",&gemmi::ConstResidueSpan::subchain_id)
    .function("find_residue_group",&gemmi::ConstResidueSpan::find_residue_group)
    .function("extract_sequence",&gemmi::ConstResidueSpan::extract_sequence)
    .function("extreme_num",&gemmi::ConstResidueSpan::extreme_num)
    .function("label_seq_id_to_auth",&gemmi::ConstResidueSpan::label_seq_id_to_auth)
    .function("auth_seq_id_to_label",&gemmi::ConstResidueSpan::auth_seq_id_to_label)
    //ConstUniqProxy<Residue, ConstResidueSpan> first_conformer() const {
    //ConstUniqProxy<Residue, ConstResidueSpan> first_conformer() const {
    ;

    class_<gemmi::ResidueSpan, base<gemmi::MutableVectorSpan<gemmi::Residue>>>("ResidueSpan")
    .function("length",&gemmi::ResidueSpan::length)
    .function("subchain_id",&gemmi::ResidueSpan::subchain_id)
    .function("find_residue_group",select_overload<gemmi::ResidueGroup(gemmi::SeqId)>(&gemmi::ResidueSpan::find_residue_group))
    .function("find_residue_group_const",select_overload<gemmi::ConstResidueGroup(gemmi::SeqId)const>(&gemmi::ResidueSpan::find_residue_group))
    .function("extreme_num",&gemmi::ResidueSpan::extreme_num)
    .function("label_seq_id_to_auth",&gemmi::ResidueSpan::label_seq_id_to_auth)
    .function("auth_seq_id_to_label",&gemmi::ResidueSpan::auth_seq_id_to_label)
    ;

    class_<gemmi::ConstResidueGroup,base<gemmi::ConstResidueSpan>>("ConstResidueGroup")
    .function("by_resname",&gemmi::ConstResidueGroup::by_resname)
    ;

    class_<gemmi::ResidueGroup>("ResidueGroup")
    .function("by_resname",&gemmi::ResidueGroup::by_resname)
    .function("remove_residue",&gemmi::ResidueGroup::remove_residue)
    ;

    class_<gemmi::SeqId::OptionalNum>("OptionalNum")
    .property("value",&gemmi::SeqId::OptionalNum::value)
    .function("has_value",&gemmi::SeqId::OptionalNum::has_value)
    .function("str",&gemmi::SeqId::OptionalNum::str)
    ;

    class_<gemmi::SeqId>("SeqId")
    .property("num",&gemmi::SeqId::num)
    .property("icode",&gemmi::SeqId::icode)
    .function("has_icode",&gemmi::SeqId::has_icode)
    .function("str",&gemmi::SeqId::str)
    ;

    class_<gemmi::ResidueId>("ResidueId")
    .property("seqid",&gemmi::ResidueId::seqid)
    .property("segment",&gemmi::ResidueId::segment)
    .property("name",&gemmi::ResidueId::name)
    .function("group_key",&gemmi::ResidueId::group_key)
    .function("matches",&gemmi::ResidueId::matches)
    .function("matches_noseg",&gemmi::ResidueId::matches_noseg)
    ;

    class_<gemmi::Residue, base<gemmi::ResidueId>>("GemmiResidue")
    .property("subchain",&gemmi::Residue::subchain)
    .property("entity_id",&gemmi::Residue::entity_id)
    .property("label_seq",&gemmi::Residue::label_seq)
    .property("entity_type",&gemmi::Residue::entity_type)
    .property("het_flag",&gemmi::Residue::het_flag)
    .property("flag",&gemmi::Residue::flag)
    .property("atoms",&gemmi::Residue::atoms)
    .function("empty_copy",&gemmi::Residue::empty_copy)
    .function("children",select_overload<std::vector<gemmi::Atom>&()>(&gemmi::Residue::children))
    .function("children_const",select_overload<const std::vector<gemmi::Atom>&()const>(&gemmi::Residue::children))
    .function("get",&gemmi::Residue::get)
    .function("sole_atom",&gemmi::Residue::sole_atom)
    .function("same_conformer",&gemmi::Residue::same_conformer)
    .function("is_water",&gemmi::Residue::is_water)
    .property("sifts_unp",&gemmi::Residue::sifts_unp)
    //UniqProxy<Atom> first_conformer() { return {atoms}; }
    //ConstUniqProxy<Atom> first_conformer() const { return {atoms}; }
    //And various pointer return methods ...
    ;

    class_<gemmi::Atom>("GemmiAtom")
    .property("name",&gemmi::Atom::name)
    .property("altloc",&gemmi::Atom::altloc)
    .property("charge",&gemmi::Atom::charge)
    .property("element",&gemmi::Atom::element)
    .property("calc_flag",&gemmi::Atom::calc_flag)
    .property("flag",&gemmi::Atom::flag)
    .property("tls_group_id",&gemmi::Atom::tls_group_id)
    .property("serial",&gemmi::Atom::serial)
    .property("pos",&gemmi::Atom::pos)
    .property("occ",&gemmi::Atom::occ)
    .property("b_iso",&gemmi::Atom::b_iso)
    .function("altloc_or",&gemmi::Atom::altloc_or)
    .function("altloc_matches",&gemmi::Atom::altloc_matches)
    .function("group_key",&gemmi::Atom::group_key)
    .function("has_altloc",&gemmi::Atom::has_altloc)
    .function("b_eq",&gemmi::Atom::b_eq)
    .function("is_hydrogen",&gemmi::Atom::is_hydrogen)
    .function("padded_name",&gemmi::Atom::padded_name)
    .function("empty_copy",&gemmi::Atom::empty_copy)
    .property("aniso",&gemmi::Atom::aniso)//SMat33<float>
    ;

    class_<gemmi::Element>("Element")
    .property("elem",&gemmi::Element::elem)
    .function("ordinal",&gemmi::Element::ordinal)
    .function("atomic_number",&gemmi::Element::atomic_number)
    .function("is_hydrogen",&gemmi::Element::is_hydrogen)
    .function("weight",&gemmi::Element::weight)
    .function("covalent_r",&gemmi::Element::covalent_r)
    .function("vdw_r",&gemmi::Element::vdw_r)
    .function("is_metal",&gemmi::Element::is_metal)
    //.function("name",&gemmi::Element::name, allow_raw_pointers())// These 2 do not work! PKc (char*) is unbound type/
    //.function("uname",&gemmi::Element::uname, allow_raw_pointers())
    .function("name", &get_element_name_as_string)
    .function("uname", &get_element_upper_name_as_string)
    ;

    class_<gemmi::Mat33>("Mat33")
    .function("row_copy",&gemmi::Mat33::row_copy)
    .function("column_copy",&gemmi::Mat33::column_copy)
    .function("multiplyVec3",select_overload<gemmi::Vec3(const gemmi::Vec3&)const>(&gemmi::Mat33::multiply))
    .function("multiplyMat33",select_overload<gemmi::Mat33(const gemmi::Mat33&)const>(&gemmi::Mat33::multiply))
    .function("left_multiply",&gemmi::Mat33::left_multiply)
    .function("multiply_by_diagonal",&gemmi::Mat33::multiply_by_diagonal)
    .function("transpose",&gemmi::Mat33::transpose)
    .function("trace",&gemmi::Mat33::trace)
    .function("approx",&gemmi::Mat33::approx)
    .function("determinant",&gemmi::Mat33::determinant)
    .function("inverse",&gemmi::Mat33::inverse)
    .function("is_identity",&gemmi::Mat33::is_identity)
    .function("column_dot",&gemmi::Mat33::column_dot)
    .function("as_array",&Mat33ToDoubleArray)
    ;

    class_<GemmiSMat33double>("SMat33double")
    .function("as_mat33",&GemmiSMat33double::as_mat33)
    .function("trace",&GemmiSMat33double::trace)
    .function("all_zero",&GemmiSMat33double::all_zero)
    //.function("scale",&GemmiSMat33double::scale) // this causes compiler to give a const usage error.
    //.function("scaled",&GemmiSMat33double::scaled) // this causes all kinds of trouble
    .function("added_kI",&GemmiSMat33double::added_kI)

    //Do not work with 0.6.4
    //.function("r_u_r",select_overload<double(const gemmi::Vec3&)const>(&GemmiSMat33double::r_u_r))
    //.function("r_u_rArray",select_overload<double(const std::array<int,3>&)const>(&GemmiSMat33double::r_u_r))

    .function("multiply",&GemmiSMat33double::multiply)
    //.function("transformed_by",&GemmiSMat33double::transformed_by)
    .function("determinant",&GemmiSMat33double::determinant)
    .function("inverse",&GemmiSMat33double::inverse)
    .function("calculate_eigenvalues",&gemmi::SMat33<double>::calculate_eigenvalues) //Hmm, returns std::array<double, 3>
    ;

    class_<GemmiSMat33float>("SMat33float")
    .function("as_mat33",&GemmiSMat33float::as_mat33)
    .function("trace",&GemmiSMat33float::trace)
    .function("all_zero",&GemmiSMat33float::all_zero)
    //.function("scale",&GemmiSMat33float::scale) // this causes compiler to give a const usage error.
    //.function("scaled",&GemmiSMat33float::scaled) // this causes all kinds of trouble
    .function("added_kI",&GemmiSMat33float::added_kI)

    //Do not work with 0.6.4
    //.function("r_u_r",select_overload<double(const gemmi::Vec3&)const>(&GemmiSMat33float::r_u_r))
    //.function("r_u_rArray",select_overload<double(const std::array<int,3>&)const>(&GemmiSMat33float::r_u_r))

    .function("multiply",&GemmiSMat33float::multiply)
    //.function("transformed_by",&GemmiSMat33float::transformed_by)
    .function("determinant",&GemmiSMat33float::determinant)
    .function("inverse",&GemmiSMat33float::inverse)
    .function("calculate_eigenvalues",&gemmi::SMat33<float>::calculate_eigenvalues) //Hmm, returns std::array<double, 3>
    ;

    class_<gemmi::Vec3>("GemmiVec3")
    .property("x",&gemmi::Vec3::x)
    .property("y",&gemmi::Vec3::y)
    .property("z",&gemmi::Vec3::z)
    .function("at",select_overload<double(int)const>(&gemmi::Vec3::at))
    .function("negated",&gemmi::Vec3::negated)
    .function("dot",&gemmi::Vec3::dot)
    .function("cross",&gemmi::Vec3::cross)
    .function("length_sq",&gemmi::Vec3::length_sq)
    .function("length",&gemmi::Vec3::length)
    .function("changed_magnitude",&gemmi::Vec3::changed_magnitude)
    .function("normalized",&gemmi::Vec3::normalized)
    .function("dist_sq",&gemmi::Vec3::dist_sq)
    .function("dist",&gemmi::Vec3::dist)
    .function("cos_angle",&gemmi::Vec3::cos_angle)
    .function("angle",&gemmi::Vec3::angle)
    .function("approx",&gemmi::Vec3::approx)
    .function("has_nan",&gemmi::Vec3::has_nan)
    ;

    class_<gemmi::Fractional, base<gemmi::Vec3>>("Fractional")
    .constructor<float, float, float>()
    .function("wrap_to_unit",&gemmi::Fractional::wrap_to_unit)
    .function("wrap_to_zero",&gemmi::Fractional::wrap_to_zero)
    .function("round",&gemmi::Fractional::round)
    .function("move_toward_zero_by_one",&gemmi::Fractional::move_toward_zero_by_one)
    ;

    class_<gemmi::Position, base<gemmi::Vec3>>("Position")
    .constructor<float, float, float>()
    ;
    class_<gemmi::NeighborSearch>("NeighborSearch")
    .constructor<gemmi::Model&, gemmi::UnitCell&, double>()
    .property("radius_specified",&gemmi::NeighborSearch::radius_specified)
    .property("include_h",&gemmi::NeighborSearch::include_h)
    .function("add_chain",&gemmi::NeighborSearch::add_chain)
    .function("dist",&gemmi::NeighborSearch::dist)
    .function("populate",&gemmi::NeighborSearch::populate)
    //.function("find_atoms",&gemmi::NeighborSearch::find_atoms)
    //.function("find_neighbors",&gemmi::NeighborSearch::find_neighbors)
    ;

    class_<gemmi::NeighborSearch::Mark>("Mark")
    .property("altloc",&gemmi::NeighborSearch::Mark::altloc)
    .property("element",&gemmi::NeighborSearch::Mark::element)
    .property("image_idx",&gemmi::NeighborSearch::Mark::image_idx)
    .property("chain_idx",&gemmi::NeighborSearch::Mark::chain_idx)
    .property("residue_idx",&gemmi::NeighborSearch::Mark::residue_idx)
    .property("atom_idx",&gemmi::NeighborSearch::Mark::atom_idx)
    ;

    class_<gemmi::Entity::DbRef>("EntityDbRef")
    .property("db_name",&gemmi::Entity::DbRef::db_name)
    .property("accession_code",&gemmi::Entity::DbRef::accession_code)
    .property("id_code",&gemmi::Entity::DbRef::id_code)
    .property("isoform",&gemmi::Entity::DbRef::isoform)
    .property("seq_begin",&gemmi::Entity::DbRef::seq_begin)
    .property("seq_end",&gemmi::Entity::DbRef::seq_end)
    .property("db_begin",&gemmi::Entity::DbRef::db_begin)
    .property("db_end",&gemmi::Entity::DbRef::db_end)
    .property("label_seq_begin",&gemmi::Entity::DbRef::label_seq_begin)
    .property("label_seq_end",&gemmi::Entity::DbRef::label_seq_end)
    ;

    class_<gemmi::Entity>("Entity")
    .property("name",&gemmi::Entity::name)
    .property("subchains",&gemmi::Entity::subchains)
    .property("entity_type",&gemmi::Entity::entity_type)
    .property("polymer_type",&gemmi::Entity::polymer_type)
    .property("sifts_unp_acc",&gemmi::Entity::sifts_unp_acc)
    .property("full_sequence",&gemmi::Entity::full_sequence)
    .property("dbrefs",&gemmi::Entity::dbrefs)
    .function("first_mon",&gemmi::Entity::first_mon)
    ;

    class_<gemmi::ItemGroup<gemmi::Atom>>("ItemGroupAtom")
    .function("size",&gemmi::ItemGroup<gemmi::Atom>::size)
    .function("extent",&gemmi::ItemGroup<gemmi::Atom>::extent)
    .function("empty",&gemmi::ItemGroup<gemmi::Atom>::empty)
    .function("front",select_overload<gemmi::Atom&()>(&gemmi::ItemGroup<gemmi::Atom>::front))
    .function("front_const",select_overload<const gemmi::Atom&()const>(&gemmi::ItemGroup<gemmi::Atom>::front))
    .function("back",select_overload<gemmi::Atom&()>(&gemmi::ItemGroup<gemmi::Atom>::back))
    .function("back_const",select_overload<const gemmi::Atom&()const>(&gemmi::ItemGroup<gemmi::Atom>::back))
    ;
    class_<gemmi::AtomGroup, base<gemmi::ItemGroup<gemmi::Atom>>>("AtomGroup")
    .function("name",&gemmi::AtomGroup::name)
    .function("by_altloc",&gemmi::AtomGroup::by_altloc)
    ;

    class_<gemmi::SpaceGroup>("SpaceGroup")
    .property("number",&gemmi::SpaceGroup::number)
    .property("ccp4",&gemmi::SpaceGroup::ccp4)
    .property("ext",&gemmi::SpaceGroup::ext)
    .property("basisop_idx",&gemmi::SpaceGroup::basisop_idx)
    .function("xhm",&gemmi::SpaceGroup::xhm)
    .function("centring_type",&gemmi::SpaceGroup::centring_type)
    .function("ccp4_lattice_type",&gemmi::SpaceGroup::ccp4_lattice_type)
    .function("short_name",&gemmi::SpaceGroup::short_name)
    .function("pdb_name",&gemmi::SpaceGroup::pdb_name)
    .function("is_sohncke",&gemmi::SpaceGroup::is_sohncke)
    .function("is_enantiomorphic",&gemmi::SpaceGroup::is_enantiomorphic)
    .function("is_symmorphic",&gemmi::SpaceGroup::is_symmorphic)
    .function("is_centrosymmetric",&gemmi::SpaceGroup::is_centrosymmetric)
    .function("point_group",&gemmi::SpaceGroup::point_group)
    .function("laue_class",&gemmi::SpaceGroup::laue_class)
    .function("basisop",&gemmi::SpaceGroup::basisop)
    .function("centred_to_primitive",&gemmi::SpaceGroup::centred_to_primitive)
    .function("operations",&gemmi::SpaceGroup::operations)
    //I do not see a way to wrap these, so I have created utility methods above.
    //I guess adding accessors to class would be only solution?
    //.property("hm",&gemmi::SpaceGroup::hm)
    //.property("qualifier",&gemmi::SpaceGroup::qualifier)
    //.property("hall",&gemmi::SpaceGroup::hall)
    .function("hm", &get_spacegroup_hm)
    .function("hall", &get_spacegroup_hall)
    .function("qualifier", &get_spacegroup_qualifier)
    ;

    class_<gemmi::Transform>("Transform")
    .property("mat",&gemmi::Transform::mat)
    .property("vec",&gemmi::Transform::vec)
    .function("inverse",&gemmi::Transform::inverse)
    .function("apply",&gemmi::Transform::apply)
    .function("combine",&gemmi::Transform::combine)
    .function("is_identity",&gemmi::Transform::is_identity)
    .function("set_identity",&gemmi::Transform::set_identity)
    .function("approx",&gemmi::Transform::approx)
    ;

    class_<gemmi::FTransform,base<gemmi::Transform>>("FTransform")
    .function("apply",&gemmi::FTransform::apply)
    ;

    class_<gemmi::Op>("Op")
    .property("rot",&gemmi::Op::rot) //No idea if this can work - Rot
    .property("tran",&gemmi::Op::tran) //No idea if this can work - Tran
    .function("triplet",&gemmi::Op::triplet)
    .function("inverse",&gemmi::Op::inverse)
    .function("wrap",&gemmi::Op::wrap)
    .function("translate",&gemmi::Op::translate)
    .function("translated",&gemmi::Op::translated) //No idea if this can work - Tran
    .function("add_centering",&gemmi::Op::add_centering) //No idea if this can work - Tran
    .function("negated_rot",&gemmi::Op::negated_rot) //No idea if this can work - Rot
    .function("transposed_rot",&gemmi::Op::transposed_rot) //No idea if this can work - Rot
    .function("det_rot",&gemmi::Op::det_rot)
    .function("rot_type",&gemmi::Op::rot_type)
    .function("combine",&gemmi::Op::combine)
    .function("apply_to_xyz",&gemmi::Op::apply_to_xyz)// ? const std::array<double, 3> arg and return
    .function("apply_to_hkl_without_division",&gemmi::Op::apply_to_hkl_without_division) //No idea if this can work - Miller
    .function("divide_hkl_by_DEN",&gemmi::Op::divide_hkl_by_DEN) //No idea if this can work - Miller std::array<int, 3>
    .function("apply_to_hkl",&gemmi::Op::apply_to_hkl) //No idea if this can work - Miller std::array<int, 3>
    .function("phase_shift",&gemmi::Op::phase_shift) //No idea if this can work - Miller std::array<int, 3>
    .function("int_seitz",&gemmi::Op::int_seitz)// ? std::array<std::array<int, 4>, 4> return
    .function("float_seitz",&gemmi::Op::float_seitz)// ? std::array<std::array<int, 4>, 4> return
    //.function("identity",&gemmi::Op::identity) // does not work. Because static?
    ;

    class_<gemmi::GroupOps>("GroupOps")
    .property("sym_ops",&gemmi::GroupOps::sym_ops)
    .function("order",&gemmi::GroupOps::order)
    .function("add_missing_elements",&gemmi::GroupOps::add_missing_elements)
    .function("add_missing_elements_part2",&gemmi::GroupOps::add_missing_elements_part2)
    .function("add_inversion",&gemmi::GroupOps::add_inversion)
    .function("find_centering",&gemmi::GroupOps::find_centering)
    .function("is_centrosymmetric",&gemmi::GroupOps::is_centrosymmetric)
    .function("is_reflection_centric",&gemmi::GroupOps::is_reflection_centric)
    .function("epsilon_factor",&gemmi::GroupOps::epsilon_factor)
    .function("epsilon_factor_without_centering",&gemmi::GroupOps::epsilon_factor_without_centering)
    .function("has_phase_shift",&gemmi::GroupOps::has_phase_shift)
    .function("is_systematically_absent",&gemmi::GroupOps::is_systematically_absent)
    .function("change_basis_impl",&gemmi::GroupOps::change_basis_impl)
    .function("change_basis_forward",&gemmi::GroupOps::change_basis_forward)
    .function("change_basis_backward",&gemmi::GroupOps::change_basis_backward)
    .function("all_ops_sorted",&gemmi::GroupOps::all_ops_sorted)
    .function("get_op",&gemmi::GroupOps::get_op)
    .function("is_same_as",&gemmi::GroupOps::is_same_as)
    .function("has_same_centring",&gemmi::GroupOps::has_same_centring)
    .function("has_same_rotations",&gemmi::GroupOps::has_same_rotations)
    .function("find_grid_factors",&gemmi::GroupOps::find_grid_factors)// return std::array<int, 3>
    .function("are_directions_symmetry_related",&gemmi::GroupOps::are_directions_symmetry_related)
    .function("derive_symmorphic",&gemmi::GroupOps::derive_symmorphic)
    //.property("sym_ops",&gemmi::GroupOps::sym_ops) // Op::Tran
    ;

    class_<gemmi::Helix>("Helix")
    .property("start",&gemmi::Helix::start)
    .property("end",&gemmi::Helix::end)
    .property("pdb_helix_class",&gemmi::Helix::pdb_helix_class)
    .property("length",&gemmi::Helix::length)
    .function("set_helix_class_as_int",&gemmi::Helix::set_helix_class_as_int)
    ;
    class_<gemmi::Sheet::Strand>("Strand")
    .property("start",&gemmi::Sheet::Strand::start)
    .property("end",&gemmi::Sheet::Strand::end)
    .property("hbond_atom2",&gemmi::Sheet::Strand::hbond_atom2)
    .property("hbond_atom1",&gemmi::Sheet::Strand::hbond_atom1)
    .property("sense",&gemmi::Sheet::Strand::sense)
    .property("name",&gemmi::Sheet::Strand::name)
    ;
    class_<gemmi::Sheet>("Sheet")
    .property("name",&gemmi::Sheet::name)
    .property("strands",&gemmi::Sheet::strands)
    ;
    class_<gemmi::Connection>("Connection")
    .property("name",&gemmi::Connection::name)
    .property("link_id",&gemmi::Connection::link_id)
    .property("type",&gemmi::Connection::type)
    .property("asu",&gemmi::Connection::asu)
    .property("partner1",&gemmi::Connection::partner1)
    .property("partner2",&gemmi::Connection::partner2)
    .property("reported_distance",&gemmi::Connection::reported_distance)
    ;
    class_<gemmi::AtomAddress>("AtomAddress")
    .property("chain_name",&gemmi::AtomAddress::chain_name)
    .property("res_id",&gemmi::AtomAddress::res_id)
    .property("atom_name",&gemmi::AtomAddress::atom_name)
    .property("altloc",&gemmi::AtomAddress::altloc)
    .function("str",&gemmi::AtomAddress::str)
    ;

    class_<gemmi::Assembly::Operator>("AssemblyOperator")
    .property("name",&gemmi::Assembly::Operator::name)
    .property("type",&gemmi::Assembly::Operator::type)
    .property("transform",&gemmi::Assembly::Operator::transform)
    ;
    register_vector<gemmi::Assembly::Operator>("VectorAssemblyOperator");

    class_<gemmi::Assembly::Gen>("AssemblyGen")
    .property("chains",&gemmi::Assembly::Gen::chains)
    .property("subchains",&gemmi::Assembly::Gen::subchains)
    .property("operators",&gemmi::Assembly::Gen::operators)
    ;

    class_<gemmi::Assembly>("Assembly")
    .property("name",&gemmi::Assembly::name)
    .property("author_determined",&gemmi::Assembly::author_determined)
    .property("software_determined",&gemmi::Assembly::software_determined)
    .property("special_kind",&gemmi::Assembly::special_kind)
    .property("oligomeric_count",&gemmi::Assembly::oligomeric_count)
    .property("oligomeric_details",&gemmi::Assembly::oligomeric_details)
    .property("software_name",&gemmi::Assembly::software_name)
    .property("absa",&gemmi::Assembly::absa)
    .property("ssa",&gemmi::Assembly::ssa)
    .property("more",&gemmi::Assembly::more)
    .property("generators",&gemmi::Assembly::generators)
    ;

    class_<gemmi::NcsOp>("NcsOp")
    .property("id",&gemmi::NcsOp::id)
    .property("given",&gemmi::NcsOp::given)
    .property("tr",&gemmi::NcsOp::tr)
    .function("apply",&gemmi::NcsOp::apply)
    ;

    class_<gemmi::Metadata>("Metadata")
    .property("authors",&gemmi::Metadata::authors)
    .property("experiments",&gemmi::Metadata::experiments)
    .property("crystals",&gemmi::Metadata::crystals)
    .property("refinement",&gemmi::Metadata::refinement)
    .property("software",&gemmi::Metadata::software)
    .property("solved_by",&gemmi::Metadata::solved_by)
    .property("starting_model",&gemmi::Metadata::starting_model)
    .property("remark_300_detail",&gemmi::Metadata::remark_300_detail)
    .function("has_restr",&gemmi::Metadata::has_restr)
    .function("has_tls",&gemmi::Metadata::has_tls)
    .function("has_d",select_overload<bool(double gemmi::RefinementInfo::*field)const>(&gemmi::Metadata::has))
    .function("has_i",select_overload<bool(int gemmi::RefinementInfo::*field)const>(&gemmi::Metadata::has))
    .function("has_s",select_overload<bool(std::string gemmi::RefinementInfo::*field)const>(&gemmi::Metadata::has))
    .function("has_m33",select_overload<bool(gemmi::SMat33<double> gemmi::RefinementInfo::*field)const>(&gemmi::Metadata::has))
    ;

    class_<gemmi::SoftwareItem>("SoftwareItem")
    .property("name",&gemmi::SoftwareItem::name)
    .property("version",&gemmi::SoftwareItem::version)
    .property("date",&gemmi::SoftwareItem::date)
    .property("classification",&gemmi::SoftwareItem::classification)
    ;

    class_<gemmi::ExperimentInfo>("ExperimentInfo")
    .property("method",&gemmi::ExperimentInfo::method)
    .property("number_of_crystals",&gemmi::ExperimentInfo::number_of_crystals)
    .property("unique_reflections",&gemmi::ExperimentInfo::unique_reflections)
    .property("reflections",&gemmi::ExperimentInfo::reflections)
    .property("b_wilson",&gemmi::ExperimentInfo::b_wilson)
    .property("shells",&gemmi::ExperimentInfo::shells)
    .property("diffraction_ids",&gemmi::ExperimentInfo::diffraction_ids)
    ;

    class_<gemmi::DiffractionInfo>("DiffractionInfo")
    .property("id",&gemmi::DiffractionInfo::id)
    .property("temperature",&gemmi::DiffractionInfo::temperature)
    .property("source",&gemmi::DiffractionInfo::source)
    .property("source_type",&gemmi::DiffractionInfo::source_type)
    .property("synchrotron",&gemmi::DiffractionInfo::synchrotron)
    .property("beamline",&gemmi::DiffractionInfo::beamline)
    .property("wavelengths",&gemmi::DiffractionInfo::wavelengths)
    .property("scattering_type",&gemmi::DiffractionInfo::scattering_type)
    .property("mono_or_laue",&gemmi::DiffractionInfo::mono_or_laue)
    .property("monochromator",&gemmi::DiffractionInfo::monochromator)
    .property("collection_date",&gemmi::DiffractionInfo::collection_date)
    .property("optics",&gemmi::DiffractionInfo::optics)
    .property("detector",&gemmi::DiffractionInfo::detector)
    .property("detector_make",&gemmi::DiffractionInfo::detector_make)
    ;

    class_<gemmi::ReflectionsInfo>("ReflectionsInfo")
    .property("resolution_high",&gemmi::ReflectionsInfo::resolution_high)
    .property("resolution_low",&gemmi::ReflectionsInfo::resolution_low)
    .property("completeness",&gemmi::ReflectionsInfo::completeness)
    .property("redundancy",&gemmi::ReflectionsInfo::redundancy)
    .property("r_merge",&gemmi::ReflectionsInfo::r_merge)
    .property("r_sym",&gemmi::ReflectionsInfo::r_sym)
    .property("mean_I_over_sigma",&gemmi::ReflectionsInfo::mean_I_over_sigma)
    ;

    class_<gemmi::CrystalInfo>("CrystalInfo")
    .property("id",&gemmi::CrystalInfo::id)
    .property("description",&gemmi::CrystalInfo::description)
    .property("ph",&gemmi::CrystalInfo::ph)
    .property("ph_range",&gemmi::CrystalInfo::ph_range)
    .property("diffractions",&gemmi::CrystalInfo::diffractions)
    ;

    class_<gemmi::BasicRefinementInfo>("BasicRefinementInfo")
    .property("resolution_high",&gemmi::BasicRefinementInfo::resolution_high)
    .property("resolution_low",&gemmi::BasicRefinementInfo::resolution_low)
    .property("completeness",&gemmi::BasicRefinementInfo::completeness)
    .property("reflection_count",&gemmi::BasicRefinementInfo::reflection_count)
    .property("rfree_set_count",&gemmi::BasicRefinementInfo::rfree_set_count)
    .property("r_all",&gemmi::BasicRefinementInfo::r_all)
    .property("r_work",&gemmi::BasicRefinementInfo::r_work)
    .property("r_free",&gemmi::BasicRefinementInfo::r_free)
    .property("cc_fo_fc_work",&gemmi::RefinementInfo::cc_fo_fc_work)
    .property("cc_fo_fc_free",&gemmi::RefinementInfo::cc_fo_fc_free)
    ;

    class_<gemmi::TlsGroup::Selection>("TlsGroupSelection")
    .property("chain",&gemmi::TlsGroup::Selection::chain)
    .property("res_begin",&gemmi::TlsGroup::Selection::res_begin)
    .property("res_end",&gemmi::TlsGroup::Selection::res_end)
    .property("details",&gemmi::TlsGroup::Selection::details)
    ;

    class_<gemmi::TlsGroup>("TlsGroup")
    .property("id",&gemmi::TlsGroup::id)
    .property("selections",&gemmi::TlsGroup::selections)
    .property("origin",&gemmi::TlsGroup::origin)
    .property("T",&gemmi::TlsGroup::T)
    .property("L",&gemmi::TlsGroup::L)
    .property("S",&gemmi::TlsGroup::S)
    ;

    class_<gemmi::RefinementInfo::Restr>("Restr")
    .property("name",&gemmi::RefinementInfo::Restr::name)
    .property("count",&gemmi::RefinementInfo::Restr::count)
    .property("weight",&gemmi::RefinementInfo::Restr::weight)
    .property("function",&gemmi::RefinementInfo::Restr::function)
    .property("dev_ideal",&gemmi::RefinementInfo::Restr::dev_ideal)
    ;

    class_<gemmi::RefinementInfo,base<gemmi::BasicRefinementInfo>>("RefinementInfo")
    .property("id",&gemmi::RefinementInfo::id)
    .property("cross_validation_method",&gemmi::RefinementInfo::cross_validation_method)
    .property("rfree_selection_method",&gemmi::RefinementInfo::rfree_selection_method)
    .property("bin_count",&gemmi::RefinementInfo::bin_count)
    .property("bins",&gemmi::RefinementInfo::bins)
    .property("mean_b",&gemmi::RefinementInfo::mean_b)
    .property("aniso_b",&gemmi::RefinementInfo::aniso_b)
    .property("luzzati_error",&gemmi::RefinementInfo::luzzati_error)
    .property("dpi_blow_r",&gemmi::RefinementInfo::dpi_blow_r)
    .property("dpi_blow_rfree",&gemmi::RefinementInfo::dpi_blow_rfree)
    .property("dpi_cruickshank_r",&gemmi::RefinementInfo::dpi_cruickshank_r)
    .property("dpi_cruickshank_rfree",&gemmi::RefinementInfo::dpi_cruickshank_rfree)
    .property("restr_stats",&gemmi::RefinementInfo::restr_stats)
    .property("tls_groups",&gemmi::RefinementInfo::tls_groups)
    .property("remarks",&gemmi::RefinementInfo::remarks)
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
    .function("renumber_models",&gemmi::Structure::renumber_models)
    .function("ncs_given_count",&gemmi::Structure::ncs_given_count)
    .function("get_ncs_multiplier",&gemmi::Structure::get_ncs_multiplier)
    .function("ncs_not_expanded",&gemmi::Structure::ncs_not_expanded)
    .function("merge_chain_parts",&gemmi::Structure::merge_chain_parts)
    .function("remove_empty_chains",&gemmi::Structure::remove_empty_chains)
    .function("empty_copy",&gemmi::Structure::empty_copy)
    .function("setup_cell_images",&gemmi::Structure::setup_cell_images)
    .function("first_model",select_overload<const gemmi::Model&(void)const>(&gemmi::Structure::first_model))
    .function("as_string",&get_mmcif_string_from_gemmi_struct)
    ;

    class_<gemmi::NearestImage>("NearestImage")
    .property("dist_sq",&gemmi::NearestImage::dist_sq)
    //Need accessor for int pbc_shift[3]
    .property("sym_idx",&gemmi::NearestImage::sym_idx)
    .function("dist",&gemmi::NearestImage::dist)
    .function("same_asu",&gemmi::NearestImage::same_asu)
    .function("symmetry_code",&gemmi::NearestImage::symmetry_code)
    ;

    class_<gemmi::SiftsUnpResidue>("SiftsUnpResidue")
    .property("res",&gemmi::SiftsUnpResidue::res)
    .property("acc_index",&gemmi::SiftsUnpResidue::acc_index)
    .property("num",&gemmi::SiftsUnpResidue::num)
    ;

    class_<gemmi::ChemLink::Side>("Side")
    .property("comp",&gemmi::ChemLink::Side::comp)
    .property("mod",&gemmi::ChemLink::Side::mod)
    .property("group",&gemmi::ChemLink::Side::group)
    .function("matches_group",&gemmi::ChemLink::Side::matches_group)
    .function("specificity",&gemmi::ChemLink::Side::specificity)
    ;

    class_<gemmi::ChemLink>("ChemLink")
    .property("id",&gemmi::ChemLink::id)
    .property("name",&gemmi::ChemLink::name)
    .property("side1",&gemmi::ChemLink::side1)
    .property("side2",&gemmi::ChemLink::side2)
    .property("rt",&gemmi::ChemLink::rt)
    .property("block",&gemmi::ChemLink::block)
    //.function("calculate_score",&gemmi::ChemLink::calculate_score) //Takes a pointer as 2nd arg: (const Residue&, const Residue*, ...
    ;

    class_<gemmi::Restraints::Plane>("Plane")
    .property("label",&gemmi::Restraints::Plane::label)
    .property("ids",&gemmi::Restraints::Plane::ids)
    .property("esd",&gemmi::Restraints::Plane::esd)
    .function("str",&gemmi::Restraints::Plane::str)
    ;

    class_<gemmi::Restraints::Chirality>("Chirality")
    .property("id_ctr",&gemmi::Restraints::Chirality::id_ctr)
    .property("id1",&gemmi::Restraints::Chirality::id1)
    .property("id2",&gemmi::Restraints::Chirality::id2)
    .property("id3",&gemmi::Restraints::Chirality::id3)
    .property("sign",&gemmi::Restraints::Chirality::sign)
    .function("is_wrong",&gemmi::Restraints::Chirality::is_wrong)
    .function("str",&gemmi::Restraints::Chirality::str)
    ;

    class_<gemmi::Restraints::Torsion>("Torsion")
    .property("id1",&gemmi::Restraints::Torsion::id1)
    .property("id2",&gemmi::Restraints::Torsion::id2)
    .property("id3",&gemmi::Restraints::Torsion::id3)
    .property("id4",&gemmi::Restraints::Torsion::id4)
    .property("value",&gemmi::Restraints::Torsion::value)
    .property("esd",&gemmi::Restraints::Torsion::esd)
    .property("period",&gemmi::Restraints::Torsion::period)
    .function("str",&gemmi::Restraints::Chirality::str)
    ;

    class_<gemmi::Restraints::Angle>("Angle")
    .property("id1",&gemmi::Restraints::Angle::id1)
    .property("id2",&gemmi::Restraints::Angle::id2)
    .property("id3",&gemmi::Restraints::Angle::id3)
    .function("radians",&gemmi::Restraints::Angle::radians)
    .function("str",&gemmi::Restraints::Angle::str)
    ;

    class_<gemmi::Restraints::Bond>("Bond")
    .property("id1",&gemmi::Restraints::Bond::id1)
    .property("id2",&gemmi::Restraints::Bond::id2)
    .property("type",&gemmi::Restraints::Bond::type)
    .property("aromatic",&gemmi::Restraints::Bond::aromatic)
    .property("value",&gemmi::Restraints::Bond::value)
    .property("esd",&gemmi::Restraints::Bond::esd)
    .property("value_nucleus",&gemmi::Restraints::Bond::value_nucleus)
    .property("esd_nucleus",&gemmi::Restraints::Bond::esd_nucleus)
    .function("str",&gemmi::Restraints::Bond::str)
    .function("lexicographic_str",&gemmi::Restraints::Bond::lexicographic_str)
    .function("distance",&gemmi::Restraints::Bond::distance)
    ;

    class_<gemmi::Restraints::AtomId>("AtomId")
    .property("comp",&gemmi::Restraints::AtomId::comp)
    .property("atom",&gemmi::Restraints::AtomId::atom)
    ;

    class_<gemmi::Restraints>("Restraints")
    .property("bonds",&gemmi::Restraints::bonds)
    .property("angles",&gemmi::Restraints::angles)
    .property("torsions",&gemmi::Restraints::torsions)
    .property("chirs",&gemmi::Restraints::chirs)
    .property("planes",&gemmi::Restraints::planes)
    .function("empty",&gemmi::Restraints::empty)
    .function("find_shortest_path",&gemmi::Restraints::find_shortest_path)
    .function("chiral_abs_volume",&gemmi::Restraints::chiral_abs_volume)
    .function("get_or_add_plane",&gemmi::Restraints::get_or_add_plane)
    .function("rename_atom",&gemmi::Restraints::rename_atom)
    .function("lexicographic_str",&gemmi::Restraints::lexicographic_str)
    ;

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
    .function("read_group",&gemmi::ChemComp::read_group)
    .function("set_group",&gemmi::ChemComp::set_group)
    .function("has_atom",&gemmi::ChemComp::has_atom)
    .function("get_atom_index",&gemmi::ChemComp::get_atom_index)
    .function("get_atom",&gemmi::ChemComp::get_atom)
    .function("is_peptide_group",&gemmi::ChemComp::is_peptide_group)
    .function("is_nucleotide_group",&gemmi::ChemComp::is_nucleotide_group)
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
    .function("relative_monomer_path",&gemmi::MonLib::relative_monomer_path)
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
    .function("first",&gemmi::Selection::first)
    .function("chains",&gemmi::Selection::chains)
    .function("models",&gemmi::Selection::models)
    .function("residues",&gemmi::Selection::residues)
    .function("atoms",&gemmi::Selection::atoms)
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

    class_<gemmi::SmallStructure::Site>("SmallStructureSite")
    .property("label",&gemmi::SmallStructure::Site::label)
    .property("type_symbol",&gemmi::SmallStructure::Site::type_symbol)
    .property("fract",&gemmi::SmallStructure::Site::fract)
    .property("occ",&gemmi::SmallStructure::Site::occ)
    .property("u_iso",&gemmi::SmallStructure::Site::u_iso)
    .property("aniso",&gemmi::SmallStructure::Site::aniso)
    .property("disorder_group",&gemmi::SmallStructure::Site::disorder_group)
    .property("element",&gemmi::SmallStructure::Site::element)
    .property("charge",&gemmi::SmallStructure::Site::charge)
    .function("orth",&gemmi::SmallStructure::Site::orth)
    .function("element_and_charge_symbol",&gemmi::SmallStructure::Site::element_and_charge_symbol)
    ;

    class_<gemmi::SmallStructure::AtomType>("SmallStructureAtomType")
    .property("symbol",&gemmi::SmallStructure::AtomType::symbol)
    .property("element",&gemmi::SmallStructure::AtomType::element)
    .property("charge",&gemmi::SmallStructure::AtomType::charge)
    .property("dispersion_real",&gemmi::SmallStructure::AtomType::dispersion_real)
    .property("dispersion_imag",&gemmi::SmallStructure::AtomType::dispersion_imag)
    ;

    class_<gemmi::SmallStructure>("SmallStructure")
    .property("name",&gemmi::SmallStructure::name)
    .property("cell",&gemmi::SmallStructure::cell)
    .property("spacegroup_hm",&gemmi::SmallStructure::spacegroup_hm)
    .property("sites",&gemmi::SmallStructure::sites)
    .property("atom_types",&gemmi::SmallStructure::atom_types)
    .property("wavelength",&gemmi::SmallStructure::wavelength)
    .function("get_all_unit_cell_sites",&gemmi::SmallStructure::get_all_unit_cell_sites)
    .function("remove_hydrogens",&gemmi::SmallStructure::remove_hydrogens)
    .function("change_occupancies_to_crystallographic",&gemmi::SmallStructure::change_occupancies_to_crystallographic)
    .function("setup_cell_images",&gemmi::SmallStructure::setup_cell_images)
    ;

    class_<std::complex<float>>("complexfloat")
    .constructor<float, float>()
    .constructor<const std::complex<float>&>()
    //.constructor<const std::complex<double>&>()
    //.constructor<const std::complex<long double>&>()
    .function("real",select_overload<float(void)const>(&std::complex<float>::real))
    .function("imag",select_overload<float(void)const>(&std::complex<float>::imag))
    ;

    class_<gemmi::HklValue<std::complex<float>>>("HklValueComplexFloat")
    .property("hkl",&gemmi::HklValue<std::complex<float>>::hkl)// Miller - std::array<int, 3>
    .property("value",&gemmi::HklValue<std::complex<float>>::value)
    ;

    class_<gemmi::AsuData<std::complex<float>>>("AsuDataComplexFloat")
    .property("v",&gemmi::AsuData<std::complex<float>>::v)
    .property("unit_cell_",&gemmi::AsuData<std::complex<float>>::unit_cell_)
    .function("stride",&gemmi::AsuData<std::complex<float>>::stride)
    .function("size",&gemmi::AsuData<std::complex<float>>::size)
    .function("get_hkl",&gemmi::AsuData<std::complex<float>>::get_hkl)
    .function("get_f",&gemmi::AsuData<std::complex<float>>::get_f)
    .function("get_phi",&gemmi::AsuData<std::complex<float>>::get_phi)
    .function("unit_cell",&gemmi::AsuData<std::complex<float>>::unit_cell)
    //.function("spacegroup",&gemmi::AsuData<std::complex<float>>::spacegroup) // SpaceGroup*
    .function("ensure_sorted",&gemmi::AsuData<std::complex<float>>::ensure_sorted)
    .function("ensure_asu",&gemmi::AsuData<std::complex<float>>::ensure_asu)
    ;

    class_<gemmi::ReflnBlock>("ReflnBlock")
    .property("block",&gemmi::ReflnBlock::block)
    .property("entry_id",&gemmi::ReflnBlock::entry_id)
    .property("cell",&gemmi::ReflnBlock::cell)
    .property("wavelength",&gemmi::ReflnBlock::wavelength)
    .function("ok",&gemmi::ReflnBlock::ok)
    .function("check_ok",&gemmi::ReflnBlock::check_ok)
    .function("tag_offset",&gemmi::ReflnBlock::tag_offset)
    .function("use_unmerged",&gemmi::ReflnBlock::use_unmerged)
    .function("is_unmerged",&gemmi::ReflnBlock::is_unmerged)
    .function("column_labels",&gemmi::ReflnBlock::column_labels)
    .function("find_column_index",&gemmi::ReflnBlock::find_column_index)
    .function("get_column_index",&gemmi::ReflnBlock::get_column_index)
    .function("get_hkl_column_indices",&gemmi::ReflnBlock::get_hkl_column_indices)//std::array<size_t,3>
    .function("make_miller_vector",&gemmi::ReflnBlock::make_miller_vector)//std::vector<Miller>
    .function("make_1_d2_vector",&gemmi::ReflnBlock::make_1_d2_vector)
    .function("make_d_vector",&gemmi::ReflnBlock::make_d_vector)
    ;

    class_<gemmi::ReflnDataProxy>("ReflnDataProxy")
    .property("hkl_cols_",&gemmi::ReflnDataProxy::hkl_cols_)//std::array<size_t,3>
    .function("stride",&gemmi::ReflnDataProxy::stride)
    .function("size",&gemmi::ReflnDataProxy::size)
    .function("get_num",&gemmi::ReflnDataProxy::get_num)
    .function("unit_cell",&gemmi::ReflnDataProxy::unit_cell)
    .function("get_hkl",&gemmi::ReflnDataProxy::get_hkl)//Miller
    .function("column_index",&gemmi::ReflnDataProxy::column_index)
    ;

    class_<gemmi::CifToMtz::Entry>("CifToMtzEntry")
    .property("refln_tag",&gemmi::CifToMtz::Entry::refln_tag)
    .property("col_label",&gemmi::CifToMtz::Entry::col_label)
    .property("col_type",&gemmi::CifToMtz::Entry::col_type)
    .property("dataset_id",&gemmi::CifToMtz::Entry::dataset_id)
    //std::vector<std::pair<std::string, float>> code_to_number; - Util method required?
    .function("translate_code_to_number",&gemmi::CifToMtz::Entry::translate_code_to_number)
    ;

    class_<gemmi::CifToMtz>("CifToMtz")
    .property("verbose",&gemmi::CifToMtz::verbose)
    .property("force_unmerged",&gemmi::CifToMtz::force_unmerged)
    .property("title",&gemmi::CifToMtz::title)
    .property("history",&gemmi::CifToMtz::history)
    .property("spec_lines",&gemmi::CifToMtz::spec_lines)
     //Mtz convert_block_to_mtz(const ReflnBlock& rb, std::ostream& out) const {
    ;

    class_<gemmi::Mtz::Dataset>("MtzDataset")
    .property("id",&gemmi::Mtz::Dataset::id)
    .property("project_name",&gemmi::Mtz::Dataset::project_name)
    .property("crystal_name",&gemmi::Mtz::Dataset::crystal_name)
    .property("dataset_name",&gemmi::Mtz::Dataset::dataset_name)
    .property("cell",&gemmi::Mtz::Dataset::cell)
    .property("wavelength",&gemmi::Mtz::Dataset::wavelength)
    ;

    class_<gemmi::Mtz::Column>("MtzColumn")
    .property("dataset_id",&gemmi::Mtz::Column::dataset_id)
    .property("type",&gemmi::Mtz::Column::type)
    .property("label",&gemmi::Mtz::Column::label)
    .property("min_value",&gemmi::Mtz::Column::min_value)
    .property("max_value",&gemmi::Mtz::Column::max_value)
    .property("source",&gemmi::Mtz::Column::source)
    .property("idx",&gemmi::Mtz::Column::idx)
    .function("dataset",select_overload<gemmi::Mtz::Dataset&()>(&gemmi::Mtz::Column::dataset))
    .function("dataset_const",select_overload<const gemmi::Mtz::Dataset&()const>(&gemmi::Mtz::Column::dataset))
    .function("has_data",&gemmi::Mtz::Column::has_data)
    .function("size",&gemmi::Mtz::Column::size)
    .function("stride",&gemmi::Mtz::Column::stride)
    .function("is_integer",&gemmi::Mtz::Column::is_integer)
    ;

    class_<gemmi::Mtz::Batch>("MtzBatch")
    .property("number",&gemmi::Mtz::Batch::number)
    .property("title",&gemmi::Mtz::Batch::title)
    .property("ints",&gemmi::Mtz::Batch::ints)
    .property("floats",&gemmi::Mtz::Batch::floats)
    .property("axes",&gemmi::Mtz::Batch::axes)
    .function("get_cell",&gemmi::Mtz::Batch::get_cell)
    .function("set_cell",&gemmi::Mtz::Batch::set_cell)
    .function("dataset_id",&gemmi::Mtz::Batch::dataset_id)
    .function("set_dataset_id",&gemmi::Mtz::Batch::set_dataset_id)
    .function("wavelength",&gemmi::Mtz::Batch::wavelength)
    .function("set_wavelength",&gemmi::Mtz::Batch::set_wavelength)
    .function("phi_start",&gemmi::Mtz::Batch::phi_start)
    .function("phi_end",&gemmi::Mtz::Batch::phi_end)
    .function("matrix_U",&gemmi::Mtz::Batch::matrix_U)
    ;

    class_<gemmi::Mtz>("Mtz")
    .property("source_path",&gemmi::Mtz::source_path)
    .property("same_byte_order",&gemmi::Mtz::same_byte_order)
    .property("indices_switched_to_original",&gemmi::Mtz::indices_switched_to_original)
    .property("header_offset",&gemmi::Mtz::header_offset)
    .property("version_stamp",&gemmi::Mtz::version_stamp)
    .property("title",&gemmi::Mtz::title)
    .property("nreflections",&gemmi::Mtz::nreflections)
    .property("sort_order",&gemmi::Mtz::sort_order)//std::array<int, 5>
    .property("min_1_d2",&gemmi::Mtz::min_1_d2)
    .property("max_1_d2",&gemmi::Mtz::max_1_d2)
    .property("valm",&gemmi::Mtz::valm)
    .property("title",&gemmi::Mtz::title)
    .property("nsymop",&gemmi::Mtz::nsymop)
    .property("cell",&gemmi::Mtz::cell)
    .property("spacegroup_number",&gemmi::Mtz::spacegroup_number)
    .property("spacegroup_name",&gemmi::Mtz::spacegroup_name)
    .property("symops",&gemmi::Mtz::symops)
    .property("datasets",&gemmi::Mtz::datasets)
    .property("columns",&gemmi::Mtz::columns)
    .property("batches",&gemmi::Mtz::batches)
    .property("history",&gemmi::Mtz::history)
    .property("appended_text",&gemmi::Mtz::appended_text)
    .property("data",&gemmi::Mtz::data)
    .function("add_base",&gemmi::Mtz::add_base)
    .function("resolution_high",&gemmi::Mtz::resolution_high)
    .function("resolution_low",&gemmi::Mtz::resolution_low)
    .function("get_cell",select_overload<gemmi::UnitCell&(int)>(&gemmi::Mtz::get_cell))
    .function("get_cell_const",select_overload<const gemmi::UnitCell&(int)const>(&gemmi::Mtz::get_cell))
    .function("set_cell_for_all",&gemmi::Mtz::set_cell_for_all)
    .function("last_dataset",&gemmi::Mtz::last_dataset)
    .function("dataset",select_overload<gemmi::Mtz::Dataset&(int)>(&gemmi::Mtz::dataset))
    .function("dataset_const",select_overload<const gemmi::Mtz::Dataset&(int)const>(&gemmi::Mtz::dataset))
    .function("count",&gemmi::Mtz::count)
    .function("count_type",&gemmi::Mtz::count_type)
    .function("positions_of_columns_with_type",&gemmi::Mtz::positions_of_columns_with_type)
    .function("has_data",&gemmi::Mtz::has_data)
    .function("is_merged",&gemmi::Mtz::is_merged)
    //.function("extend_min_max_1_d2",&gemmi::Mtz::extend_min_max_1_d2)// Does not compile ... ?
    .function("calculate_min_max_1_d2",&gemmi::Mtz::calculate_min_max_1_d2)//std::array<double,2>
    .function("update_reso",&gemmi::Mtz::update_reso)
    .function("toggle_endianness",&gemmi::Mtz::toggle_endianness)
    .function("setup_spacegroup",&gemmi::Mtz::setup_spacegroup)
    .function("read_file",&gemmi::Mtz::read_file)
    .function("sorted_row_indices",&gemmi::Mtz::sorted_row_indices)
    .function("sort",&gemmi::Mtz::sort)
    .function("get_hkl",&gemmi::Mtz::get_hkl)//Miller
    .function("set_hkl",&gemmi::Mtz::set_hkl)//Miller
    .function("ensure_asu",&gemmi::Mtz::ensure_asu)
    .function("switch_to_original_hkl",&gemmi::Mtz::switch_to_original_hkl)
    .function("switch_to_asu_hkl",&gemmi::Mtz::switch_to_asu_hkl)
    .function("add_dataset",&gemmi::Mtz::add_dataset)
    .function("add_column",&gemmi::Mtz::add_column)
    .function("replace_column",&gemmi::Mtz::replace_column)
    .function("copy_column",&gemmi::Mtz::copy_column)
    .function("remove_column",&gemmi::Mtz::remove_column)
    .function("expand_data_rows",&gemmi::Mtz::expand_data_rows)
    ;

    class_<gemmi::MtzDataProxy>("MtzDataProxy")
    .function("stride",&gemmi::MtzDataProxy::stride)
    .function("size",&gemmi::MtzDataProxy::size)
    .function("get_num",&gemmi::MtzDataProxy::get_num)
    .function("unit_cell",&gemmi::MtzDataProxy::unit_cell)
    .function("get_hkl",&gemmi::MtzDataProxy::get_hkl)//Miller
    .function("column_index",&gemmi::MtzDataProxy::column_index)
    ;

    class_<gemmi::MtzExternalDataProxy, base<gemmi::MtzDataProxy>>("MtzExternalDataProxy")
    .function("size",&gemmi::MtzExternalDataProxy::size)
    .function("get_num",&gemmi::MtzExternalDataProxy::get_num)
    .function("get_hkl",&gemmi::MtzExternalDataProxy::get_hkl)//Miller
    ;

    class_<gemmi::Ccp4Base>("Ccp4Base")
    .property("hstats",&gemmi::Ccp4Base::hstats)
    .property("ccp4_header",&gemmi::Ccp4Base::ccp4_header)
    .property("same_byte_order",&gemmi::Ccp4Base::same_byte_order)
    .function("header_i32",&gemmi::Ccp4Base::header_i32)
    //.function("header_3i32",&gemmi::Ccp4Base::header_i32) std::array<int, 3>
    .function("header_float",&gemmi::Ccp4Base::header_float)
    .function("header_str",&gemmi::Ccp4Base::header_str)
    .function("set_header_i32",&gemmi::Ccp4Base::set_header_i32)
    .function("set_header_3i32",&gemmi::Ccp4Base::set_header_3i32)
    .function("set_header_float",&gemmi::Ccp4Base::set_header_float)
    .function("set_header_str",&gemmi::Ccp4Base::set_header_str)
    //.function("axis_positions",&gemmi::Ccp4Base::axis_positions) std::array<int, 3>
    .function("header_rfloat",&gemmi::Ccp4Base::header_rfloat)
    .function("get_extent",&gemmi::Ccp4Base::get_extent)
    .function("has_skew_transformation",&gemmi::Ccp4Base::has_skew_transformation)
    .function("get_skew_transformation",&gemmi::Ccp4Base::get_skew_transformation)
    ;

    class_<gemmi::Ccp4<float>, base<gemmi::Ccp4Base>>("Ccp4")
    .function("prepare_ccp4_header_except_mode_and_stats",&gemmi::Ccp4<float>::prepare_ccp4_header_except_mode_and_stats)
    .function("update_ccp4_header",&gemmi::Ccp4<float>::update_ccp4_header)
    //.function("mode_for_data",&gemmi::Ccp4<float>::mode_for_data) //static ?
    .function("full_cell",&gemmi::Ccp4<float>::full_cell)
    //.function("read_ccp4_header",&gemmi::Ccp4<float>::read_ccp4_header) template<typename Stream> void read_ccp4_header(Stream& f, const std::string& path
    .function("setup",&gemmi::Ccp4<float>::setup)
    .function("set_extent",&gemmi::Ccp4<float>::set_extent)
    //.function("read_ccp4_stream",&gemmi::Ccp4<float>::read_ccp4_stream) template<typename Stream> void read_ccp4_stream(Stream& f, const std::string& path
    .function("read_ccp4_file",&gemmi::Ccp4<float>::read_ccp4_file)
    //.function("read_ccp4",&gemmi::Ccp4<float>::read_ccp4) template<typename Input> void read_ccp4(Input&& input)
    .function("write_ccp4_map",&gemmi::Ccp4<float>::write_ccp4_map)
    ;

    class_<gemmi::Ccp4<int8_t>, base<gemmi::Ccp4Base>>("Ccp4Int8_t")
    .function("prepare_ccp4_header_except_mode_and_stats",&gemmi::Ccp4<int8_t>::prepare_ccp4_header_except_mode_and_stats)
    .function("update_ccp4_header",&gemmi::Ccp4<int8_t>::update_ccp4_header)
    //.function("mode_for_data",&gemmi::Ccp4<int8_t>::mode_for_data) //static ?
    .function("full_cell",&gemmi::Ccp4<int8_t>::full_cell)
    //.function("read_ccp4_header",&gemmi::Ccp4<int8_t>::read_ccp4_header) template<typename Stream> void read_ccp4_header(Stream& f, const std::string& path
    .function("setup",&gemmi::Ccp4<int8_t>::setup)
    .function("set_extent",&gemmi::Ccp4<int8_t>::set_extent)
    //.function("read_ccp4_stream",&gemmi::Ccp4<int8_t>::read_ccp4_stream) template<typename Stream> void read_ccp4_stream(Stream& f, const std::string& path
    .function("read_ccp4_file",&gemmi::Ccp4<int8_t>::read_ccp4_file)
    //.function("read_ccp4",&gemmi::Ccp4<int8_t>::read_ccp4) template<typename Input> void read_ccp4(Input&& input)
    .function("write_ccp4_map",&gemmi::Ccp4<int8_t>::write_ccp4_map)
    ;

    class_<gemmi::DataStats>("DataStats")
    .property("dmin",&gemmi::DataStats::dmin)
    .property("dmax",&gemmi::DataStats::dmax)
    .property("dmean",&gemmi::DataStats::dmean)
    .property("rms",&gemmi::DataStats::rms)
    .property("nan_count",&gemmi::DataStats::nan_count)
    ;

    class_<gemmi::GridOp>("GridOp")
    .property("scaled_op",&gemmi::GridOp::scaled_op)
    //.function("apply",&gemmi::GridOp::apply) std::array<int, 3>
    ;

    class_<gemmi::GridMeta>("GridMeta")
    .property("unit_cell",&gemmi::GridMeta::unit_cell)
    .property("nu",&gemmi::GridMeta::nu)
    .property("nv",&gemmi::GridMeta::nv)
    .property("nw",&gemmi::GridMeta::nw)
    .property("axis_order",&gemmi::GridMeta::axis_order)
    .function("point_count",&gemmi::GridMeta::point_count)
    .function("get_fractional",&gemmi::GridMeta::get_fractional)
    .function("get_position",&gemmi::GridMeta::get_position)
    .function("get_scaled_ops_except_id",&gemmi::GridMeta::get_scaled_ops_except_id)
    .function("index_q_int",select_overload<size_t(int, int, int)const>(&gemmi::GridMeta::index_q))
    .function("index_q_size_t",select_overload<size_t(size_t, size_t, size_t)const>(&gemmi::GridMeta::index_q))
    .function("index_n",&gemmi::GridMeta::index_n)
    //.function("index_n_ref",&gemmi::GridMeta::index_n_ref) references?
    .function("index_near_zero",&gemmi::GridMeta::index_near_zero)
    ;

    class_<gemmi::GridBase<float>::Point>("GridBasePoint")
    .property("u",&gemmi::GridBase<float>::Point::u)
    .property("v",&gemmi::GridBase<float>::Point::v)
    .property("w",&gemmi::GridBase<float>::Point::w)
    ;

    class_<gemmi::GridBase<int8_t>::Point>("GridBasePointInt8_t")
    .property("u",&gemmi::GridBase<int8_t>::Point::u)
    .property("v",&gemmi::GridBase<int8_t>::Point::v)
    .property("w",&gemmi::GridBase<int8_t>::Point::w)
    ;

    class_<gemmi::GridBase<float>, base<gemmi::GridMeta>>("GridBase")
    .property("data",&gemmi::GridBase<float>::data)
    .function("check_not_empty",&gemmi::GridBase<float>::check_not_empty)
    .function("set_size_without_checking",&gemmi::GridBase<float>::set_size_without_checking)
    .function("get_value_q",&gemmi::GridBase<float>::get_value_q)
    .function("index_to_point",&gemmi::GridBase<float>::index_to_point)
    .function("fill",&gemmi::GridBase<float>::fill)
    ;

    class_<gemmi::GridBase<int8_t>, base<gemmi::GridMeta>>("GridBaseInt8_t")
    .property("data",&gemmi::GridBase<int8_t>::data)
    .function("check_not_empty",&gemmi::GridBase<int8_t>::check_not_empty)
    .function("set_size_without_checking",&gemmi::GridBase<int8_t>::set_size_without_checking)
    .function("get_value_q",&gemmi::GridBase<int8_t>::get_value_q)
    .function("index_to_point",&gemmi::GridBase<int8_t>::index_to_point)
    .function("fill",&gemmi::GridBase<int8_t>::fill)
    ;

    class_<gemmi::Grid<float>, base<gemmi::GridBase<float>>>("Grid")
    .function("calculate_spacing",&gemmi::Grid<float>::calculate_spacing)
    .function("set_size_without_checking",&gemmi::Grid<float>::set_size_without_checking)
    .function("set_size",&gemmi::Grid<float>::set_size)
    .function("set_size_from_spacing",&gemmi::Grid<float>::set_size_from_spacing)
    .function("set_unit_cell",select_overload<void(double, double, double, double, double, double)>(&gemmi::Grid<float>::set_unit_cell))
    .function("index_s",&gemmi::Grid<float>::index_s)
    .function("get_value",&gemmi::Grid<float>::get_value)
    .function("set_value",&gemmi::Grid<float>::set_value)
    .function("get_point",&gemmi::Grid<float>::get_point)
    .function("interpolate_value",select_overload<float(const gemmi::Position&, int)const>(&gemmi::Grid<float>::interpolate_value))
    .function("tricubic_interpolation",select_overload<double(double, double, double)const>(&gemmi::Grid<float>::tricubic_interpolation))
    .function("symmetrize_min",&gemmi::Grid<float>::symmetrize_min)
    .function("symmetrize_max",&gemmi::Grid<float>::symmetrize_max)
    .function("symmetrize_abs_max",&gemmi::Grid<float>::symmetrize_abs_max)
    .function("symmetrize_sum",&gemmi::Grid<float>::symmetrize_sum)
    .function("symmetrize_nondefault",&gemmi::Grid<float>::symmetrize_nondefault)
    .function("normalize",&gemmi::Grid<float>::normalize)
    ;

    class_<gemmi::Grid<int8_t>, base<gemmi::GridBase<int8_t>>>("GridInt8_t")
    // Does this actually ever get instantiated?
    ;

    class_<gemmi::Box<gemmi::Fractional>>("BoxFractional")
    .property("minimum",&gemmi::Box<gemmi::Fractional>::minimum)
    .property("maximum",&gemmi::Box<gemmi::Fractional>::maximum)
    .function("get_size",&gemmi::Box<gemmi::Fractional>::get_size)
    .function("add_margin",&gemmi::Box<gemmi::Fractional>::add_margin)
    ;

    class_<gemmi::Box<gemmi::Position>>("BoxPosition")
    .property("minimum",&gemmi::Box<gemmi::Position>::minimum)
    .property("maximum",&gemmi::Box<gemmi::Position>::maximum)
    .function("get_size",&gemmi::Box<gemmi::Position>::get_size)
    .function("add_margin",&gemmi::Box<gemmi::Position>::add_margin)
    ;

    class_<gemmi::AtomNameElement>("AtomNameElement")
    .property("atom_name",&gemmi::AtomNameElement::atom_name)
    .property("el",&gemmi::AtomNameElement::el)
    ;

    value_object<SequenceEntry>("SequenceEntry")
    .field("type", &SequenceEntry::type)
    .field("name", &SequenceEntry::name)
    .field("chain", &SequenceEntry::chain)
    .field("sequence", &SequenceEntry::sequence)
    ;

    register_vector<SequenceEntry>("VectorSequenceEntry");

    value_object<LigandDictInfo>("LigandDictInfo")
    .field("comp_id", &LigandDictInfo::comp_id)
    .field("dict_contents", &LigandDictInfo::dict_contents)
    ;

    register_vector<LigandDictInfo>("VectorLigandDictInfo");

    value_object<CompoundInfo>("CompoundInfo")
    .field("name", &CompoundInfo::name)
    .field("three_letter_code", &CompoundInfo::three_letter_code)
    ;

    register_vector<CompoundInfo>("VectorCompoundInfo");

    value_object<SequenceResInfo>("SequenceResInfo")
    .field("resNum", &SequenceResInfo::resNum)
    .field("resCode", &SequenceResInfo::resCode)
    .field("cid", &SequenceResInfo::cid)
    ;

    register_vector<SequenceResInfo>("VectorSequenceResInfo");

    value_object<ResidueBFactorInfo>("ResidueBFactorInfo")
    .field("cid", &ResidueBFactorInfo::cid)
    .field("bFactor", &ResidueBFactorInfo::bFactor)
    .field("normalised_bFactor", &ResidueBFactorInfo::normalised_bFactor)
    ;

    register_vector<ResidueBFactorInfo>("VectorResidueBFactorInfo");

    value_object<LigandInfo>("LigandInfo")
    .field("resName", &LigandInfo::resName)
    .field("chainName", &LigandInfo::chainName)
    .field("resNum", &LigandInfo::resNum)
    .field("modelName", &LigandInfo::modelName)
    .field("cid", &LigandInfo::cid)
    ;

    register_vector<LigandInfo>("VectorLigandInfo");

    value_object<AtomInfo>("AtomInfo")
    .field("x", &AtomInfo::x)
    .field("y", &AtomInfo::y)
    .field("z", &AtomInfo::z)
    .field("charge", &AtomInfo::charge)
    .field("element", &AtomInfo::element)
    .field("tempFactor", &AtomInfo::tempFactor)
    .field("serial", &AtomInfo::serial)
    .field("occupancy", &AtomInfo::occupancy)
    .field("name", &AtomInfo::name)
    .field("has_altloc", &AtomInfo::has_altloc)
    .field("alt_loc", &AtomInfo::alt_loc)
    .field("mol_name", &AtomInfo::mol_name)
    .field("chain_id", &AtomInfo::chain_id)
    .field("res_no", &AtomInfo::res_no)
    .field("res_name", &AtomInfo::res_name)
    ;

    register_vector<AtomInfo>("VectorAtomInfo");


    //TODO Wrap some of these gemmi classes
    /*

XdsAscii
Variance
Covariance
Correlation
UnmergedHklMover
MtzExternalDataProxy
Intensities
IsMmCifFile
IsCifFile
IsPdbFile
IsCoordinateFile
IsAnyFile
IsMatchingFile
PdbReadOptions
PdbWriteOptions
ChainNameGenerator
ContactSearch
HklMatch
HklValue
ValueSigma
DensityCalculator
TwoFoldData
SolventMasker
NeighborSearch
ReciprocalGrid
GridConstPoint

UniqProxy
ConstUniqProxy
Binner
CenterOfMass
IT92
C4322
AsuBrick
NodeInfo
FloodFill
Topo
ComplexCorrelation
LinkHunt
ResidueSpan::GroupingProxy
MmcifOutputGroups
Blob
BlobCriteria
from_chars_result
parse_options
span
value128
adjusted_mantissa
parsed_number_string
powers_template
stackvec
bigint
parsed_number_string
util
ExecC2C
ExecHartley
ExecDcst
ExecR2R
Scaling
Gaus
Point
OrbitalCoef
SellingVector;
GruberVector
SellingVector
ExpSum
ExpAnisoSum
GaussianCoef
AlignmentScoring
AlignmentResult
Addends
SpaceGroupAltName
Tables_
ReciprocalAsu
Neutron92
AssemblyMapping
FileStream
MemoryStream
FPhiProxy
BidirIterator
FilterProxy
ConstFilterProxy
SupResult
Ofstream
Ifstream
LevMar
BesselTables_
GlobWalk
    */

    //TODO Here we need to put *lots* of gemmi functions
    function("remove_non_selected_atoms",&remove_non_selected_atoms);
    function("remove_selected_residues",&remove_selected_residues);
    function("count_residues_in_selection",&count_residues_in_selection);
    function("get_pdb_string_from_gemmi_struct",&get_pdb_string_from_gemmi_struct);
    function("get_mmcif_string_from_gemmi_struct",&get_mmcif_string_from_gemmi_struct);
    function("structure_is_ligand",&structure_is_ligand);
    function("read_structure_from_string",&read_structure_from_string);
    function("read_string",&read_string);
    function("is_small_structure",&is_small_structure);
    function("copy_to_assembly_to_new_structure",&copy_to_assembly_to_new_structure);
    function("parse_ligand_dict_info", &parse_ligand_dict_info);
    function("read_structure_file",&gemmi::read_structure_file);
#if (__EMSCRIPTEN_major__ == 3 && __EMSCRIPTEN_minor__ == 1 && __EMSCRIPTEN_tiny__ >= 60) || __EMSCRIPTEN_major__ > 3
    function("read_mtz_file",&gemmi::read_mtz_file,return_value_policy::take_ownership());
#else
    function("read_mtz_file",&gemmi::read_mtz_file);
#endif
    function("get_spacegroup_by_name",&gemmi::get_spacegroup_by_name);
    function("gemmi_setup_entities",&gemmi::setup_entities);

    function("assign_subchains", &gemmi::assign_subchains);
    function("ensure_entities", &gemmi::ensure_entities);
    function("deduplicate_entities", &gemmi::deduplicate_entities);
    function("shorten_chain_names", &gemmi::shorten_chain_names);
    function("split_chains_by_segments", &gemmi::split_chains_by_segments);
    function("check_polymer_type", &gemmi::check_polymer_type);
    function("make_one_letter_sequence", &gemmi::make_one_letter_sequence);
    function("gemmi_add_entity_types",select_overload<void(gemmi::Structure&, bool)>(&gemmi::add_entity_types));
    function("remove_alternative_conformations_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_alternative_conformations));
    function("remove_alternative_conformations_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_alternative_conformations));
    function("remove_alternative_conformations_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_alternative_conformations));
    function("remove_waters_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_waters));
    function("remove_waters_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_waters));
    function("remove_waters_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_waters));
    function("remove_ligands_and_waters_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_ligands_and_waters));
    function("remove_ligands_and_waters_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_ligands_and_waters));
    function("remove_ligands_and_waters_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_ligands_and_waters));
    function("has_hydrogen", select_overload<bool(const gemmi::Model&)>(&gemmi::has_hydrogen));
    function("calculate_mass_model", select_overload<double(const gemmi::Model&)>(&gemmi::calculate_mass));
    function("calculate_mass_chain", select_overload<double(const gemmi::Chain&)>(&gemmi::calculate_mass));
    function("add_residue_chain", select_overload<gemmi::Residue&(gemmi::Chain&, gemmi::Residue, int)>(&add_child));
    function("add_residue_residuespan", select_overload<gemmi::Residue&(gemmi::ResidueSpan&, gemmi::Residue, int)>(&add_item));
    function("remove_hydrogens_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_hydrogens));
    function("remove_hydrogens_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_hydrogens));
    function("remove_hydrogens_residue",    select_overload<void(gemmi::Residue&)>(&gemmi::remove_hydrogens));
    function("trim_to_alanine_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::trim_to_alanine));
    function("trim_to_alanine_residue",    select_overload<bool(gemmi::Residue&)>(&gemmi::trim_to_alanine));

/*
    function("transform_pos_and_adp", transform_pos_and_adp<ResidueSpan>);
    function("add_atom", add_child<Residue, Atom>);
    */

    //Utilities to deal with char*/[]
    function("setCifItemPair",&set_cif_item_pair);
    function("setCifItemLoop",&set_cif_item_loop);
    function("setCifItemFrame",&set_cif_item_frame);
    function("getCifItemPair",&get_cif_item_pair);
    function("getCifItemLoop",&get_cif_item_loop);
    function("getCifItemFrame",&get_cif_item_frame);
    function("getSpaceGroupHMAsString",&get_spacegroup_hm);
    function("getNearestImagePBCShiftAsVector",&get_nearest_image_pbc_shift);
    function("getSpaceGroupHallAsString",&get_spacegroup_hall);
    function("getSpaceGroupQualifierAsString",&get_spacegroup_qualifier);
    function("getElementNameAsString",&get_element_name_as_string);
    function("cif_parse_string",&cif_parse_string);
    function("get_atom_info_for_selection", &get_atom_info_for_selection);
    function("get_ligand_info_for_structure", &get_ligand_info_for_structure);
    function("get_sequence_info", &get_sequence_info);
    function("get_structure_bfactors", &get_structure_bfactors);
    function("guess_coord_data_format", &guess_coord_data_format);
    function("parse_multi_cids", &parse_multi_cids);
    function("get_non_selected_cids", &get_non_selected_cids);
    function("parse_mon_lib_list_cif", &parse_mon_lib_list_cif);

    value_array<std::array<double, 9>>("array_native_double_9")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
        .element(emscripten::index<4>())
        .element(emscripten::index<5>())
        .element(emscripten::index<6>())
        .element(emscripten::index<7>())
        .element(emscripten::index<8>())
    ;

}
