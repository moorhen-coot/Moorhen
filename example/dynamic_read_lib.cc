//int coot::protein_geometry::try_dynamic_add(const std::string &resname, int read_number);
#include <stdlib.h>
#include <iostream> // fixes undefined strchr, strchrr problems

#include "geometry/protein-geometry.hh"
#include "coords/mmdb-extras.h"
#include "coords/mmdb.h"
#include "ligand/chi-angles.hh"
#include "ligand/primitive-chi-angles.hh"
#include "ligand/rotamer.hh"

#include "mmdb_manager.h"

int main(int argc, char **argv) {
    coot::protein_geometry geom;
    geom.init_standard();

   std::string types[6] = { "ALA", "TYR", "CYS", "ATP", "OS4", "NA" };
   int read_number = 36;
   for (int i=0; i<6; i++) {
      std::string res_type = types[i];
      std::pair<bool, coot::dictionary_residue_restraints_t> rp = geom.get_monomer_restraints(res_type, 0);
      if (! rp.first) {
         int foo = geom.try_dynamic_add(res_type,read_number++);
         std::cout << "Trying to load " << res_type << " " << foo << std::endl;
         std::pair<bool, coot::dictionary_residue_restraints_t> rp2 = geom.get_monomer_restraints(res_type, 0);
         if (! rp2.first) {
             std::cout << "Don't think that worked?" << std::endl;
         }
      }
      int imol = 0; // dummy
      if (geom.have_dictionary_for_residue_type(res_type, imol, read_number)) {
         bool f = rp.second.comprised_of_organic_set();
         if (f)
            std::cout << "test: " << res_type << " is IN organic set" << std::endl;
         else
            std::cout << "test: " << res_type << " is NOT in organic set" << std::endl;
      } else {
         std::cout << "test: " << res_type << " -- no dictionary " << std::endl;
      }
   }


    mmdb::InitMatType();
    mmdb::Manager *molHnd = new mmdb::Manager();
    printf("Reading a PDB file\n");
    int RC = molHnd->ReadCoorFile(argv[1]);
    std::cout << RC << std::endl;

    coot::rotamer rot(0);

    mmdb::Model *model_p = molHnd->GetModel(1);
    int nchains = model_p->GetNumberOfChains();
    for (int ichain=0; ichain<nchains; ichain++) {
        mmdb::Chain *chain_p = model_p->GetChain(ichain);
        std::string chain_id = chain_p->GetChainID();
        if (chain_id == "A") {
            int nres = chain_p->GetNumberOfResidues();
            mmdb::Residue *residue_p;
            for (int ires=0; ires<nres; ires++) { 
                residue_p = chain_p->GetResidue(ires);
                int resno = residue_p->GetSeqNum();
                std::string res_name(residue_p->GetResName());
                if (res_name == "GLY" || res_name == "ALA" || res_name == "HOH") {
                    continue;
                }

                std::cout << resno << " " << res_name << std::endl;
                std::vector<coot::simple_rotamer> rots =  rot.get_rotamers(res_name, 0.001);
                for(int irot=0;irot<rots.size();irot++){
                    for(int n_chi=0;n_chi<4;n_chi++){
                        std::cout << " " << rots[irot].get_chi(n_chi+1);
                    }
                    std::cout << " " << rots[irot].P_r1234();
                    std::cout << std::endl;
                }
            }
        }
    }


    

    return 0;
}


