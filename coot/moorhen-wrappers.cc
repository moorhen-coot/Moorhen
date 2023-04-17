/*
 * Copyright 2013 The Emscripten Authors.  All rights reserved.
 * Emscripten is available under two separate licenses, the MIT license and the
 * University of Illinois/NCSA Open Source License.  Both these licenses can be
 * found in the LICENSE file.
 */

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

#include "rdkit/GraphMol/SmilesParse/SmilesParse.h"
#include "rdkit/GraphMol/FileParsers/MolSupplier.h"
#include "rdkit/GraphMol/FileParsers/MolWriters.h"
#include "rdkit/GraphMol/FileParsers/FileParsers.h"
#include "rdkit/GraphMol/DistGeomHelpers/Embedder.h"
#include "rdkit/GraphMol/ROMol.h"
#include "rdkit/GraphMol/RWMol.h"
#include "rdkit/GraphMol/MolOps.h"
#include "rdkit/ForceField/ForceField.h"
#include "rdkit/GraphMol/ForceFieldHelpers/UFF/AtomTyper.h"
#include "rdkit/GraphMol/ForceFieldHelpers/UFF/Builder.h"
#include "rdkit/GraphMol/AtomIterators.h"
#include "rdkit/GraphMol/BondIterators.h"
#include "rdkit/GraphMol/Conformer.h"
#include "rdkit/GraphMol/MonomerInfo.h"
#include "rdkit/GraphMol/SanitException.h"
#include "rdkit/GraphMol/PeriodicTable.h"

#include "geometry/residue-and-atom-specs.hh"
#include "ligand/chi-angles.hh"
#include "ligand/primitive-chi-angles.hh"
#include "ligand/rotamer.hh"
#include "api/interfaces.hh"
#include "api/molecules_container.hh"
#include "api/validation-information.hh"
#include "coot-utils/g_triangle.hh"
#include "coot-utils/vertex.hh"

#include "mmdb_manager.h"
#include "clipper/core/ramachandran.h"
#include "clipper/clipper-ccp4.h"

#include "cartesian.h"
#include "geomutil.h"
#include "matrix.h"

using namespace emscripten;

struct RamachandranInfo {
    std::string chainId;
    int seqNum;
    std::string insCode;
    std::string restype;
    double phi;
    double psi;
    bool isOutlier;
    bool is_pre_pro;
};

struct ResiduePropertyInfo {
    std::string chainId;
    int seqNum;
    std::string insCode;
    std::string restype;
    double property;
};

std::map<std::string,std::vector<coot::simple_rotamer> > getRotamersMap(){

    std::map<std::string,std::vector<coot::simple_rotamer> > all_rots;

    std::vector<std::string> rotamerAcids = {"VAL","PRO","SER","THR","LEU","ILE","CYS","ASP","GLU","ASN","GLN","ARG","LYS","MET","MSE","HIS","PHE","TYR","TRP"};

    coot::rotamer rot(0);

    for(unsigned ia=0;ia<rotamerAcids.size();ia++){
        std::vector<coot::simple_rotamer> rots =  rot.get_rotamers(rotamerAcids[ia], 0.001);
        all_rots[rotamerAcids[ia]] = rots;
    }

    return all_rots;
}

/*
//Next 2 are test functions.
void TakeStringIntPairVector(const std::vector<std::pair<std::string, unsigned int> > &theVec){
    for(auto el : theVec){
        std::cout << el.first << " " << el.second << std::endl;
    }
}

void TakeColourMap(const std::map<unsigned int, std::array<float, 3>> &theMap){
    for(auto el : theMap){
        std::cout << el.first << " " << el.second[0] << " " << el.second[1] << " " << el.second[2] << std::endl;
    }
}
*/

