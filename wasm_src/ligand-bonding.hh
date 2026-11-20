/*
   ligand-bonding.hh: Moorhen (WebCoot) Molecular Graphics Program
   Copyright (C) 2026 University of York
   This library is free software: you can redistribute it and/or
   modify it under the terms of the GNU Lesser General Public License
   version 3, modified in accordance with the provisions of the
   license to address the requirements of UK law.
   You should have received a copy of the modified GNU Lesser General
   Public License along with this library.  If not, copies may be
   downloaded from http://www.ccp4.ac.uk/ccp4license.php
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Lesser General Public License for more details.
 */

/*
 * Which ligands are covalently bound to the polymer. A ligand here is any residue that is neither
 * polymer nor water (gemmi entity types NonPolymer and Branched): small molecules, sugars, ions.
 *
 * A ligand is bound if it is bonded to a polymer residue, or to a ligand that is - so every sugar of
 * an N-linked glycan is bound through the NAG on the Asn. Two residues are bonded if the file says so
 * (a covalent or disulphide LINK / _struct_conn), or if two of their atoms are within bonding
 * distance: the sum of their covalent radii plus a tolerance. Hydrogens and metals are left out of
 * the distances (a metal's coordination is not what "bound ligand" means; a LINK can still say so),
 * and so are contacts with symmetry copies (crystal packing).
 *
 * Plain gemmi (no emscripten): wrapped for JS in gemmi-wrappers-helpers.h, tested natively in
 * ligand-bonding-test.cc.
 */

#ifndef MOORHEN_LIGAND_BONDING_HH
#define MOORHEN_LIGAND_BONDING_HH

#include <gemmi/model.hpp>
#include <gemmi/neighbor.hpp>

#include <map>
#include <string>
#include <vector>

namespace ligand_bonding {

    //! How far beyond the sum of two atoms' covalent radii they still count as bonded, A.
    constexpr double bond_tolerance = 0.4;

    struct ligand_t {
        //! as Moorhen names a residue: /model/chain/seqid(NAME)
        std::string cid;
        std::string res_name, chain_name, res_num, model_name;
        //! covalently bound to the polymer, directly or through other ligands
        bool covalent = false;
        //! the polymer residue it is bound to (through other ligands, the one their chain is bound to); "" if none
        std::string anchor;
    };

    inline std::string residue_cid(const gemmi::Model &model, const gemmi::Chain &chain, const gemmi::Residue &residue) {
        return "/" + std::to_string(model.num) + "/" + chain.name + "/" + residue.seqid.str() + "(" + residue.name + ")";
    }

    inline bool is_ligand(const gemmi::Residue &residue) {
        return !residue.is_water() &&
               (residue.entity_type == gemmi::EntityType::NonPolymer || residue.entity_type == gemmi::EntityType::Branched);
    }

    //! Every ligand of every model, in file order, and whether it is bound. Entity types must be set
    //! (gemmi::add_entity_types / setup_entities), as Moorhen does on reading a structure.
    inline std::vector<ligand_t> ligand_bonding(const gemmi::Structure &structure) {
        std::vector<ligand_t> out;
        gemmi::Structure st = structure;  // NeighborSearch indexes a mutable model
        for (gemmi::Model &model : st.models) {
            // The model's ligands, and where each residue is.
            std::vector<const gemmi::Residue *> ligands;
            std::vector<const gemmi::Chain *> ligand_chain;
            std::map<const gemmi::Residue *, int> index;
            for (const gemmi::Chain &chain : model.chains)
                for (const gemmi::Residue &residue : chain.residues)
                    if (is_ligand(residue)) {
                        index[&residue] = int(ligands.size());
                        ligands.push_back(&residue);
                        ligand_chain.push_back(&chain);
                    }
            if (ligands.empty()) continue;
            std::map<const gemmi::Residue *, const gemmi::Chain *> chain_of;
            for (const gemmi::Chain &chain : model.chains)
                for (const gemmi::Residue &residue : chain.residues) chain_of[&residue] = &chain;

            std::vector<std::string> anchor(ligands.size());
            std::vector<std::vector<int>> linked(ligands.size());
            // A bond from ligand i to `other`: a polymer residue anchors it, another ligand links them.
            auto bond = [&](int i, const gemmi::Residue *other) {
                if (other == ligands[i]) return;
                auto it = index.find(other);
                if (it != index.end()) {
                    linked[i].push_back(it->second);
                    linked[it->second].push_back(i);
                } else if (!other->is_water() && anchor[i].empty()) {
                    anchor[i] = residue_cid(model, *chain_of[other], *other);
                }
            };

            // Bonds the file states.
            for (const gemmi::Connection &connection : st.connections) {
                if (connection.type != gemmi::Connection::Covale && connection.type != gemmi::Connection::Disulf) continue;
                gemmi::CRA a = model.find_cra(connection.partner1, true), b = model.find_cra(connection.partner2, true);
                if (!a.residue || !b.residue) continue;
                auto ia = index.find(a.residue), ib = index.find(b.residue);
                if (ia != index.end()) bond(ia->second, b.residue);
                if (ib != index.end()) bond(ib->second, a.residue);
            }

            // Bonds by distance.
            gemmi::NeighborSearch search(model, st.cell, 5);
            search.populate(false);
            for (size_t i = 0; i < ligands.size(); i++) {
                for (const gemmi::Atom &atom : ligands[i]->atoms) {
                    if (atom.is_hydrogen() || atom.element.is_metal()) continue;
                    for (gemmi::NeighborSearch::Mark *mark : search.find_atoms(atom.pos, atom.altloc, 0, 3.2)) {
                        if (mark->image_idx != 0) continue;
                        gemmi::CRA other = mark->to_cra(model);
                        if (!other.atom || other.residue == ligands[i]) continue;
                        if (other.atom->is_hydrogen() || other.atom->element.is_metal()) continue;
                        double limit = atom.element.covalent_r() + other.atom->element.covalent_r() + bond_tolerance;
                        if (atom.pos.dist(other.atom->pos) <= limit) bond(int(i), other.residue);
                    }
                }
            }

            // Bound through other ligands: each anchor passed along the links, nearest first.
            std::vector<int> queue;
            for (size_t i = 0; i < ligands.size(); i++) if (!anchor[i].empty()) queue.push_back(int(i));
            for (size_t q = 0; q < queue.size(); q++)
                for (int j : linked[queue[q]])
                    if (anchor[j].empty()) { anchor[j] = anchor[queue[q]]; queue.push_back(j); }

            for (size_t i = 0; i < ligands.size(); i++) {
                ligand_t l;
                l.cid = residue_cid(model, *ligand_chain[i], *ligands[i]);
                l.res_name = ligands[i]->name;
                l.chain_name = ligand_chain[i]->name;
                l.res_num = ligands[i]->seqid.str();
                l.model_name = std::to_string(model.num);
                l.covalent = !anchor[i].empty();
                l.anchor = anchor[i];
                out.push_back(l);
            }
        }
        return out;
    }
}

#endif // MOORHEN_LIGAND_BONDING_HH
