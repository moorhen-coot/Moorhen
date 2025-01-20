#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <utility>
#include <cctype>

#include "gemmi/to_cif.hpp"
#include "gemmi/to_mmcif.hpp"
#include "gemmi/fstream.hpp"
#include "gemmi/cif.hpp"
#include "gemmi/small.hpp"
#include "gemmi/smcif.hpp"
#include "gemmi/model.hpp"

#include <rdkit/GraphMol/DetermineBonds/DetermineBonds.h>
#include <rdkit/GraphMol/FileParsers/FileParsers.h>

std::pair<std::string,std::string> SmallMoleculeCifToMMCif(const std::string &small_molecule_cif){

    std::string mmcif_string;
    gemmi::cif::Document doc = gemmi::cif::read_string(small_molecule_cif);
    gemmi::cif::Block block = doc.sole_block();

    gemmi::SmallStructure small = gemmi::make_small_structure_from_block(block);

    std::string resname = small.name;

    gemmi::Residue r;
    r.name = resname;

    r.label_seq = 1;

    std::map<std::string,int> atoms;
    std::map<std::string,int> name_disorder_group_map;

    int nAtAll = 0;
    int nAtNoH = 0;

    for (const auto& site : small.sites) {
        gemmi::Atom atom;
        auto orth = small.cell.orthogonalize(site.fract);
        atom.pos = orth;
        atom.element = site.element;

        std::string elname = std::string(site.element.name());
        std::transform(elname.begin(), elname.end(), elname.begin(), ::toupper);

        if(atoms.count(elname)==0){
            atoms[elname]  = 1;
        } else {
            atoms[elname] += 1;
        }
        atom.name = elname+std::to_string(atoms[elname]);

        nAtAll++;
        atom.serial = nAtAll;
        r.atoms.push_back(atom);
        if(elname!="H"){
            nAtNoH++;
        }
    }

    gemmi::Structure st2;

    gemmi::Model m("1");
    gemmi::Chain c("A");

    c.residues.push_back(r);
    m.chains.push_back(c);
    st2.models.push_back(m);

    st2.cell = small.cell;
    st2.name = small.name;

    st2.spacegroup_hm = small.spacegroup_hm;

    gemmi::cif::Document doc2 = gemmi::make_mmcif_document(st2);
    gemmi::cif::Table data = doc2.sole_block().find_mmcif_category("_atom_site.");

    for (auto d: data) {
        int auth_seq_id_pos = d.tab.find_column_position("auth_seq_id");
        d.value_at_unsafe(auth_seq_id_pos) = "1";
        int label_entity_id_pos = d.tab.find_column_position("label_entity_id");
        d.value_at_unsafe(label_entity_id_pos) = "1";
        int label_asym_id_pos = d.tab.find_column_position("label_asym_id");
        d.value_at_unsafe(label_asym_id_pos) = "A";
    }

    std::ostringstream s;
    gemmi::cif::write_cif_to_stream(s, doc2);

    mmcif_string = s.str();

    std::ostringstream xyz_output;
    std::ostringstream dict_output;

    xyz_output << nAtAll << "\n\n";

    dict_output << "global_\n";
    dict_output << "_lib_name         ?\n";
    dict_output << "_lib_version      ?\n";
    dict_output << "_lib_update       ?\n";
    dict_output << "# ------------------------------------------------\n";
    dict_output << "#\n";
    dict_output << "# ---   LIST OF MONOMERS ---\n";
    dict_output << "#\n";
    dict_output << "data_comp_list\n";
    dict_output << "loop_\n";
    dict_output << "_chem_comp.id\n";
    dict_output << "_chem_comp.three_letter_code\n";
    dict_output << "_chem_comp.name\n";
    dict_output << "_chem_comp.group\n";
    dict_output << "_chem_comp.number_atoms_all\n";
    dict_output << "_chem_comp.number_atoms_nh\n";
    dict_output << "_chem_comp.desc_level\n";
    dict_output << resname << "      " << resname << " 'UNKNOWN LIGAND                      ' non-polymer        " << nAtAll << " " <<  nAtNoH << " .\n";
    dict_output << "# ------------------------------------------------------\n";
    dict_output << "# ------------------------------------------------------\n";
    dict_output << "#\n";
    dict_output << "# --- DESCRIPTION OF MONOMERS ---\n";
    dict_output << "#\n";
    dict_output << "data_comp_" << resname << "\n";
    dict_output << "#\n";
    dict_output << "loop_\n";
    dict_output << "_chem_comp_atom.comp_id\n";
    dict_output << "_chem_comp_atom.atom_id\n";
    dict_output << "_chem_comp_atom.type_symbol\n";
    dict_output << "_chem_comp_atom.type_energy\n";
    dict_output << "_chem_comp_atom.charge\n";
    dict_output << "_chem_comp_atom.x\n";
    dict_output << "_chem_comp_atom.y\n";
    dict_output << "_chem_comp_atom.z\n";

    atoms.clear();
    std::map<int,std::string> atomMap;
    int iat = 0;
    for (const auto& site : small.sites) {
        gemmi::Atom atom;
        auto orth = small.cell.orthogonalize(site.fract);
        float x = orth.x;
        float y = orth.y;
        float z = orth.z;
        atom.pos = orth;
        atom.element = site.element;
        float charge = 0.0;//FIXME Small molecules have a signed char charge

        std::string elname = std::string(site.element.name());
        std::transform(elname.begin(), elname.end(), elname.begin(), ::toupper);

        if(atoms.count(elname)==0){
            atoms[elname]  = 1;
        } else {
            atoms[elname] += 1;
        }
        atom.name = elname+std::to_string(atoms[elname]);
        name_disorder_group_map[atom.name] = site.disorder_group;

        dict_output << resname << "           " << atom.name << " " << elname  << " " << elname << " " << charge << " " << x << " " << y << " " << z << "\n";
        xyz_output << elname  << " " << x << " " << y << " " << z << "\n";
        atomMap[iat] = atom.name;
        iat++;
    }

    dict_output << "loop_\n";
    dict_output << "_chem_comp_bond.comp_id\n";
    dict_output << "_chem_comp_bond.atom_id_1\n";
    dict_output << "_chem_comp_bond.atom_id_2\n";
    dict_output << "_chem_comp_bond.type\n";
    dict_output << "_chem_comp_bond.aromatic\n";
    dict_output << "_chem_comp_bond.value_dist\n";
    dict_output << "_chem_comp_bond.value_dist_esd\n";


    std::string aromaticFlag = "n";

    try {
        std::string xyz_string = xyz_output.str();

        std::unique_ptr<RDKit::RWMol> mol = RDKit::v2::FileParsers::MolFromXYZBlock(xyz_string);
        RDKit::determineConnectivity(*mol);

        RDKit::ROMol::BondIterator bondIter = mol->beginBonds();

        const RDKit::Conformer *conf=&(mol->getConformer(0));

        while(bondIter!=mol->endBonds()){
            std::string beginAtom =  atomMap[(*bondIter)->getBeginAtomIdx()];
            std::string endAtom =  atomMap[(*bondIter)->getEndAtomIdx()];
            if((name_disorder_group_map[beginAtom]==name_disorder_group_map[endAtom])||name_disorder_group_map[beginAtom]==0||name_disorder_group_map[endAtom]==0){
                const RDGeom::Point3D pos1 = conf->getAtomPos((*bondIter)->getBeginAtomIdx());
                const RDGeom::Point3D pos2 = conf->getAtomPos((*bondIter)->getEndAtomIdx());
                double bondLength = sqrt((pos1.x-pos2.x)*(pos1.x-pos2.x) + (pos1.y-pos2.y)*(pos1.y-pos2.y) + (pos1.z-pos2.z)*(pos1.z-pos2.z));
                std::string bondType;
                std::string aromaticFlag;
                bool isAromatic = mol->getAtomWithIdx((*bondIter)->getBeginAtomIdx())->getIsAromatic() && mol->getAtomWithIdx((*bondIter)->getEndAtomIdx())->getIsAromatic();
                bondType = "SINGLE";
                aromaticFlag = "n";
                dict_output << resname << "  " << "    " << beginAtom <<   " "  << endAtom  << " " << bondType  << " " << aromaticFlag << " " << bondLength << "  0.020\n";
            }
            bondIter++;

        }
    } catch(...) {
        // We will have no bonds.
    }

    dict_output << "# ------------------------------------------------------\n";

    std::string dict_string = dict_output.str();

    return std::pair<std::string,std::string>(mmcif_string,dict_string);
}