std::string writeCIF(RDKit::RWMol *mol, const std::string &resname="UNL",  int confId=0){
  RDKit::AtomMonomerInfo *info = mol->getAtomWithIdx(0)->getMonomerInfo();
  std::map<std::string,int> elemMap;
  std::map<int,std::string> atomMap;

    std::ostringstream output;
    output << "global_\n";
    output << "_lib_name         ?\n";
    output << "_lib_version      ?\n";
    output << "_lib_update       ?\n";
    output << "# ------------------------------------------------\n";
    output << "#\n";
    output << "# ---   LIST OF MONOMERS ---\n";
    output << "#\n";
    output << "data_comp_list\n";
    output << "loop_\n";
    output << "_chem_comp.id\n";
    output << "_chem_comp.three_letter_code\n";
    output << "_chem_comp.name\n";
    output << "_chem_comp.group\n";
    output << "_chem_comp.number_atoms_all\n";
    output << "_chem_comp.number_atoms_nh\n";
    output << "_chem_comp.desc_level\n";
    int nAtAll = 0;
    int nAtNoH = 0;
    RDKit::ROMol::AtomIterator atomIter = mol->beginAtoms();
    while(atomIter!=mol->endAtoms()){
      std::string symbol = (*atomIter)->getSymbol();
      nAtAll++;
      if(symbol!="H"){
        nAtNoH++;
      }
      atomIter++;
    }
    output << resname << "      " << resname << " 'UNKNOWN LIGAND                      ' non-polymer        " << nAtAll << " " <<  nAtNoH << " .\n";
    output << "# ------------------------------------------------------\n";
    output << "# ------------------------------------------------------\n";
    output << "#\n";
    output << "# --- DESCRIPTION OF MONOMERS ---\n";
    output << "#\n";
    output << "data_comp_" << resname << "\n";
    output << "#\n";
    output << "loop_\n";
    output << "_chem_comp_atom.comp_id\n";
    output << "_chem_comp_atom.atom_id\n";
    output << "_chem_comp_atom.type_symbol\n";
    output << "_chem_comp_atom.type_energy\n";
    output << "_chem_comp_atom.partial_charge\n";
    output << "_chem_comp_atom.x\n";
    output << "_chem_comp_atom.y\n";
    output << "_chem_comp_atom.z\n";
    // FIXME Loop over atoms.
    // FAD           O2P    O    OP       -0.500      0.000    0.000    0.000
    atomIter = mol->beginAtoms();
    const RDKit::Conformer *conf=&(mol->getConformer(confId));
    while(atomIter!=mol->endAtoms()){
      double x, y, z;
      const RDGeom::Point3D pos = conf->getAtomPos((*atomIter)->getIdx());
      x = pos.x; y = pos.y; z = pos.z;
  
      std::string symbol = (*atomIter)->getSymbol();
      int charge = (*atomIter)->getFormalCharge();
  
      if(false&&info){
        std::string name = info->getName();
        output << resname << "           " << name << " " << symbol  << " " << name << " " << charge << " " << x << " " << y << " " << z << "\n";
      } else {
        if(elemMap.count(symbol)){
           elemMap[symbol]++;
        } else {
           elemMap[symbol] = 1;
        }
        std::stringstream s;
        s << elemMap[symbol];
        std::string iStr = s.str();
        std::string name = symbol+iStr;
        atomMap[(*atomIter)->getIdx()] = name;
        output << resname << "           " << name << " " << symbol  << " " << name << " " << charge << " " << x << " " << y << " " << z << "\n";
      }
  
      atomIter++;
    }
    output << "loop_\n";
    output << "_chem_comp_bond.comp_id\n";
    output << "_chem_comp_bond.atom_id_1\n";
    output << "_chem_comp_bond.atom_id_2\n";
    output << "_chem_comp_bond.type\n";
    output << "_chem_comp_bond.value_dist\n";
    output << "_chem_comp_bond.value_dist_esd\n";
    RDKit::ROMol::BondIterator bondIter = mol->beginBonds();
    while(bondIter!=mol->endBonds()){
      std::string beginAtom =  atomMap[(*bondIter)->getBeginAtomIdx()];
      std::string endAtom =  atomMap[(*bondIter)->getEndAtomIdx()];
      const RDGeom::Point3D pos1 = conf->getAtomPos((*bondIter)->getBeginAtomIdx());
      const RDGeom::Point3D pos2 = conf->getAtomPos((*bondIter)->getEndAtomIdx());
      double bondLength = sqrt((pos1.x-pos2.x)*(pos1.x-pos2.x) + (pos1.y-pos2.y)*(pos1.y-pos2.y) + (pos1.z-pos2.z)*(pos1.z-pos2.z));
      std::string bondType;
      if((*bondIter)->getBondType()==RDKit::Bond::DOUBLE){
         bondType = "double";
      } else if((*bondIter)->getBondType()==RDKit::Bond::TRIPLE){
         bondType = "triple";
      } else if((*bondIter)->getBondType()==RDKit::Bond::AROMATIC){
         bondType = "aromatic";
      } else {
         bondType = "single";
      }
      output << resname << "  " << "    " << beginAtom <<   " "  << endAtom  << " " << bondType  << " " << bondLength << "  0.020\n";
      bondIter++;
    }
    output << "# ------------------------------------------------------\n";

    return output.str();

}

int MolMinimize(RDKit::RWMol *mol, int nconf, int maxIters){
  //RDKit::MolOps::Kekulize(*mol); // This futzes with bond lengths, which I do not want!

#ifdef _DO_GLYCO_TESTING_
  bool force4C1chair = false;
#endif

  double vdwThresh=10.0;
  int confId=-1;
  bool ignoreInterfragInteractions=true;

  double minE = 1e+32;
  int minCid = -1;
  RDKit::INT_VECT cids=RDKit::DGeomHelpers::EmbedMultipleConfs(*mol, nconf);
  for(unsigned icid=0;icid<cids.size();icid++){
   
#ifdef _DO_GLYCO_TESTING_
    if(force4C1chair) {
      clipper::MiniMol minimol;
      clipper::MPolymer mp;
      clipper::MMonomer mm;
      mm.set_type("BGC");
      mm.set_seqnum(1);
      mm.set_id(1);
      minimol.init(clipper::Spacegroup::p1(),clipper::Cell(clipper::Cell_descr(300,300,300,90,90,90)));
      const RDKit::Conformer *conf=&(mol->getConformer(icid));
      RDKit::ROMol::AtomIterator atomIter = mol->beginAtoms();
      std::map<std::string,int> elemMap;
      std::map<int,std::string> atomMap;
      while(atomIter!=mol->endAtoms()){
        double x, y, z;
        const RDGeom::Point3D pos = conf->getAtomPos((*atomIter)->getIdx());
        x = pos.x; y = pos.y; z = pos.z;
        std::string symbol = (*atomIter)->getSymbol();
        clipper::MAtom mat;
        mat.set_coord_orth(clipper::Coord_orth(x,y,z));
        mat.set_element(symbol);
        if(elemMap.count(symbol)){
           elemMap[symbol]++;
        } else {
           elemMap[symbol] = 1;
        }
          std::stringstream s;
          s << elemMap[symbol];
          std::string iStr = s.str();
          std::string name = symbol+iStr;
        mat.set_id(name);
        mat.set_occupancy(1.0);
        mat.set_u_iso(20.0);
        mm.insert(mat);
        atomIter++;
      }
      //std::cout << "Monomer size " << mm.size() << std::endl;
      mp.insert(mm);
      //std::cout << "Polymer size " << mp.size() << std::endl;
      minimol.insert(mp);
      //std::cout << "Polymer atom list " << mp.atom_list().size() << std::endl;
      clipper::MMonomer theCopy;
      theCopy.copy(mm,clipper::MM::COPY_MPC);
      //std::cout << "Copy size " << theCopy.size() << std::endl;
      const clipper::MAtomNonBond nb = clipper::MAtomNonBond(minimol, 5.0);
      clipper::MSugar sugar(minimol,mm,nb);
      std::vector<clipper::ftype> cpParams = sugar.cremer_pople_params();
      if(cpParams.size()>2){
        //std::cout << "Q = " << cpParams[0] << std::endl;
        //std::cout << "PHI = " << cpParams[1] << std::endl;
        //std::cout << "THETA = " << cpParams[2] << std::endl;
        clipper::ftype theta = cpParams[2];
        if(theta<0||theta>20) continue;
      } else {
        // Not a sugar!
        continue;
      }
      std::cout << sugar.type_of_sugar() << std::endl;
    }
#endif

    ForceFields::ForceField *ff;
    try {
      ff=RDKit::UFF::constructForceField(*mol,vdwThresh, cids[icid],ignoreInterfragInteractions);
    } catch (...) {
      std::cout << "Error constructing forcefield.\n";
      return -1;
    }
    try {
      ff->initialize();
    } catch (...) {
      std::cout << "Error initializing forcefield.\n";
      return -1;
    }
    int res;
    try {
      res=ff->minimize(maxIters);
    } catch (...) {
      std::cout << "Error minimizing forcefield.\n";
      return -1;
    }

    double E;
    try {
      E = ff->calcEnergy();
    } catch (...) {
      std::cout << "Error calculating energy.\n";
      return -1;
    }
    if(E<minE){
      minE = E;
      minCid = icid;
    }
    delete ff;
  }
  std::cout << minE << "\n";

  return minCid;
}

