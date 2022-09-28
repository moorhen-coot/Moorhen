#include <iostream>
#include <string>
#include "geometry/residue-and-atom-specs.hh"
#include "api/interfaces.hh"
#include "api/molecules_container.hh"
#include "api/validation-information.hh"

int main(int argc, char *argv[]){

    std::string f = std::string(argv[4]);
    std::string phi = std::string(argv[5]);
    std::string wt = "";
    std::string chainId = std::string(argv[2]);
    bool use_wt = false;
    bool is_diff = false;
    std::string pdbfile = std::string(argv[1]);
    std::string mapfile = std::string(argv[3]);
    molecules_container_t molecules_container;
    int molid = molecules_container.read_pdb(pdbfile);
    std::cout << "pdb read result " << molid << std::endl;
    int mapid = molecules_container.read_mtz(mapfile,f,phi,wt,use_wt,is_diff);
    std::cout << "Map read result " << mapid << std::endl;

    coot::validation_information_t result = molecules_container.density_fit_analysis(molid, mapid);
    int index_for_chain = result.get_index_for_chain(chainId);
    std::cout << "index_for_chain " << chainId << ": " << index_for_chain << std::endl;

    std::cout << result.cviv[index_for_chain].rviv.size() << std::endl;

    for(unsigned ir=0;ir<result.cviv[index_for_chain].rviv.size();ir++){
        std::cout << result.cviv[index_for_chain].rviv[ir].label << " " << result.cviv[index_for_chain].rviv[ir].distortion << std::endl;
        std::cout << result.cviv[index_for_chain].rviv[ir].residue_spec.model_number << " ";
        std::cout << result.cviv[index_for_chain].rviv[ir].residue_spec.chain_id << " ";
        std::cout << result.cviv[index_for_chain].rviv[ir].residue_spec.res_no << " ";
        std::cout << result.cviv[index_for_chain].rviv[ir].residue_spec.ins_code << " ";
        std::cout << result.cviv[index_for_chain].rviv[ir].residue_spec.int_user_data << std::endl;
    }

    return 0;
}
