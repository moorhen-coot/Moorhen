/*
   ligand-bonding-test.cc: Moorhen (WebCoot) Molecular Graphics Program
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

// Tests of ligand-bonding.hh on real structures, natively, against a native gemmi build:
//
//   cmake ../checkout/gemmi -DUSE_PYTHON=OFF -DBUILD_GEMMI_PROGRAM=OFF && make gemmi_cpp   (in a build directory)
//   g++ -O2 -std=c++17 -I../checkout/gemmi/include ligand-bonding-test.cc <build>/libgemmi_cpp.a -lz -o ligand-bonding-test
//   ./ligand-bonding-test ../baby-gru/tests/test_data
//
// Exit status: the number of failed checks.

#include "ligand-bonding.hh"

#include <gemmi/mmread_gz.hpp>
#include <gemmi/polyheur.hpp>

#include <cstdio>
#include <string>

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { failures++; std::fprintf(stderr, "FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond); } } while (0)

// Ligands read as Moorhen reads them (entity types added, not overwritten for a PDB file).
static std::vector<ligand_bonding::ligand_t> read(const std::string &dir, const std::string &name) {
    gemmi::Structure st = gemmi::read_structure_gz(dir + "/" + name);
    gemmi::add_entity_types(st, false);
    return ligand_bonding::ligand_bonding(st);
}

static const ligand_bonding::ligand_t *find(const std::vector<ligand_bonding::ligand_t> &ls, const std::string &cid) {
    for (const auto &l : ls) if (l.cid == cid) return &l;
    return nullptr;
}

int main(int argc, char **argv) {
    if (argc != 2) { std::fprintf(stderr, "usage: ligand-bonding-test test_data_dir\n"); return 2; }
    std::string dir = argv[1];

    // 5a3h: a cellulase with its covalent glycosyl-enzyme intermediate - 2-fluoro-cellobiose on Glu228 -
    // the second sugar bound through the first.
    auto a3h = read(dir, "5a3h.pdb");
    auto g2f = find(a3h, "/1/B/1(G2F)"), bgc = find(a3h, "/1/B/2(BGC)");
    CHECK(g2f && g2f->covalent && g2f->anchor == "/1/A/228(GLU)");
    CHECK(bgc && bgc->covalent && bgc->anchor == "/1/A/228(GLU)");

    // 5fjj: N-linked glycans, every sugar bound through its Asn; PEG, phosphate and ions free.
    auto fjj = read(dir, "5fjj.pdb");
    int sugars = 0, sugars_bound = 0, others_bound = 0;
    for (const auto &l : fjj) {
        bool sugar = l.res_name == "NAG" || l.res_name == "BMA" || l.res_name == "MAN";
        if (sugar) { sugars++; if (l.covalent) sugars_bound++; }
        else if (l.covalent) others_bound++;
    }
    CHECK(sugars > 100 && sugars_bound == sugars);
    CHECK(others_bound == 0);
    auto nag = find(fjj, "/1/E/1(NAG)");
    CHECK(nag && nag->anchor == "/1/A/62(ASN)");

    // 1df7, 4dfr: methotrexate, NADPH, glycerol, sulphate, ions - none bound.
    for (const char *name : {"1df7.pdb", "4dfr.pdb"}) {
        auto ls = read(dir, name);
        CHECK(!ls.empty());
        for (const auto &l : ls) CHECK(!l.covalent);
    }

    std::fprintf(stderr, failures ? "%d check(s) failed\n" : "all checks passed\n", failures);
    return failures;
}