std::pair<std::string, std::string> SmilesToPDB(const std::string &smile_cpp, const std::string &TLC, int nconf, int maxIters){
    std::pair<std::string, std::string> retval;

    const char* smile = smile_cpp.c_str();

    if(!smile||strlen(smile)<1){
        std::cout << "Zero length SMILES string." << std::endl;
        return retval;
    }

    RDKit::RWMol *mol = 0;
    try {
        mol =  RDKit::SmilesToMol(smile);
    } catch (RDKit::MolSanitizeException &e) {
        std::cout << e.what() << std::endl;
        return retval;
    } catch (...) {
        std::cout << "SMILES parse error?" << std::endl;
        return retval;
    }
    if(!mol){
        std::cout << "SMILES parse error?" << std::endl;
        return retval;
    }
    try {
        RDKit::MolOps::addHs(*mol);
    } catch (...) {
        std::cout << "Error adding hydrogens." << std::endl;
        return retval;
    }

    try {
        RDKit::DGeomHelpers::EmbedMolecule(*mol);
    } catch (...) {
        std::cout << "Error embedding molecule." << std::endl;
        return retval;
    }

    int minCid = MolMinimize(mol, nconf, maxIters);
    if(minCid==-1){
        std::cout << "Minimize from SMILES error" << std::endl;
        return retval;
    }

    std::string cif = writeCIF(mol,TLC, minCid);

    std::map<std::string,int> elemMap;
    for(auto atom: mol->atoms()) {
        RDKit::AtomPDBResidueInfo *mi = new RDKit::AtomPDBResidueInfo();
        auto mi_old = atom->getMonomerInfo();
        mi->setResidueName(TLC);
        mi->setResidueNumber(1);
        mi->setOccupancy(1.0);
        mi->setTempFactor(0.0);
        mi->setIsHeteroAtom(true);

        std::string symbol = atom->getSymbol();
        if(elemMap.count(symbol)){
           elemMap[symbol]++;
        } else {
           elemMap[symbol] = 1;
        }
        std::stringstream s;
        s << elemMap[symbol];
        std::string iStr = s.str();
        std::string name = symbol+iStr;
        if(symbol.length()==1) name = " " + name;
        if(name.length()==3) name = name + " ";
        mi->setName(name);
        atom->setMonomerInfo(mi);
    }

    std::string pdb = RDKit::MolToPDBBlock( *mol );

    retval.first = pdb;
    retval.second = cif;

    return retval;

}

struct moorhen_hbond {
      int hb_hydrogen; // McDonald and Thornton H-bond algorithm

      double angle_1;  // degrees
      double angle_2;
      double angle_3;
      double dist;  // H-bond length
      bool ligand_atom_is_donor; // for use when hb_hydrogen is NULL -
                                 // no hydrogens in H-bond analysis.
      bool hydrogen_is_ligand_atom;
      bool bond_has_hydrogen_flag;

      struct moorhen_hbond_atom {
          int serial;
          double x, y, z;
          double charge, occ, b_iso;
          std::string element;
          std::string name;
          int model;
          std::string chain;
          int resNum;
          std::string residueName;
          std::string altLoc;
      };

      moorhen_hbond_atom donor;
      moorhen_hbond_atom acceptor;
      moorhen_hbond_atom donor_neigh;
      moorhen_hbond_atom acceptor_neigh;

};

