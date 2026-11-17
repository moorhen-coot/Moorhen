#include "selection-contacts.h"

#include <cctype>
#include <cmath>
#include <map>
#include <set>
#include <string>
#include <tuple>
#include <vector>

#include "mmdb2/mmdb_manager.h"
#include "json/json.h"
#include "geometry/protein-geometry.hh"
#include "coot-utils/coot-coord-utils.hh"
#include "coot-utils/coot-h-bonds.hh"

namespace {

    std::string trim(const std::string &s) {
        const size_t b = s.find_first_not_of(' ');
        if (b == std::string::npos) return "";
        return s.substr(b, s.find_last_not_of(' ') - b + 1);
    }

    std::string upper(std::string s) {
        for (auto &c : s) c = std::toupper(static_cast<unsigned char>(c));
        return s;
    }

    std::string to_string(const Json::Value &root) {
        Json::StreamWriterBuilder builder;
        builder["indentation"] = "";
        return Json::writeString(builder, root);
    }

    std::vector<std::string> split_cids(const std::string &multi_cid) {
        std::vector<std::string> cids;
        size_t start = 0;
        while (true) {
            const size_t end = multi_cid.find("||", start);
            const std::string cid = trim(multi_cid.substr(start, end == std::string::npos ? std::string::npos : end - start));
            if (!cid.empty()) cids.push_back(cid);
            if (end == std::string::npos) break;
            start = end + 2;
        }
        return cids;
    }

    // Add (key SKEY_OR) or remove (SKEY_CLR) the atoms of multi_cid to/from a selection
    void select_atoms(mmdb::Manager *mol, int sel, const std::string &multi_cid, mmdb::SELECTION_KEY key) {
        for (const auto &cid : split_cids(multi_cid)) mol->Select(sel, mmdb::STYPE_ATOM, cid.c_str(), key);
    }

    std::set<mmdb::Atom *> selected_atoms(mmdb::Manager *mol, int sel) {
        mmdb::PPAtom atoms = nullptr;
        int n = 0;
        mol->GetSelIndex(sel, atoms, n);
        return std::set<mmdb::Atom *>(atoms, atoms + n);
    }

    // The two selections, the second without the atoms of the first
    struct selections_t {
        mmdb::Manager *mol;
        int sel_1, sel_2;
        std::set<mmdb::Atom *> atoms_1, atoms_2;
        selections_t(mmdb::Manager *mol_in, const std::string &cid_1, const std::string &cid_2) : mol(mol_in) {
            sel_1 = mol->NewSelection();
            select_atoms(mol, sel_1, cid_1, mmdb::SKEY_OR);
            sel_2 = mol->NewSelection();
            select_atoms(mol, sel_2, cid_2, mmdb::SKEY_OR);
            select_atoms(mol, sel_2, cid_1, mmdb::SKEY_CLR);
            atoms_1 = selected_atoms(mol, sel_1);
            atoms_2 = selected_atoms(mol, sel_2);
        }
        ~selections_t() {
            mol->DeleteSelection(sel_1);
            mol->DeleteSelection(sel_2);
        }
    };

    std::string atom_cid(mmdb::Atom *at) {
        std::string cid = std::string("//") + at->GetChainID() + "/" + std::to_string(at->GetSeqNum());
        const std::string ins = trim(at->GetInsCode());
        if (!ins.empty()) cid += "." + ins;
        cid += "/" + trim(at->name);
        const std::string alt = trim(at->altLoc);
        if (!alt.empty()) cid += ":" + alt;
        return cid;
    }

    Json::Value atom_json(mmdb::Atom *at) {
        if (!at) return Json::Value(Json::nullValue);
        Json::Value j;
        j["cid"] = atom_cid(at);
        j["chainId"] = at->GetChainID();
        j["resNo"] = at->GetSeqNum();
        j["insCode"] = trim(at->GetInsCode());
        j["resName"] = trim(at->GetResName());
        j["atomName"] = trim(at->name);
        j["altLoc"] = trim(at->altLoc);
        Json::Value xyz(Json::arrayValue);
        xyz.append(at->x);
        xyz.append(at->y);
        xyz.append(at->z);
        j["xyz"] = xyz;
        return j;
    }

    double distance(mmdb::Atom *a, mmdb::Atom *b) {
        const double dx = a->x - b->x, dy = a->y - b->y, dz = a->z - b->z;
        return std::sqrt(dx * dx + dy * dy + dz * dz);
    }

    std::vector<mmdb::Atom *> residue_atoms(mmdb::Residue *residue) {
        std::vector<mmdb::Atom *> v;
        mmdb::PPAtom atoms = nullptr;
        int n = 0;
        residue->GetAtomTable(atoms, n);
        for (int i = 0; i < n; i++)
            if (atoms[i] && !atoms[i]->isTer()) v.push_back(atoms[i]);
        return v;
    }

