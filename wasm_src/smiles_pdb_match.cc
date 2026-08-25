#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include <GraphMol/ROMol.h>
#include <GraphMol/RDKitBase.h>

#include <GraphMol/FileParsers/FileParsers.h>
#include <GraphMol/MolOps.h>
#include <GraphMol/SmilesParse/SmilesParse.h>
#include <GraphMol/SmilesParse/SmilesWrite.h>

#include <GraphMol/Substruct/SubstructMatch.h>
#include <GraphMol/QueryOps.h>

std::string smilesPdbMatch(const std::string &smiles, const std::string &pdbBlock){

    /*
        Parses the chemically-correct SMILES (target_mol).
        Parses the coordinate-only PDB (pdb_mol).
        Relaxes bond-type matching on the PDB molecule.
        Uses a substructure match to obtain a mapping.
        Renumber the SMILES molecule into PDB atom order and returns the renumbered SMILES.
    */
    std::unique_ptr<RDKit::ROMol> targetMol(RDKit::SmilesToMol(smiles));

    std::unique_ptr<RDKit::ROMol> pdbMol(RDKit::v2::FileParsers::MolFromPDBBlock(pdbBlock));

    if (!targetMol || !pdbMol) {
        return "";
    }

    std::unique_ptr<RDKit::ROMol> pdbNoHs(RDKit::MolOps::removeHs(*pdbMol));

    if (targetMol->getNumHeavyAtoms() != pdbNoHs->getNumHeavyAtoms()) {
        return "";
    }

    RDKit::MolOps::AdjustQueryParameters params;
    params.makeBondsGeneric = true;

    std::unique_ptr<RDKit::ROMol> pdbGenericBonds(RDKit::MolOps::adjustQueryProperties(*pdbNoHs, &params));

    RDKit::SubstructMatchParameters matchParams;
    matchParams.uniquify = true;
    matchParams.useChirality = false;

    auto matches = RDKit::SubstructMatch(*targetMol, *pdbGenericBonds, matchParams);

    if (matches.size() != 1) {
        std::cerr << "Potential problem matching atoms\n";
        return "";
    }

    const auto &match = matches.front();

    //FIXME - This might be too conservative when there is molecular symmetry.
    if (match.size() != targetMol->getNumHeavyAtoms()) {
        return "";
    }

    std::vector<unsigned int> newOrder(match.size());

    for (const auto &p : match) {
        unsigned int queryAtomIdx = p.first;
        unsigned int targetAtomIdx = p.second;

        newOrder[queryAtomIdx] = targetAtomIdx;
    }

    std::unique_ptr<RDKit::ROMol> permutedMol(RDKit::MolOps::renumberAtoms(*targetMol, newOrder));

    return RDKit::MolToSmiles(*permutedMol);
}

/*
Below lets you use this a standalone command line version.

Uncomment the main program below.

Then compile with:

em++ -fwasm-exceptions -std=c++20 ~/smiles_pdb_match.cc -I ../install/include/rdkit/ -I ../install/include/ -L ../install/lib/ -lRDKitSmilesParse -lRDKitFileParsers -lRDKitSubstructMatch -lRDKitGraphMol -lRDKitRDGeneral -lRDKitGenericGroups -lRDKitRDGeometryLib -lRDKitDataStructs -lboost_serialization

(
Or if you have Node 24+, you can even do:

em++ -m64 -fwasm-exceptions -std=c++20 ~/smiles_pdb_match.cc -I ../install64/include/rdkit/ -I ../install64/include/ -L ../install64/lib/ -lRDKitSmilesParse -lRDKitFileParsers -lRDKitSubstructMatch -lRDKitGraphMol -lRDKitRDGeneral -lRDKitGenericGroups -lRDKitRDGeometryLib -lRDKitDataStructs -lboost_serialization
)

and run with:

node a.out.js

*/

/*
int main(int argc, char *argv[]){

    std::string smiles = R"(C[C@H]1C[C@]2([C@H]([C@H]1O)[C@@H](C(=C)CC[C@H]3[C@H](C3(C)C)/C=C(/C2=O)\C)O)O)";

    std::string pdbBlock = R""""(HETATM 4824  C1  LTR X   1       4.361  -2.998  -0.206  1.00  0.50
HETATM 4825  C2  LTR X   1       5.158  -2.190  -0.890  1.00  0.50
HETATM 4826  C3  LTR X   1       4.584  -1.050  -1.698  1.00  0.50
HETATM 4827  C4  LTR X   1       4.491   0.278  -0.929  1.00  0.50
HETATM 4828  C5  LTR X   1       3.402   0.268   0.120  1.00  0.50
HETATM 4829  C6  LTR X   1       3.571   0.775   1.554  1.00  0.50
HETATM 4830  C7  LTR X   1       4.823   1.368   2.071  1.00  0.50
HETATM 4831  C8  LTR X   1       6.039   0.702   2.277  1.00  0.50
HETATM 4832  C9  LTR X   1       7.160   1.535   2.857  1.00  0.50
HETATM 4833  C10 LTR X   1       6.280  -0.663   2.028  1.00  0.50
HETATM 4834  O1  LTR X   1       5.449  -1.461   2.390  1.00  0.50
HETATM 4835  C11 LTR X   1       7.535  -1.192   1.303  1.00  0.50
HETATM 4836  C12 LTR X   1       8.642  -1.569   2.317  1.00  0.50
HETATM 4837  C13 LTR X   1       9.193  -2.948   1.902  1.00  0.50
HETATM 4838  C14 LTR X   1      10.686  -3.100   2.121  1.00  0.50
HETATM 4839  C15 LTR X   1       8.729  -3.119   0.444  1.00  0.50
HETATM 4840  C16 LTR X   1       7.320  -2.518   0.483  1.00  0.50
HETATM 4841  C17 LTR X   1       6.661  -2.448  -0.914  1.00  0.50
HETATM 4842  C18 LTR X   1       2.665   1.507   0.568  1.00  0.50
HETATM 4843  C19 LTR X   1       1.170   1.358   0.749  1.00  0.50
HETATM 4844  C20 LTR X   1       3.069   2.889   0.098  1.00  0.50
HETATM 4845  O2  LTR X   1       8.055  -0.178   0.416  1.00  0.50
HETATM 4846  H13 LTR X   1       7.951   0.587   0.757  1.00  0.50
HETATM 4847  O3  LTR X   1       9.585  -2.454  -0.478  1.00  0.50
HETATM 4848  H21 LTR X   1       9.978  -3.032  -0.960  1.00  0.50
HETATM 4849  O4  LTR X   1       7.402  -1.518  -1.745  1.00  0.50
HETATM 4850  H24 LTR X   1       7.978  -1.909  -2.227  1.00  0.50
END
)"""";
    
    std::string permSmiles = smilesPdbMatch(smiles, pdbBlock);

    std::cout << permSmiles << std::endl;

    return 0;
}
*/