class molecules_container_js : public molecules_container_t {
    public:
        /*
        std::vector<moorhen_hbond> get_hbonds(int imol, const std::string &cid_str) { 
            std::vector<moorhen_hbond> mhbs;
            std::vector<coot::h_bond> hbonds = molecules_container_t::get_hbonds(imol, cid_str);

            for(unsigned ib=0;ib<hbonds.size();ib++){
                moorhen_hbond mhb;
                mhb.hb_hydrogen = hbonds[ib].hb_hydrogen->serNum;
                mhb.donor.serial = hbonds[ib].donor->serNum;
                mhb.acceptor.serial = hbonds[ib].acceptor->serNum;
                mhb.donor_neigh.serial = hbonds[ib].donor_neigh->serNum;
                mhb.acceptor_neigh.serial = hbonds[ib].acceptor_neigh->serNum;
                mhb.donor.x = hbonds[ib].donor->x;
                mhb.donor.y = hbonds[ib].donor->y;
                mhb.donor.z = hbonds[ib].donor->z;
                mhb.acceptor.x = hbonds[ib].acceptor->x;
                mhb.acceptor.y = hbonds[ib].acceptor->y;
                mhb.acceptor.z = hbonds[ib].acceptor->z;
                mhb.donor_neigh.x = hbonds[ib].donor_neigh->x;
                mhb.donor_neigh.y = hbonds[ib].donor_neigh->y;
                mhb.donor_neigh.z = hbonds[ib].donor_neigh->z;
                mhb.acceptor_neigh.x = hbonds[ib].acceptor_neigh->x;
                mhb.acceptor_neigh.y = hbonds[ib].acceptor_neigh->y;
                mhb.acceptor_neigh.z = hbonds[ib].acceptor_neigh->z;

                mhb.donor.charge = hbonds[ib].donor->charge;
                mhb.donor.occ = hbonds[ib].donor->occupancy;
                mhb.donor.b_iso = hbonds[ib].donor->tempFactor;
                mhb.donor.element = std::string(hbonds[ib].donor->element);
                mhb.donor.name = std::string(hbonds[ib].donor->name);
                mhb.donor.model = hbonds[ib].donor->GetModelNum();
                mhb.donor.chain = std::string(hbonds[ib].donor->GetChainID());
                mhb.donor.resNum = hbonds[ib].donor->GetResidueNo();
                mhb.donor.residueName = std::string(hbonds[ib].donor->GetResidue()->name);
                mhb.donor.altLoc = std::string(hbonds[ib].donor->altLoc);

                mhb.acceptor.charge = hbonds[ib].acceptor->charge;
                mhb.acceptor.occ = hbonds[ib].acceptor->occupancy;
                mhb.acceptor.b_iso = hbonds[ib].acceptor->tempFactor;
                mhb.acceptor.element = std::string(hbonds[ib].acceptor->element);
                mhb.acceptor.name = std::string(hbonds[ib].acceptor->name);
                mhb.acceptor.model = hbonds[ib].acceptor->GetModelNum();
                mhb.acceptor.chain = std::string(hbonds[ib].acceptor->GetChainID());
                mhb.acceptor.resNum = hbonds[ib].acceptor->GetResidueNo();
                mhb.acceptor.residueName = std::string(hbonds[ib].acceptor->GetResidue()->name);
                mhb.acceptor.altLoc = std::string(hbonds[ib].acceptor->altLoc);

                mhb.donor_neigh.charge = hbonds[ib].donor_neigh->charge;
                mhb.donor_neigh.occ = hbonds[ib].donor_neigh->occupancy;
                mhb.donor_neigh.b_iso = hbonds[ib].donor_neigh->tempFactor;
                mhb.donor_neigh.element = std::string(hbonds[ib].donor_neigh->element);
                mhb.donor_neigh.name = std::string(hbonds[ib].donor_neigh->name);
                mhb.donor_neigh.model = hbonds[ib].donor_neigh->GetModelNum();
                mhb.donor_neigh.chain = std::string(hbonds[ib].donor_neigh->GetChainID());
                mhb.donor_neigh.resNum = hbonds[ib].donor_neigh->GetResidueNo();
                mhb.donor_neigh.residueName = std::string(hbonds[ib].donor_neigh->GetResidue()->name);
                mhb.donor_neigh.altLoc = std::string(hbonds[ib].donor_neigh->altLoc);

                mhb.acceptor_neigh.charge = hbonds[ib].acceptor_neigh->charge;
                mhb.acceptor_neigh.occ = hbonds[ib].acceptor_neigh->occupancy;
                mhb.acceptor_neigh.b_iso = hbonds[ib].acceptor_neigh->tempFactor;
                mhb.acceptor_neigh.element = std::string(hbonds[ib].acceptor_neigh->element);
                mhb.acceptor_neigh.name = std::string(hbonds[ib].acceptor_neigh->name);
                mhb.acceptor_neigh.model = hbonds[ib].acceptor_neigh->GetModelNum();
                mhb.acceptor_neigh.chain = std::string(hbonds[ib].acceptor_neigh->GetChainID());
                mhb.acceptor_neigh.resNum = hbonds[ib].acceptor_neigh->GetResidueNo();
                mhb.acceptor_neigh.residueName = std::string(hbonds[ib].acceptor_neigh->GetResidue()->name);
                mhb.acceptor_neigh.altLoc = std::string(hbonds[ib].acceptor_neigh->altLoc);

                mhb.angle_1 = hbonds[ib].angle_1;
                mhb.angle_2 = hbonds[ib].angle_2;
                mhb.angle_3 = hbonds[ib].angle_3;
                mhb.dist = hbonds[ib].dist;
                mhb.ligand_atom_is_donor = hbonds[ib].ligand_atom_is_donor;
                mhb.hydrogen_is_ligand_atom = hbonds[ib].hydrogen_is_ligand_atom;
                mhb.bond_has_hydrogen_flag = hbonds[ib].bond_has_hydrogen_flag;
                mhbs.push_back(mhb);
            }
            return mhbs;
        }
        */
       
        explicit molecules_container_js(bool verbose=true) : molecules_container_t(verbose) {

        }

        std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>> get_symmetry_with_matrices(int imol, float symmetry_search_radius, float x, float y, float z) { 
            coot::symmetry_info_t si = get_symmetry(imol, symmetry_search_radius, x, y, z);
            mmdb::Manager *mol = get_mol(imol);
            mmdb::Cryst *cryst = mol->GetCrystData();
            std::vector<std::array<float, 16>> matrices;
            mmdb::mat44 my_matt;
            mmdb::mat44 mol_to_origin_matt;

            for (unsigned i = 0; i < si.symm_trans.size(); i++) {

                symm_trans_t symm_trans = si.symm_trans[i].first;
                Cell_Translation cell_trans = si.symm_trans[i].second;

                cryst->GetTMatrix(mol_to_origin_matt, 0,
                              -cell_trans.us,
                              -cell_trans.vs,
                              -cell_trans.ws);

                cryst->GetTMatrix(my_matt,
                                         symm_trans.isym(),
                                         symm_trans.x(),
                                         symm_trans.y(),
                                         symm_trans.z());

                //m = mol_to_origin_matt * my_matt
                std::array<float, 16> theMat;
                int idx = 0;

                matrix mat1 = matrix(4,4);
                matrix mat2 = matrix(4,4);

                for(int j=0;j<4;j++){
                    for(int k=0;k<4;k++){
                        mat1(j,k) = my_matt[j][k];
                        mat2(j,k) = mol_to_origin_matt[j][k];
                    }
                }
                matrix mat3 = mat1 * mat2;

                for(int j=0;j<4;j++){
                    for(int k=0;k<4;k++){
                        theMat[idx] = mat3(k,j);
                        idx++;
                    }
                }

                matrices.push_back(theMat);
            }

            std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>> thePair;
            thePair.first = si;
            thePair.second = matrices;
            return thePair;
        }

        std::vector<float> getFloats(unsigned nFloats) { 
            std::vector<float> fs;
            for(unsigned i=0;i<nFloats;i++){
                fs.push_back(i*1.0);
            }
            return fs;
        }
        int add(int ic) { 
            return ic + 1;
        }
        int writePDBASCII(int imol, const std::string &file_name) { 
            const char *fname_cp = file_name.c_str();
            return get_mol(imol)->WritePDBASCII(fname_cp);
        }