    // ---------------------------------------------------------------- charges

    struct charge_t {
        int sign;
        std::string group; // atoms of one charged group share it, so a pair of groups is reported once
    };
    using charges_t = std::map<std::string, charge_t>; // by atom name

    const std::set<std::string> STANDARD_RESIDUES = {
        "ALA", "ARG", "ASN", "ASP", "CYS", "GLN", "GLU", "GLY", "HIS", "ILE", "LEU", "LYS", "MET", "MSE",
        "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL", "HOH", "A", "C", "G", "U", "DA", "DC", "DG", "DT"};

    charges_t standard_charges(const std::string &res_name) {
        static const std::map<std::string, charges_t> table = {
            {"ASP", {{"OD1", {-1, "CG"}}, {"OD2", {-1, "CG"}}}},
            {"GLU", {{"OE1", {-1, "CD"}}, {"OE2", {-1, "CD"}}}},
            {"LYS", {{"NZ", {1, "NZ"}}}},
            {"ARG", {{"NE", {1, "CZ"}}, {"NH1", {1, "CZ"}}, {"NH2", {1, "CZ"}}}},
            {"HIS", {{"ND1", {1, "ring"}}, {"NE2", {1, "ring"}}}},
        };
        static const charges_t phosphate = {
            {"OP1", {-1, "P"}}, {"OP2", {-1, "P"}}, {"O1P", {-1, "P"}}, {"O2P", {-1, "P"}}};
        static const std::set<std::string> nucleotides = {"A", "C", "G", "U", "DA", "DC", "DG", "DT"};
        if (nucleotides.count(res_name)) return phosphate;
        auto it = table.find(res_name);
        return it == table.end() ? charges_t() : it->second;
    }

    bool chargeable_element(const std::string &element) {
        return element == "N" || element == "O" || element == "S";
    }

    // Formal charges from the dictionary, spread from a charged atom to the uncharged terminal atoms
    // of the same element on the same centre (the other carboxylate / phosphate oxygens, the other
    // amidine nitrogen)
    charges_t dictionary_charges(const std::string &res_name, const coot::protein_geometry &geom, int imol) {
        charges_t charges;
        const auto p = geom.get_monomer_restraints_at_least_minimal(res_name, imol);
        if (!p.first) return charges;
        const auto &restraints = p.second;

        std::map<std::string, std::string> element;
        std::map<std::string, int> formal;
        for (const auto &a : restraints.atom_info) {
            const std::string name = trim(a.atom_id);
            element[name] = upper(trim(a.type_symbol));
            if (a.formal_charge.first && a.formal_charge.second != 0) formal[name] = a.formal_charge.second;
        }
        std::map<std::string, std::vector<std::string>> bonded;
        for (const auto &b : restraints.bond_restraint) {
            const std::string a1 = trim(b.atom_id_1()), a2 = trim(b.atom_id_2());
            bonded[a1].push_back(a2);
            bonded[a2].push_back(a1);
        }
        auto is_hydrogen = [&] (const std::string &name) { return element[name] == "H" || element[name] == "D"; };
        auto heavy_degree = [&] (const std::string &name) {
            int n = 0;
            for (const auto &other : bonded[name]) if (!is_hydrogen(other)) n++;
            return n;
        };

        // A formal charge bonded to the opposite one is a charge-separated but neutral group (nitro
        // N+ with O-, N-oxide, azide): neither a cation nor an anion, so no salt bridge from it
        auto bonded_to_opposite_charge = [&] (const std::string &name, int q) {
            for (const auto &other : bonded[name]) {
                const auto it = formal.find(other);
                if (it != formal.end() && (it->second > 0) != (q > 0)) return true;
            }
            return false;
        };

        for (const auto &[name, q] : formal) {
            if (!chargeable_element(element[name])) continue;
            if (bonded_to_opposite_charge(name, q)) continue;
            const int sign = q > 0 ? 1 : -1;
            std::string group = name;
            for (const auto &centre : bonded[name]) {
                if (is_hydrogen(centre)) continue;
                for (const auto &other : bonded[centre]) {
                    if (other == name || element[other] != element[name] || formal.count(other)) continue;
                    if (heavy_degree(other) != 1) continue;
                    charges[other] = {sign, centre};
                    group = centre;
                }
            }
            charges[name] = {sign, group};
        }
        return charges;
    }
}

// ---------------------------------------------------------------- merging

