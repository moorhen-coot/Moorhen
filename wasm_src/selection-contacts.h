#pragma once

#include <string>
#include <utility>
#include <vector>

namespace mmdb { class Manager; }
namespace coot { class protein_geometry; }

// Contacts between two atom selections of one molecule, and the merging that brings selections of
// two molecules into one so that they can be analysed together (molecules_container_js:
// make_merged_molecule_json, delete_merged_molecule, get_h_bonds_between_json, get_salt_bridges_json).
//
// Selections are CIDs, several joined by "||". The second selection never includes atoms of the
// first, so "/*" as the second means "everything else". Nothing adds hydrogens: what is analysed is
// the molecule as it is.
//
// An atom in the JSON is
//   {"cid": "//A/45/NZ", "chainId": "A", "resNo": 45, "insCode": "", "resName": "LYS",
//    "atomName": "NZ", "altLoc": "", "xyz": [x, y, z]}
// and an error is {"error": "..."}.
namespace moorhen {

    // Copy the atoms of multi_cid in source into the first model of target. Each source chain goes
    // to a new chain of target, keeping its id unless target already uses it, in which case it gets
    // a free one. Residue numbers are kept. Returns (chain id in target, chain id in source) for
    // each chain added; empty if nothing was selected.
    std::vector<std::pair<std::string, std::string>>
    append_selection(mmdb::Manager *target, mmdb::Manager *source, const std::string &multi_cid);

    // Hydrogen bonds between the two selections:
    //   [{"donor": ATOM | null, "hydrogen": ATOM | null, "acceptor": ATOM, "distance": d,
    //     "donorSelection": 1 | 2}]
    // distance is H...A when the bond has its hydrogen, else D...A. Without McDonald & Thornton,
    // donors and acceptors come from the dictionaries and hydrogens are not needed (the molecule's own
    // hydrogens are left out: Coot's test would reject bonds through them); with it, they are needed.
    std::string h_bonds_between_json(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                                     const coot::protein_geometry &geom, int imol, bool mcdonald_and_thornton);

    // Salt bridges between the two selections: oppositely charged N / O / S atoms within
    // max_distance, once per pair of charged groups (the closest atom pair):
    //   [{"atom1": ATOM, "atom2": ATOM, "distance": d, "charge1": -1 | 1}]
    // atom1 from the first selection. Standard residues use a fixed table (Asp, Glu, Lys, Arg, His,
    // nucleotide phosphates); others use the dictionary formal charges, spread over the equivalent
    // terminal atoms of the group (both carboxylate oxygens, the phosphate oxygens).
    std::string salt_bridges_json(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                                  const coot::protein_geometry &geom, int imol, float max_distance);
}