        int writeCCP4Map(int imol, const std::string &file_name) {
            auto xMap = (*this)[imol].xmap;
            auto clipperMap = clipper::CCP4MAPfile();
            clipperMap.open_write(file_name);
            clipperMap.export_xmap(xMap);
            return 0;
        }        
        int count_simple_mesh_vertices(const coot::simple_mesh_t &m) { return m.vertices.size(); }
        std::vector<float> go_to_blob_array(float x1, float y1, float z1, float x2, float y2, float z2, float contour_level){
            std::vector<float> o;
            std::pair<bool, clipper::Coord_orth> pp = molecules_container_t::go_to_blob(x1, y1, z1, x2, y2, z2, contour_level);
            if(pp.first){
                o.push_back(pp.second.x());
                o.push_back(pp.second.y());
                o.push_back(pp.second.z());
            }
            return o;
        }
};

std::string GetAtomNameFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetAtomName());
}

std::string GetChainIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetChainID());
}

std::string GetLabelAsymIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelAsymID());
}

std::string GetLabelCompIDFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetLabelCompID());
}

std::string GetInsCodeFromAtom(mmdb::Atom *atom){
    return std::string(atom->GetInsCode());
}

std::string GetResNameFromResidue(mmdb::Residue *res){
    return std::string(res->GetResName());
}

std::string GetChainIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetChainID());
}

std::string GetLabelAsymIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelAsymID());
}

std::string GetLabelCompIDFromResidue(mmdb::Residue *res){
    return std::string(res->GetLabelCompID());
}
 
std::string GetInsCodeFromResidue(mmdb::Residue *res){
    return std::string(res->GetInsCode());
}