std::vector<std::pair<std::string, std::string>>
moorhen::append_selection(mmdb::Manager *target, mmdb::Manager *source, const std::string &multi_cid) {
    std::vector<std::pair<std::string, std::string>> added;
    mmdb::Model *model = target->GetModel(1);
    if (!model) {
        model = new mmdb::Model;
        target->AddModel(model);
    }
    std::set<std::string> used;
    for (int ic = 0; ic < model->GetNumberOfChains(); ic++) used.insert(model->GetChain(ic)->GetChainID());
    auto free_chain_id = [&used] (const std::string &wanted) {
        if (!used.count(wanted)) return wanted;
        const std::string candidates = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (char ch : candidates)
            if (!used.count(std::string(1, ch))) return std::string(1, ch);
        for (int i = 1;; i++)
            if (!used.count("X" + std::to_string(i))) return "X" + std::to_string(i);
    };

    const int sel = source->NewSelection();
    select_atoms(source, sel, multi_cid, mmdb::SKEY_OR);
    mmdb::Manager *fragment = coot::util::create_mmdbmanager_from_atom_selection(source, sel);
    source->DeleteSelection(sel);
    if (!fragment) return added;

    mmdb::Model *fragment_model = fragment->GetModel(1);
    for (int ic = 0; fragment_model && ic < fragment_model->GetNumberOfChains(); ic++) {
        mmdb::Chain *source_chain = fragment_model->GetChain(ic);
        if (!source_chain || source_chain->GetNumberOfResidues() == 0) continue;
        const std::string source_id = source_chain->GetChainID();
        const std::string id = free_chain_id(source_id);
        used.insert(id);
        mmdb::Chain *chain = new mmdb::Chain;
        chain->SetChainID(id.c_str());
        model->AddChain(chain);
        for (int ir = 0; ir < source_chain->GetNumberOfResidues(); ir++) {
            mmdb::Residue *residue = source_chain->GetResidue(ir);
            if (!residue || residue->GetNumberOfAtoms() == 0) continue;
            mmdb::Residue *copy = coot::util::deep_copy_this_residue(residue);
            if (copy) chain->AddResidue(copy);
        }
        added.push_back({id, source_id});
    }
    delete fragment;
    target->FinishStructEdit();
    target->PDBCleanup(mmdb::PDBCLEAN_SERIAL | mmdb::PDBCLEAN_INDEX);
    return added;
}

// ---------------------------------------------------------------- hydrogen bonds

namespace {
    bool has_hydrogens(mmdb::Manager *mol) {
        mmdb::Atom **atoms = nullptr;
        int n_atoms = 0;
        mol->GetAtomTable(atoms, n_atoms);
        for (int i = 0; i < n_atoms; i++) {
            if (!atoms[i]) continue;
            const std::string element = trim(atoms[i]->element);
            if (element == "H" || element == "D") return true;
        }
        return false;
    }

    // A copy of the molecule without its hydrogens (and deuteriums), same chains, residues and atom
    // names, so that atom cids from it name the same atoms in the original. Delete it after use.
    mmdb::Manager *copy_without_hydrogens(mmdb::Manager *mol) {
        const int sel = mol->NewSelection();
        mol->SelectAtoms(sel, 0, "*", mmdb::ANY_RES, "*", mmdb::ANY_RES, "*", "*", "*", "*", "*", mmdb::SKEY_NEW);
        mol->SelectAtoms(sel, 0, "*", mmdb::ANY_RES, "*", mmdb::ANY_RES, "*", "*", "*", "H,D", "*", mmdb::SKEY_CLR);
        mmdb::Manager *copy = coot::util::create_mmdbmanager_from_atom_selection(mol, sel);
        mol->DeleteSelection(sel);
        return copy;
    }

    void h_bonds_between(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                         const coot::protein_geometry &geom, int imol, bool mcdonald_and_thornton, Json::Value &bonds_json);
}

std::string moorhen::h_bonds_between_json(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                                          const coot::protein_geometry &geom, int imol, bool mcdonald_and_thornton) {
    Json::Value bonds_json(Json::arrayValue);
    if (!mol) return to_string(bonds_json);
    // Coot's plain test (not McDonald & Thornton) rejects a bond when a neighbour of the donor makes a
    // small angle with the acceptor, and the donor's own hydrogen, pointing at the acceptor, does: with
    // explicit hydrogens it loses good bonds (9 -> 5 for 5a3h's BGC). It is run on a copy without them.
    // McDonald & Thornton needs the hydrogens, so it keeps them.
    mmdb::Manager *h_free = (!mcdonald_and_thornton && has_hydrogens(mol)) ? copy_without_hydrogens(mol) : nullptr;
    h_bonds_between(h_free ? h_free : mol, cid_1, cid_2, geom, imol, mcdonald_and_thornton, bonds_json);
    delete h_free;
    return to_string(bonds_json);
}