EMSCRIPTEN_BINDINGS(my_module) {
    class_<clipper::Coord_orth>("Coord_orth")
    .constructor<const clipper::ftype&, const clipper::ftype&, const clipper::ftype&>()
    .function("x", &clipper::Coord_orth::x)
    .function("y", &clipper::Coord_orth::y)
    .function("z", &clipper::Coord_orth::z)
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
    class_<merge_molecule_results_info_t>("merge_molecule_results_info_t")
    .property("chain_id", &merge_molecule_results_info_t::chain_id)
    .property("spec", &merge_molecule_results_info_t::spec)
    .property("is_chain", &merge_molecule_results_info_t::is_chain)
    ;
    class_<coot::residue_validation_information_t>("residue_validation_information_t")
    .property("function_value", &coot::residue_validation_information_t::function_value)
    .property("label", &coot::residue_validation_information_t::label)
    .property("residue_spec", &coot::residue_validation_information_t::residue_spec)
    .property("atom_spec", &coot::residue_validation_information_t::atom_spec)
    ;
    class_<coot::chain_validation_information_t>("chain_validation_information_t")
    .property("chain_id", &coot::chain_validation_information_t::chain_id)
    .property("rviv", &coot::chain_validation_information_t::rviv)
    ;
    class_<coot::validation_information_t>("validation_information_t")
    .property("name", &coot::validation_information_t::name)
    .property("type", &coot::validation_information_t::type)
    .property("cviv", &coot::validation_information_t::cviv)
    .function("get_index_for_chain",&coot::validation_information_t::get_index_for_chain)
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
    .property("residue_name", &coot::phi_psi_prob_t::residue_name)
    .function("is_allowed", &coot::phi_psi_prob_t::is_allowed)
    ;
    class_<coot::molecule_t::moved_atom_t>("moved_atom_t")
    .constructor<const std::string&, const std::string&, float, float, float, int>()
    .property("atom_name", &coot::molecule_t::moved_atom_t::atom_name)
    .property("alt_conf", &coot::molecule_t::moved_atom_t::alt_conf)
    .property("x", &coot::molecule_t::moved_atom_t::x)
    .property("y", &coot::molecule_t::moved_atom_t::y)
    .property("z", &coot::molecule_t::moved_atom_t::z)
    .property("index", &coot::molecule_t::moved_atom_t::index)
    ;
    class_<coot::molecule_t::interesting_place_t>("interesting_place_t")
    .constructor<const std::string &, const coot::residue_spec_t &, const clipper::Coord_orth &, const std::string &>()
    .constructor<const std::string &, const clipper::Coord_orth &, const std::string &>()
    .property("feature_type", &coot::molecule_t::interesting_place_t::feature_type)
    .property("residue_spec", &coot::molecule_t::interesting_place_t::residue_spec)
    .property("button_label", &coot::molecule_t::interesting_place_t::button_label)
    .property("feature_value", &coot::molecule_t::interesting_place_t::feature_value)
    .property("badness", &coot::molecule_t::interesting_place_t::badness)
    .property("x", &coot::molecule_t::interesting_place_t::x)
    .property("y", &coot::molecule_t::interesting_place_t::y)
    .property("z", &coot::molecule_t::interesting_place_t::z)
    ;
    class_<coot::molecule_t::moved_residue_t>("moved_residue_t")
    .constructor<const std::string&, int, const std::string&>()
    .property("chain_id", &coot::molecule_t::moved_residue_t::chain_id)
    .property("res_no", &coot::molecule_t::moved_residue_t::res_no)
    .property("ins_code", &coot::molecule_t::moved_residue_t::ins_code)
    .property("moved_atoms", &coot::molecule_t::moved_residue_t::moved_atoms)
    ;
    class_<coot::Cell>("Coot_Cell")
    .property("a", &coot::Cell::a)
    .property("b", &coot::Cell::b)
    .property("c", &coot::Cell::c)
    .property("alpha", &coot::Cell::alpha)
    .property("beta", &coot::Cell::beta)
    .property("gamma", &coot::Cell::gamma)
    ;
    class_<coot::symmetry_info_t>("symmetry_info_t")
    .property("cell",&coot::symmetry_info_t::cell)
    .property("symm_trans",&coot::symmetry_info_t::symm_trans)
    ;
    class_<molecules_container_t>("molecules_container_t")
    .constructor<bool>()
    .function("change_to_next_rotamer",&molecules_container_t::change_to_next_rotamer)
    .function("change_to_previous_rotamer",&molecules_container_t::change_to_previous_rotamer)
    .function("change_to_first_rotamer",&molecules_container_t::change_to_first_rotamer)
    .function("set_user_defined_atom_colour_by_residue",&molecules_container_t::set_user_defined_atom_colour_by_residue)
    .function("set_user_defined_bond_colours",&molecules_container_t::set_user_defined_bond_colours)
    .function("set_colour_wheel_rotation_base",&molecules_container_t::set_colour_wheel_rotation_base)
    .function("get_symmetry",&molecules_container_t::get_symmetry)
    .function("fit_to_map_by_random_jiggle_using_cid",&molecules_container_t::fit_to_map_by_random_jiggle_using_cid)
    .function("get_active_atom",&molecules_container_t::get_active_atom)
    .function("is_a_difference_map",&molecules_container_t::is_a_difference_map)
    .function("add_hydrogen_atoms",&molecules_container_t::add_hydrogen_atoms)
    .function("delete_hydrogen_atoms",&molecules_container_t::delete_hydrogen_atoms)
    .function("get_gaussian_surface",&molecules_container_t::get_gaussian_surface)
    .function("get_monomer_from_dictionary",&molecules_container_t::get_monomer_from_dictionary)
    .function("get_molecular_representation_mesh",&molecules_container_t::get_molecular_representation_mesh)
    .function("get_map_weight",&molecules_container_t::get_map_weight)
    .function("set_map_weight",&molecules_container_t::set_map_weight)
    .function("set_show_timings",&molecules_container_t::set_show_timings)
    .function("get_molecule_name",&molecules_container_t::get_molecule_name)
    .function("non_standard_residue_types_in_model",&molecules_container_t::non_standard_residue_types_in_model)
    .function("get_map_rmsd_approx",&molecules_container_t::get_map_rmsd_approx)
    .function("set_draw_missing_residue_loops",&molecules_container_t::set_draw_missing_residue_loops)
    .function("set_make_backups",&molecules_container_t::set_make_backups)
    .function("get_chains_in_model",&molecules_container_t::get_chains_in_model)
    .function("get_residue_names_with_no_dictionary",&molecules_container_t::get_residue_names_with_no_dictionary)
    .function("write_map",&molecules_container_t::write_map)
    .function("delete_atom",&molecules_container_t::delete_atom)
    .function("delete_atom_using_cid",&molecules_container_t::delete_atom_using_cid)
    .function("delete_residue",&molecules_container_t::delete_residue)
    .function("delete_residue_using_cid",&molecules_container_t::delete_residue_using_cid)
    .function("delete_residue_atoms_with_alt_conf",&molecules_container_t::delete_residue_atoms_with_alt_conf)
    .function("delete_residue_atoms_using_cid",&molecules_container_t::delete_residue_atoms_using_cid)
    .function("delete_side_chain",&molecules_container_t::delete_side_chain)
    .function("delete_chain_using_cid",&molecules_container_t::delete_chain_using_cid)
    .function("get_molecule_centre",&molecules_container_t::get_molecule_centre)
    .function("set_refinement_is_verbose",&molecules_container_t::set_refinement_is_verbose)
    .function("set_refinement_is_verbose",&molecules_container_t::set_refinement_is_verbose)
    .function("peptide_omega_analysis",&molecules_container_t::peptide_omega_analysis)
    .function("calculate_new_rail_points",&molecules_container_t::calculate_new_rail_points)
    .function("rail_points_total",&molecules_container_t::rail_points_total)
    .function("sfcalc_genmap",&molecules_container_t::sfcalc_genmap)
    .function("sfcalc_genmaps_using_bulk_solvent",&molecules_container_t::sfcalc_genmaps_using_bulk_solvent)
    .function("add_colour_rule",&molecules_container_t::add_colour_rule)
    .function("delete_colour_rules",&molecules_container_t::delete_colour_rules)
    .function("add_colour_rules_multi",&molecules_container_t::add_colour_rules_multi)
    .function("fit_ligand_right_here",&molecules_container_t::fit_ligand_right_here)
    .function("fit_to_map_by_random_jiggle",&molecules_container_t::fit_to_map_by_random_jiggle)
    .function("fit_to_map_by_random_jiggle_using_cid",&molecules_container_t::fit_to_map_by_random_jiggle_using_cid)
    .function("get_svg_for_residue_type",&molecules_container_t::get_svg_for_residue_type)
    .function("is_valid_model_molecule",&molecules_container_t::is_valid_model_molecule)
    .function("is_valid_map_molecule",&molecules_container_t::is_valid_map_molecule)
    .function("read_pdb",&molecules_container_t::read_pdb)
    .function("read_ccp4_map",&molecules_container_t::read_ccp4_map)
    .function("read_mtz",&molecules_container_t::read_mtz)
    //   int import_cif_dictionary(const std::string &cif_file_name, int imol_enc);
    .function("import_cif_dictionary",&molecules_container_t::import_cif_dictionary)
    .function("density_fit_analysis",&molecules_container_t::density_fit_analysis)
    //Using allow_raw_pointers(). Perhaps suggests we need to do something different from exposing mmdb pointers to JS.
    .function("get_residue",&molecules_container_t::get_residue, allow_raw_pointers())
    .function("get_atom",&molecules_container_t::get_atom, allow_raw_pointers())
    .function("flipPeptide_cid",   select_overload<int(int, const std::string&,      const std::string&)>(&molecules_container_t::flip_peptide_using_cid))
    .function("flipPeptide",       select_overload<int(int, const coot::atom_spec_t&,const std::string&)>(&molecules_container_t::flip_peptide))
    .function("side_chain_180",    select_overload<int(int, const std::string&)>                         (&molecules_container_t::side_chain_180))
    .function("eigen_flip_ligand", select_overload<void(int, const std::string&)>                        (&molecules_container_t::eigen_flip_ligand_using_cid))
    .function("jed_flip",          select_overload<std::string(int, const std::string&, bool)>           (&molecules_container_t::jed_flip))
    .function("add_terminal_residue_directly_using_cid", select_overload<int(int,  const std::string&)>(&molecules_container_t::add_terminal_residue_directly_using_cid))
    .function("test_origin_cube",&molecules_container_t::test_origin_cube)
    .function("get_ramachandran_validation_markup_mesh",&molecules_container_t::get_ramachandran_validation_markup_mesh)
    .function("get_rotamer_dodecs",&molecules_container_t::get_rotamer_dodecs)
    .function("get_rotamer_dodecs_instanced",&molecules_container_t::get_rotamer_dodecs_instanced)
    .function("auto_fit_rotamer",&molecules_container_t::auto_fit_rotamer)
    .function("rigid_body_fit",&molecules_container_t::rigid_body_fit)
    .function("cis_trans_convert",&molecules_container_t::cis_trans_convert)
    .function("set_draw_missing_residue_loops",&molecules_container_t::set_draw_missing_residue_loops)
    .function("get_map_contours_mesh",&molecules_container_t::get_map_contours_mesh)
    .function("geometry_init_standard",&molecules_container_t::geometry_init_standard)
    .function("fill_rotamer_probability_tables",&molecules_container_t::fill_rotamer_probability_tables)
    .function("copy_fragment_using_residue_range",&molecules_container_t::copy_fragment_using_residue_range)
    .function("copy_fragment_using_cid",&molecules_container_t::copy_fragment_using_cid)
    .function("close_molecule",&molecules_container_t::close_molecule)
    .function("undo",&molecules_container_t::undo)
    .function("redo",&molecules_container_t::redo)
    .function("refine_residues_using_atom_cid",&molecules_container_t::refine_residues_using_atom_cid)
    .function("refine_residue_range",&molecules_container_t::refine_residue_range)
    .function("contact_dots_for_ligand",&molecules_container_t::contact_dots_for_ligand)
    .function("all_molecule_contact_dots",&molecules_container_t::all_molecule_contact_dots)
    .function("get_chemical_features_mesh",&molecules_container_t::get_chemical_features_mesh)
    .function("set_imol_refinement_map",&molecules_container_t::set_imol_refinement_map)
    .function("mutate",&molecules_container_t::mutate)
    .function("fill_partial_residue",&molecules_container_t::fill_partial_residue)
    .function("add_alternative_conformation",&molecules_container_t::add_alternative_conformation)
    .function("delete_using_cid",&molecules_container_t::delete_using_cid)
    .function("get_bonds_mesh",&molecules_container_t::get_bonds_mesh)
    .function("get_bonds_mesh_instanced",&molecules_container_t::get_bonds_mesh_instanced)
    .function("get_bonds_mesh_for_selection_instanced",&molecules_container_t::get_bonds_mesh_for_selection_instanced)
    .function("go_to_blob",&molecules_container_t::go_to_blob)
    .function("set_map_sampling_rate",&molecules_container_t::set_map_sampling_rate)
    .function("get_monomer",&molecules_container_t::get_monomer)
    .function("get_monomer_and_position_at",&molecules_container_t::get_monomer_and_position_at)
    .function("move_molecule_to_new_centre",&molecules_container_t::move_molecule_to_new_centre)
    .function("apply_transformation_to_atom_selection",&molecules_container_t::apply_transformation_to_atom_selection)
    .function("new_positions_for_residue_atoms",&molecules_container_t::new_positions_for_residue_atoms)
    .function("new_positions_for_atoms_in_residues",&molecules_container_t::new_positions_for_atoms_in_residues)
    //.function("get_interesting_places",&molecules_container_t::get_interesting_places)
    .function("difference_map_peaks",&molecules_container_t::difference_map_peaks)
    .function("pepflips_using_difference_map",&molecules_container_t::pepflips_using_difference_map)
    .function("add_waters",&molecules_container_t::add_waters)
    .function("ramachandran_analysis",&molecules_container_t::ramachandran_analysis)
    .function("density_correlation_analysis",&molecules_container_t::density_correlation_analysis)
    .function("rotamer_analysis",&molecules_container_t::rotamer_analysis)
    .function("associate_data_mtz_file_with_map",&molecules_container_t::associate_data_mtz_file_with_map)
    .function("connect_updating_maps",&molecules_container_t::connect_updating_maps)
    .function("residues_with_missing_atoms",&molecules_container_t::residues_with_missing_atoms)
    .function("ramachandran_validation",&molecules_container_t::ramachandran_validation)
    .function("merge_molecules", select_overload<std::pair<int, std::vector<merge_molecule_results_info_t> >(int,const std::string &)>(&molecules_container_t::merge_molecules))
    .function("get_single_letter_codes_for_chain",&molecules_container_t::get_single_letter_codes_for_chain)
    .function("get_r_factor_stats",&molecules_container_t::get_r_factor_stats)
    .function("get_colour_rules",&molecules_container_t::get_colour_rules)
    .function("mmrrcc",&molecules_container_t::mmrrcc)
    .function("auto_read_mtz",&molecules_container_t::auto_read_mtz)
    .function("SSM_superpose",&molecules_container_t::SSM_superpose)
    .function("add_to_non_drawn_bonds",&molecules_container_t::add_to_non_drawn_bonds)
    .function("clear_non_drawn_bonds",&molecules_container_t::clear_non_drawn_bonds)
    .function("file_name_to_string",&molecules_container_t::file_name_to_string)
    .function("replace_molecule_by_model_from_file",&molecules_container_t::replace_molecule_by_model_from_file)
    .function("replace_map_by_mtz_from_file",&molecules_container_t::replace_map_by_mtz_from_file)
    .function("replace_fragment",&molecules_container_t::replace_fragment)
    .function("sharpen_blur_map",&molecules_container_t::sharpen_blur_map)
    .function("mask_map_by_atom_selection",&molecules_container_t::mask_map_by_atom_selection)
    ;
    class_<molecules_container_js, base<molecules_container_t>>("molecules_container_js")
    .constructor<bool>()
    .function("writePDBASCII",&molecules_container_js::writePDBASCII)
    .function("writeCCP4Map",&molecules_container_js::writeCCP4Map)
    .function("count_simple_mesh_vertices",&molecules_container_js::count_simple_mesh_vertices)
    .function("go_to_blob_array",&molecules_container_js::go_to_blob_array)
    .function("add",&molecules_container_js::add)
    .function("getFloats",&molecules_container_js::getFloats)
    .function("get_symmetry_with_matrices",&molecules_container_js::get_symmetry_with_matrices)
    //.function("get_hbonds",&molecules_container_js::get_hbonds);
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
    class_<coot::instancing_data_type_A_t>("instancing_data_type_A_t")
    .property("position",&coot::instancing_data_type_A_t::position)
    .property("colour",&coot::instancing_data_type_A_t::colour)
    .property("size",&coot::instancing_data_type_A_t::size)
    ;
    class_<coot::instancing_data_type_B_t>("instancing_data_type_B_t")
    .property("position",&coot::instancing_data_type_B_t::position)
    .property("colour",&coot::instancing_data_type_B_t::colour)
    .property("size",&coot::instancing_data_type_B_t::size)
    .property("orientation",&coot::instancing_data_type_B_t::orientation)
    ;
    class_<coot::instanced_geometry_t>("instanced_geometry_t")
    .property("vertices",&coot::instanced_geometry_t::vertices)
    .property("triangles",&coot::instanced_geometry_t::triangles)
    .property("instancing_data_A",&coot::instanced_geometry_t::instancing_data_A)
    .property("instancing_data_B",&coot::instanced_geometry_t::instancing_data_B)
    ;
    class_<coot::instanced_mesh_t>("instanced_mesh_t")
    .property("geom",&coot::instanced_mesh_t::geom)
    .property("markup",&coot::instanced_mesh_t::markup)
    ;
    class_<coot::atom_spec_t>("atom_spec_t")
    .constructor<const std::string &, int, const std::string &, const std::string &, const std::string &>()
    .property("chain_id",&coot::atom_spec_t::chain_id)
    .property("res_no",&coot::atom_spec_t::res_no)
    .property("ins_code",&coot::atom_spec_t::ins_code)
    .property("atom_name",&coot::atom_spec_t::atom_name)
    .property("alt_conf",&coot::atom_spec_t::alt_conf)
    .property("int_user_data",&coot::atom_spec_t::int_user_data)
    .property("float_user_data",&coot::atom_spec_t::float_user_data)
    .property("string_user_data",&coot::atom_spec_t::string_user_data)
    .property("model_number",&coot::atom_spec_t::model_number)
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
    class_<coot::residue_spec_t>("residue_spec_t")
    .constructor<const std::string &, int, const std::string &>()
    .property("model_number",&coot::residue_spec_t::model_number)
    .property("chain_id",&coot::residue_spec_t::chain_id)
    .property("res_no",&coot::residue_spec_t::res_no)
    .property("ins_code",&coot::residue_spec_t::ins_code)
    .property("int_user_data",&coot::residue_spec_t::int_user_data)
    ;
    class_<coot::api::vnc_vertex>("vnc_vertex")
    .constructor<const glm::vec3 &, const glm::vec3 &, const glm::vec4 &>()
    .property("pos",&coot::api::vnc_vertex::pos)
    .property("normal",&coot::api::vnc_vertex::normal)
    .property("color",&coot::api::vnc_vertex::color)
    ;
    class_<coot::api::vn_vertex>("vn_vertex")
    .constructor<const glm::vec3 &, const glm::vec3 &>()
    .property("pos",&coot::api::vn_vertex::pos)
    .property("normal",&coot::api::vn_vertex::normal)
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
    class_<coot::simple_mesh_t>("simple_mesh_t")
    .property("vertices",&coot::simple_mesh_t::vertices)
    .property("triangles",&coot::simple_mesh_t::triangles)
    ;

    class_<coot::util::density_correlation_stats_info_t>("density_correlation_stats_info_t")
    .property("n",&coot::util::density_correlation_stats_info_t::n)
    .property("sum_xy",&coot::util::density_correlation_stats_info_t::sum_xy)
    .property("sum_sqrd_x",&coot::util::density_correlation_stats_info_t::sum_sqrd_x)
    .property("sum_sqrd_y",&coot::util::density_correlation_stats_info_t::sum_sqrd_y)
    .property("sum_x",&coot::util::density_correlation_stats_info_t::sum_x)
    .property("sum_x",&coot::util::density_correlation_stats_info_t::sum_x)
    .function("var_x",&coot::util::density_correlation_stats_info_t::var_x)
    .function("var_y",&coot::util::density_correlation_stats_info_t::var_y)
    .function("correlation",&coot::util::density_correlation_stats_info_t::correlation)
    ;

    value_object<superpose_results_t>("superpose_results_t")
    .field("suppose_info",&superpose_results_t::suppose_info)
    .field("alignment",&superpose_results_t::alignment)
    .field("alignment_info",&superpose_results_t::alignment_info)
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

    register_map<unsigned int, std::array<float, 3>>("MapIntFloat3");
    register_map<coot::residue_spec_t, coot::util::density_correlation_stats_info_t>("Map_residue_spec_t_density_correlation_stats_info_t");
    register_vector<std::array<float, 16>>("VectorArrayFloat16");
    register_vector<std::pair<std::string, unsigned int> >("VectorStringUInt_pair");
    register_vector<std::pair<symm_trans_t, Cell_Translation>>("Vectorsym_trans_t_Cell_Translation_pair");
    register_vector<std::pair<std::string, std::string>>("Vectorstring_string_pair");
    register_vector<moorhen_hbond>("Vectormoorhen_hbond");
    register_vector<coot::instanced_geometry_t>("Vectorinstanced_geometry_t");
    register_vector<coot::molecule_t::moved_residue_t>("Vectormoved_residue_t");
    register_vector<coot::molecule_t::moved_atom_t>("Vectormoved_atom_t");
    register_vector<std::string>("VectorString");
    register_vector<std::vector<std::string>>("VectorVectorString");
    register_vector<float>("VectorFloat");
    register_vector<double>("VectorDouble");
    register_vector<int>("VectorInt");
    register_vector<char>("VectorChar");
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
    value_object<std::pair<std::string, unsigned int>>("string_uint_pair")
        .field("first",&std::pair<std::string, unsigned int>::first)
        .field("second",&std::pair<std::string, unsigned int>::second)
    ;

    value_object<std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>>("symmetry_info_t_matrixVector_pair")
        .field("first",&std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>::first)
        .field("second",&std::pair<coot::symmetry_info_t,std::vector<std::array<float, 16>>>::second)
    ;

    value_object<moorhen_hbond>("moorhen_hbond")
      .field("hb_hydrogen",&moorhen_hbond::hb_hydrogen)
      .field("donor",&moorhen_hbond::donor)
      .field("acceptor",&moorhen_hbond::acceptor)
      .field("donor_neigh",&moorhen_hbond::donor_neigh)
      .field("acceptor_neigh",&moorhen_hbond::acceptor_neigh)
      .field("angle_1",&moorhen_hbond::angle_1)
      .field("angle_2",&moorhen_hbond::angle_2)
      .field("angle_3",&moorhen_hbond::angle_3)
      .field("dist",&moorhen_hbond::dist)
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
    function("SmilesToPDB",&SmilesToPDB);

    //For testing
    //function("TakeColourMap",&TakeColourMap);
    //function("TakeStringIntPairVector",&TakeStringIntPairVector);
}