namespace {
// The bonds between two selections of mol, appended to bonds_json (see h_bonds_between_json)
void h_bonds_between(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                     const coot::protein_geometry &geom, int imol, bool mcdonald_and_thornton,
                     Json::Value &bonds_json) {
    const selections_t s(mol, cid_1, cid_2);
    if (s.atoms_1.empty() || s.atoms_2.empty()) return;

    coot::h_bonds hb;
    const std::vector<coot::h_bond> bonds = mcdonald_and_thornton
        ? hb.get_mcdonald_and_thornton(s.sel_1, s.sel_2, mol, geom, imol)
        : hb.get(s.sel_1, s.sel_2, mol, geom, imol);

    std::set<std::tuple<mmdb::Atom *, mmdb::Atom *, mmdb::Atom *>> seen;
    for (const auto &bond : bonds) {
        if (!bond.acceptor) continue;
        // The donor side: its heavy atom, or its hydrogen when that is all the bond has
        mmdb::Atom *donor_side = bond.donor ? bond.donor : bond.hb_hydrogen;
        if (!donor_side) continue;
        const bool donor_in_1 = s.atoms_1.count(donor_side) > 0;
        const bool acceptor_in_1 = s.atoms_1.count(bond.acceptor) > 0;
        // Only bonds across the two selections
        if (donor_in_1 == acceptor_in_1) continue;
        if (!donor_in_1 && !s.atoms_2.count(donor_side)) continue;
        if (donor_in_1 && !s.atoms_2.count(bond.acceptor)) continue;
        if (!seen.insert({bond.donor, bond.hb_hydrogen, bond.acceptor}).second) continue;

        Json::Value j;
        j["donor"] = atom_json(bond.donor);
        j["hydrogen"] = atom_json(bond.hb_hydrogen);
        j["acceptor"] = atom_json(bond.acceptor);
        j["distance"] = bond.hb_hydrogen ? distance(bond.hb_hydrogen, bond.acceptor) : distance(bond.donor, bond.acceptor);
        j["donorSelection"] = donor_in_1 ? 1 : 2;
        bonds_json.append(j);
    }
}
}

// ---------------------------------------------------------------- salt bridges

std::string moorhen::salt_bridges_json(mmdb::Manager *mol, const std::string &cid_1, const std::string &cid_2,
                                       const coot::protein_geometry &geom, int imol, float max_distance) {
    Json::Value bridges_json(Json::arrayValue);
    if (!mol) return to_string(bridges_json);
    const selections_t s(mol, cid_1, cid_2);

    struct charged_atom_t { mmdb::Atom *atom; charge_t charge; };
    std::map<std::string, charges_t> cache;
    auto charged_atoms = [&] (const std::set<mmdb::Atom *> &atoms) {
        std::vector<charged_atom_t> v;
        for (mmdb::Atom *at : atoms) {
            const std::string res_name = upper(trim(at->GetResName()));
            auto it = cache.find(res_name);
            if (it == cache.end()) {
                charges_t charges = STANDARD_RESIDUES.count(res_name) ? standard_charges(res_name)
                                                                      : dictionary_charges(res_name, geom, imol);
                it = cache.emplace(res_name, charges).first;
            }
            auto c = it->second.find(trim(at->name));
            if (c != it->second.end()) v.push_back({at, c->second});
        }
        return v;
    };
    const std::vector<charged_atom_t> charged_1 = charged_atoms(s.atoms_1);
    const std::vector<charged_atom_t> charged_2 = charged_atoms(s.atoms_2);

    auto group_key = [] (const charged_atom_t &c) {
        mmdb::Atom *at = c.atom;
        return std::string(at->GetChainID()) + "/" + std::to_string(at->GetSeqNum()) + trim(at->GetInsCode()) + "/" + c.charge.group;
    };
    // The closest atom pair of each pair of groups
    std::map<std::string, std::tuple<double, mmdb::Atom *, mmdb::Atom *, int>> closest;
    for (const auto &a : charged_1) {
        for (const auto &b : charged_2) {
            if (a.charge.sign == b.charge.sign) continue;
            const double d = distance(a.atom, b.atom);
            if (d > max_distance) continue;
            const std::string key = group_key(a) + "|" + group_key(b);
            auto it = closest.find(key);
            if (it == closest.end() || d < std::get<0>(it->second)) closest[key] = {d, a.atom, b.atom, a.charge.sign};
        }
    }
    for (const auto &[key, v] : closest) {
        const auto &[d, atom_1, atom_2, sign] = v;
        Json::Value j;
        j["atom1"] = atom_json(atom_1);
        j["atom2"] = atom_json(atom_2);
        j["distance"] = d;
        j["charge1"] = sign;
        bridges_json.append(j);
    }
    return to_string(bridges_json);
}
