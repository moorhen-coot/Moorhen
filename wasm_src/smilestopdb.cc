#include <string>
#include <vector>
#include <utility>

#include "rdkit/GraphMol/SmilesParse/SmilesParse.h"
#include "rdkit/GraphMol/FileParsers/MolSupplier.h"
#include "rdkit/GraphMol/FileParsers/MolWriters.h"
#include "rdkit/GraphMol/FileParsers/FileParsers.h"
#include "rdkit/GraphMol/DistGeomHelpers/Embedder.h"
#include "rdkit/RDGeneral/FileParseException.h"

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
#include "rdkit/GraphMol/Substruct/SubstructMatch.h"
#include "rdkit/GraphMol/Substruct/SubstructUtils.h"

std::pair<std::string, std::string> MolToPDB(RDKit::RWMol *mol, const std::string &TLC, int nconf, int maxIters, bool keep_orig_coords, bool minimize);

std::string writeCIF(RDKit::RWMol *mol, const std::string &resname="UNL",  int confId=0){
    RDKit::AtomMonomerInfo *info = mol->getAtomWithIdx(0)->getMonomerInfo();
    std::map<std::string,int> elemMap;
    std::map<int,std::string> atomMap;

    //Some energy type approximations.
    std::vector<RDKit::MatchVectType> matchVectNT3;
    std::vector<RDKit::MatchVectType> matchVectNT2;
    std::vector<RDKit::MatchVectType> matchVectNT1;
    std::vector<RDKit::MatchVectType> matchVectNT;
    std::vector<RDKit::MatchVectType> matchVectCH3;
    std::vector<RDKit::MatchVectType> matchVectCH2;
    std::vector<RDKit::MatchVectType> matchVectCH1;
    std::vector<RDKit::MatchVectType> matchVectCT;
    std::vector<RDKit::MatchVectType> matchVectCSP;
    std::vector<RDKit::MatchVectType> matchVectCSP1;
    std::vector<RDKit::MatchVectType> matchVectCarbonyl;
    std::vector<RDKit::MatchVectType> matchVectCarboxylate;
    std::vector<RDKit::MatchVectType> matchVectCarboxylateH;
    std::vector<RDKit::MatchVectType> matchVectAldehydeH1;
    std::vector<RDKit::MatchVectType> matchVectAldehydeH2;
    std::vector<RDKit::MatchVectType> matchVectNSP;
    std::vector<RDKit::MatchVectType> matchVectNSP1;
    std::vector<RDKit::MatchVectType> matchVectSX3;
    std::vector<RDKit::MatchVectType> matchVectSX2;
    std::vector<RDKit::MatchVectType> matchVectSX1;
    std::vector<RDKit::MatchVectType> matchVectSH1;
    std::vector<RDKit::MatchVectType> matchVectPX3;
    std::vector<RDKit::MatchVectType> matchVectOX2;

    std::vector<RDKit::MatchVectType> matchVectNC1;
    std::vector<RDKit::MatchVectType> matchVectNC2;
    std::vector<RDKit::MatchVectType> matchVectNH1;
    std::vector<RDKit::MatchVectType> matchVectNH2;
    std::vector<RDKit::MatchVectType> matchVectNRD5;
    std::vector<RDKit::MatchVectType> matchVectNRD6;
    std::vector<RDKit::MatchVectType> matchVectNR15;
    std::vector<RDKit::MatchVectType> matchVectNR16;
    std::vector<RDKit::MatchVectType> matchVectNR5;
    std::vector<RDKit::MatchVectType> matchVectNR6;
    std::vector<RDKit::MatchVectType> matchVectOH1;

    RDKit::RWMol *pattNC1 = RDKit::SmartsToMol( "[CX3]=[NH1&^2]" );
    RDKit::RWMol *pattNC2 = RDKit::SmartsToMol( "[CX3]=[NH2&^2]" );
    RDKit::RWMol *pattNH1 = RDKit::SmartsToMol( "[#6][NH1&^2][#6]" );
    RDKit::RWMol *pattNH2 = RDKit::SmartsToMol( "[CX3](=O)[NH2&^2]" );
    RDKit::RWMol *pattNRD5 = RDKit::SmartsToMol( "[NH0;r5]" );
    RDKit::RWMol *pattNRD6 = RDKit::SmartsToMol( "[NH0;r6]" );
    RDKit::RWMol *pattNR15 = RDKit::SmartsToMol( "[NH1;r5]" );
    RDKit::RWMol *pattNR16 = RDKit::SmartsToMol( "[NH1;r6]" );
    RDKit::RWMol *pattNR5 = RDKit::SmartsToMol( "[ND3;r5]" );
    RDKit::RWMol *pattNR6 = RDKit::SmartsToMol( "[ND3;r6]" );
    RDKit::RWMol *pattOH1 = RDKit::SmartsToMol( "[#6][OX2H]" );
    RDKit::RWMol *pattOX2 = RDKit::SmartsToMol( "[OX2]" );
    RDKit::RWMol *pattPX3 = RDKit::SmartsToMol( "[PX3]" );
    RDKit::RWMol *pattSX3 = RDKit::SmartsToMol( "[SX3]" );
    RDKit::RWMol *pattSX2 = RDKit::SmartsToMol( "[SX2]" );
    RDKit::RWMol *pattSX1 = RDKit::SmartsToMol( "[SX1]" );
    RDKit::RWMol *pattSH1 = RDKit::SmartsToMol( "[SH1]" );
    RDKit::RWMol *pattCH3 = RDKit::SmartsToMol( "[CH3]" );
    RDKit::RWMol *pattCH2 = RDKit::SmartsToMol( "[CH2&^3]" );
    RDKit::RWMol *pattCH1 = RDKit::SmartsToMol( "[CH1&^3]" );
    RDKit::RWMol *pattCT = RDKit::SmartsToMol( "[CH0&^3]" );
    RDKit::RWMol *pattNT = RDKit::SmartsToMol( "[NH0]" );
    RDKit::RWMol *pattNT3 = RDKit::SmartsToMol( "[NH3]" );
    RDKit::RWMol *pattNT2 = RDKit::SmartsToMol( "[NH2&^3]" );
    RDKit::RWMol *pattNT1 = RDKit::SmartsToMol( "[NH1&^3]" );
    RDKit::RWMol *pattCSP = RDKit::SmartsToMol( "[CH0&^1]" );
    RDKit::RWMol *pattCSP1 = RDKit::SmartsToMol( "[CH&^1]" );
    RDKit::RWMol *pattNSP = RDKit::SmartsToMol( "[NH0&^1]" );
    RDKit::RWMol *pattNSP1 = RDKit::SmartsToMol( "[NH&^1]" );
    RDKit::RWMol *pattCarbonyl = RDKit::SmartsToMol( "[CX3]=[OX1]" );
    RDKit::RWMol *pattCarboxylate = RDKit::SmartsToMol( "[CX3](=O)[O-]" );
    RDKit::RWMol *pattCarboxylateH = RDKit::SmartsToMol( "[CX3](=O)[OH]" );
    RDKit::RWMol *pattAldehydeH1 = RDKit::SmartsToMol( "[#6][CX3](=O)[#1]" );
    RDKit::RWMol *pattAldehydeH2 = RDKit::SmartsToMol( "[#1][CX3](=O)[#1]" );

    unsigned dummyNC1 = RDKit::SubstructMatch( *mol , *pattNC1 , matchVectNC1);
    unsigned dummyNC2 = RDKit::SubstructMatch( *mol , *pattNC2 , matchVectNC2);
    unsigned dummyNH1 = RDKit::SubstructMatch( *mol , *pattNH1 , matchVectNH1);
    unsigned dummyNH2 = RDKit::SubstructMatch( *mol , *pattNH2 , matchVectNH2);
    unsigned dummyNRD5 = RDKit::SubstructMatch( *mol , *pattNRD5 , matchVectNRD5);
    unsigned dummyNRD6 = RDKit::SubstructMatch( *mol , *pattNRD6 , matchVectNRD6);
    unsigned dummyNR15 = RDKit::SubstructMatch( *mol , *pattNR15 , matchVectNR15);
    unsigned dummyNR16 = RDKit::SubstructMatch( *mol , *pattNR16 , matchVectNR16);
    unsigned dummyNR5 = RDKit::SubstructMatch( *mol , *pattNR5 , matchVectNR5);
    unsigned dummyNR6 = RDKit::SubstructMatch( *mol , *pattNR6 , matchVectNR6);
    unsigned dummyOH1 = RDKit::SubstructMatch( *mol , *pattOH1 , matchVectOH1);

    unsigned dummyPX3 = RDKit::SubstructMatch( *mol , *pattPX3 , matchVectPX3);
    unsigned dummySX3 = RDKit::SubstructMatch( *mol , *pattSX3 , matchVectSX3);
    unsigned dummySX2 = RDKit::SubstructMatch( *mol , *pattSX2 , matchVectSX2);
    unsigned dummyOX2 = RDKit::SubstructMatch( *mol , *pattOX2 , matchVectOX2);
    unsigned dummySX1 = RDKit::SubstructMatch( *mol , *pattSX1 , matchVectSX1);
    unsigned dummySH1 = RDKit::SubstructMatch( *mol , *pattSH1 , matchVectSH1);
    unsigned dummyCH3 = RDKit::SubstructMatch( *mol , *pattCH3 , matchVectCH3);
    unsigned dummyCH2 = RDKit::SubstructMatch( *mol , *pattCH2 , matchVectCH2);
    unsigned dummyCH1 = RDKit::SubstructMatch( *mol , *pattCH1 , matchVectCH1);
    unsigned dummyCH0 = RDKit::SubstructMatch( *mol , *pattCT , matchVectCT);
    unsigned dummyNH3 = RDKit::SubstructMatch( *mol , *pattNT3 , matchVectNT3);
    unsigned dummyNT2 = RDKit::SubstructMatch( *mol , *pattNT2 , matchVectNT2);
    unsigned dummyNT1 = RDKit::SubstructMatch( *mol , *pattNT1 , matchVectNT1);
    unsigned dummyNH0 = RDKit::SubstructMatch( *mol , *pattNT , matchVectNT);
    unsigned dummyCSP = RDKit::SubstructMatch( *mol , *pattCSP , matchVectCSP);
    unsigned dummyCSP1 = RDKit::SubstructMatch( *mol , *pattCSP1 , matchVectCSP1);
    unsigned dummyNSP = RDKit::SubstructMatch( *mol , *pattNSP , matchVectNSP);
    unsigned dummyNSP1 = RDKit::SubstructMatch( *mol , *pattNSP1 , matchVectNSP1);
    unsigned dummyCarbonyl = RDKit::SubstructMatch( *mol , *pattCarbonyl , matchVectCarbonyl);
    unsigned dummyCarboxylate = RDKit::SubstructMatch( *mol , *pattCarboxylate , matchVectCarboxylate);
    unsigned dummyCarboxylateH = RDKit::SubstructMatch( *mol , *pattCarboxylateH , matchVectCarboxylateH);
    unsigned dummyAldehydeH1 = RDKit::SubstructMatch( *mol , *pattAldehydeH1 , matchVectAldehydeH1);
    unsigned dummyAldehydeH2 = RDKit::SubstructMatch( *mol , *pattAldehydeH2 , matchVectAldehydeH2);

    std::vector<int> NC1;
    std::vector<int> NC2;
    std::vector<int> NH1;
    std::vector<int> NH2;
    std::vector<int> NRD5;
    std::vector<int> NRD6;
    std::vector<int> NR15;
    std::vector<int> NR16;
    std::vector<int> NR5;
    std::vector<int> NR6;
    std::vector<int> OH1;
    std::vector<int> NT3;
    std::vector<int> NT2;
    std::vector<int> NT1;
    std::vector<int> NT;
    std::vector<int> CH3;
    std::vector<int> CH2;
    std::vector<int> CH1;
    std::vector<int> CT;
    std::vector<int> CSP;
    std::vector<int> CSP1;
    std::vector<int> NSP;
    std::vector<int> NSP1;
    std::vector<int> Carbonyl;
    std::vector<int> Carboxylate;
    std::vector<int> Aldehyde;
    std::vector<int> SX3;
    std::vector<int> SX2;
    std::vector<int> SX1;
    std::vector<int> SH1;
    std::vector<int> PX3;
    std::vector<int> OX2;

    bool debug = false;

    if(debug) std::cout << "##################################################" << std::endl;

    if(debug) std::cout << "   Matches NC1" << std::endl;
    for( size_t i = 0 ; i < matchVectNC1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNC1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNC1[i][j].first << "," << matchVectNC1[i][j].second << ") " << std::endl;
            NC1.push_back(matchVectNC1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NC2" << std::endl;
    for( size_t i = 0 ; i < matchVectNC2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNC2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNC2[i][j].first << "," << matchVectNC2[i][j].second << ") " << std::endl;
            NC2.push_back(matchVectNC2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NH1" << std::endl;
    for( size_t i = 0 ; i < matchVectNH1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNH1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNH1[i][j].first << "," << matchVectNH1[i][j].second << ") " << std::endl;
            NH1.push_back(matchVectNH1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NH2" << std::endl;
    for( size_t i = 0 ; i < matchVectNH2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNH2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNH2[i][j].first << "," << matchVectNH2[i][j].second << ") " << std::endl;
            NH2.push_back(matchVectNH2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NRD5" << std::endl;
    for( size_t i = 0 ; i < matchVectNRD5.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNRD5[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNRD5[i][j].first << "," << matchVectNRD5[i][j].second << ") " << std::endl;
            NRD5.push_back(matchVectNRD5[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NRD6" << std::endl;
    for( size_t i = 0 ; i < matchVectNRD6.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNRD6[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNRD6[i][j].first << "," << matchVectNRD6[i][j].second << ") " << std::endl;
            NRD6.push_back(matchVectNRD6[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NR15" << std::endl;
    for( size_t i = 0 ; i < matchVectNR15.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNR15[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNR15[i][j].first << "," << matchVectNR15[i][j].second << ") " << std::endl;
            NR15.push_back(matchVectNR15[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NR16" << std::endl;
    for( size_t i = 0 ; i < matchVectNR16.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNR16[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNR16[i][j].first << "," << matchVectNR16[i][j].second << ") " << std::endl;
            NR16.push_back(matchVectNR16[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NR5" << std::endl;
    for( size_t i = 0 ; i < matchVectNR5.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNR5[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNR5[i][j].first << "," << matchVectNR5[i][j].second << ") " << std::endl;
            NR5.push_back(matchVectNR5[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NR6" << std::endl;
    for( size_t i = 0 ; i < matchVectNR6.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNR6[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNR6[i][j].first << "," << matchVectNR6[i][j].second << ") " << std::endl;
            NR6.push_back(matchVectNR6[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches OH1" << std::endl;
    for( size_t i = 0 ; i < matchVectOH1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectOH1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectOH1[i][j].first << "," << matchVectOH1[i][j].second << ") " << std::endl;
            OH1.push_back(matchVectOH1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches OX2" << std::endl;
    for( size_t i = 0 ; i < matchVectOX2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectOX2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectOX2[i][j].first << "," << matchVectOX2[i][j].second << ") " << std::endl;
            OX2.push_back(matchVectOX2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches PX3" << std::endl;
    for( size_t i = 0 ; i < matchVectPX3.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectPX3[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectPX3[i][j].first << "," << matchVectPX3[i][j].second << ") " << std::endl;
            PX3.push_back(matchVectPX3[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches SX3" << std::endl;
    for( size_t i = 0 ; i < matchVectSX3.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectSX3[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectSX3[i][j].first << "," << matchVectSX3[i][j].second << ") " << std::endl;
            SX3.push_back(matchVectSX3[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches SX2" << std::endl;
    for( size_t i = 0 ; i < matchVectSX2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectSX2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectSX2[i][j].first << "," << matchVectSX2[i][j].second << ") " << std::endl;
            SX2.push_back(matchVectSX2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches SX1" << std::endl;
    for( size_t i = 0 ; i < matchVectSX1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectSX1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectSX1[i][j].first << "," << matchVectSX1[i][j].second << ") " << std::endl;
            SX1.push_back(matchVectSX1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches SH1" << std::endl;
    for( size_t i = 0 ; i < matchVectSX1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectSH1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectSH1[i][j].first << "," << matchVectSH1[i][j].second << ") " << std::endl;
            SH1.push_back(matchVectSH1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NT3" << std::endl;
    for( size_t i = 0 ; i < matchVectNT3.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNT3[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNT3[i][j].first << "," << matchVectNT3[i][j].second << ") " << std::endl;
            NT3.push_back(matchVectNT3[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NT2" << std::endl;
    for( size_t i = 0 ; i < matchVectNT2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectNT2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNT2[i][j].first << "," << matchVectNT2[i][j].second << ") " << std::endl;
            NT2.push_back(matchVectNT2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NT1" << std::endl;
    for( size_t i = 0 ; i < matchVectNT1.size() ; ++i ) {
        for( size_t j = 0 ;j < matchVectNT1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNT1[i][j].first << "," << matchVectNT1[i][j].second << ") " << std::endl;
            NT1.push_back(matchVectNT1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches NT" << std::endl;
    for( size_t i = 0 ; i < matchVectNT.size() ; ++i ) {
        for( size_t j = 0 ;j < matchVectNT[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectNT[i][j].first << "," << matchVectNT[i][j].second << ") " << std::endl;
            NT.push_back(matchVectNT[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches CH3" << std::endl;
    for( size_t i = 0 ; i < matchVectCH3.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCH3[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCH3[i][j].first << "," << matchVectCH3[i][j].second << ") " << std::endl;
            CH3.push_back(matchVectCH3[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches CH2" << std::endl;
    for( size_t i = 0 ; i < matchVectCH2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCH2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCH2[i][j].first << "," << matchVectCH2[i][j].second << ") " << std::endl;
            CH2.push_back(matchVectCH2[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches CH1" << std::endl;
    for( size_t i = 0 ; i < matchVectCH1.size() ; ++i ) {
        for( size_t j = 0 ;j < matchVectCH1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCH1[i][j].first << "," << matchVectCH1[i][j].second << ") " << std::endl;
            CH1.push_back(matchVectCH1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches CT" << std::endl;
    for( size_t i = 0 ; i < matchVectCT.size() ; ++i ) {
        for( size_t j = 0 ;j < matchVectCT[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCT[i][j].first << "," << matchVectCT[i][j].second << ") " << std::endl;
            CT.push_back(matchVectCT[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches C Triple without H" << std::endl;
    for( size_t i = 0 ; i < matchVectCSP.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCSP[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCSP[i][j].first << "," << matchVectCSP[i][j].second << ") " << std::endl;
            CSP.push_back(matchVectCSP[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches C Triple with H" << std::endl;
    for( size_t i = 0 ; i < matchVectCSP1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCSP1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCSP1[i][j].first << "," << matchVectCSP1[i][j].second << ") " << std::endl;
            CSP1.push_back(matchVectCSP1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches Carbonyl (not aldehyde)" << std::endl;
    for( size_t i = 0 ; i < matchVectCarbonyl.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCarbonyl[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCarbonyl[i][j].first << "," << matchVectCarbonyl[i][j].second << ") " << std::endl;
            Carbonyl.push_back(matchVectCarbonyl[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches Carboxylate" << std::endl;
    for( size_t i = 0 ; i < matchVectCarboxylate.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCarboxylate[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCarboxylate[i][j].first << "," << matchVectCarboxylate[i][j].second << ") " << std::endl;
            Carboxylate.push_back(matchVectCarboxylate[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches CarboxylateH" << std::endl;
    for( size_t i = 0 ; i < matchVectCarboxylateH.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectCarboxylateH[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectCarboxylateH[i][j].first << "," << matchVectCarboxylateH[i][j].second << ") " << std::endl;
            Carboxylate.push_back(matchVectCarboxylateH[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches Aldehyde 1H" << std::endl;
    for( size_t i = 0 ; i < matchVectAldehydeH1.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectAldehydeH1[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectAldehydeH1[i][j].first << "," << matchVectAldehydeH1[i][j].second << ") " << std::endl;
            Aldehyde.push_back(matchVectAldehydeH1[i][j].second);
        }
    }
    if(debug) std::cout << "   Matches Aldehyde 2H" << std::endl;
    for( size_t i = 0 ; i < matchVectAldehydeH2.size() ; ++i ) {
        for( size_t j = 0 ; j < matchVectAldehydeH2[i].size() ; ++j ) {
            if(debug) std::cout << "(" << matchVectAldehydeH2[i][j].first << "," << matchVectAldehydeH2[i][j].second << ") " << std::endl;
            Aldehyde.push_back(matchVectAldehydeH2[i][j].second);
        }
    }
    if(debug) std::cout << "##################################################" << std::endl;

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
    output << "_chem_comp_atom.charge\n";
    output << "_chem_comp_atom.x\n";
    output << "_chem_comp_atom.y\n";
    output << "_chem_comp_atom.z\n";
    // FIXME Loop over atoms.
    // FAD           O2P    O    OP       -0.500      0.000    0.000    0.000
    atomIter = mol->beginAtoms();
    const RDKit::Conformer *conf=&(mol->getConformer(confId));
    int atomIdx = 0;
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
        std::string energy_type;

        energy_type = symbol;
        if(symbol.length()>1) {
            for (auto & c: energy_type) c = toupper(c);
        }
        for (auto & c: name) c = toupper(c);

        if(symbol=="O") {
            if(std::find(Carboxylate.begin(), Carboxylate.end(), atomIdx) != Carboxylate.end()){
                energy_type = "OC";
            } else if(std::find(OX2.begin(), OX2.end(), atomIdx) != OX2.end()){
                energy_type = "O2";
            } else if(std::find(OH1.begin(), OH1.end(), atomIdx) != OH1.end()){
                energy_type = "OH1";
            }
        } else if(symbol=="N") {
            if(std::find(NSP1.begin(), NSP1.end(), atomIdx) != NSP1.end()){
                energy_type = "NSP1";
            } else if(std::find(NSP.begin(), NSP.end(), atomIdx) != NSP.end()){
                energy_type = "NSP";
            } else if(std::find(NT3.begin(), NT3.end(), atomIdx) != NT3.end()){
                energy_type = "NT3";
            } else if(std::find(NT2.begin(), NT2.end(), atomIdx) != NT2.end()){
                energy_type = "NT2";
            } else if(std::find(NT1.begin(), NT1.end(), atomIdx) != NT1.end()){
                energy_type = "NT1";
            } else if(std::find(NT.begin(), NT.end(), atomIdx) != NT.end()){
                energy_type = "NT";
            } else if(std::find(NC1.begin(), NC1.end(), atomIdx) != NC1.end()){
                energy_type = "NC1";
            } else if(std::find(NC2.begin(), NC2.end(), atomIdx) != NC2.end()){
                energy_type = "NC2";
            } else if(std::find(NH1.begin(), NH1.end(), atomIdx) != NH1.end()){
                energy_type = "NH1";
            } else if(std::find(NH2.begin(), NH2.end(), atomIdx) != NH2.end()){
                energy_type = "NH2";
            } else if(std::find(NRD5.begin(), NRD5.end(), atomIdx) != NRD5.end()){
                energy_type = "NRD5";
            } else if(std::find(NRD6.begin(), NRD6.end(), atomIdx) != NRD6.end()){
                energy_type = "NRD6";
            } else if(std::find(NR15.begin(), NR15.end(), atomIdx) != NR15.end()){
                energy_type = "NR15";
            } else if(std::find(NR16.begin(), NR16.end(), atomIdx) != NR16.end()){
                energy_type = "NR16";
            }
        } else if(symbol=="S") {
            if(std::find(SX3.begin(), SX3.end(), atomIdx) != SX3.end()){
                energy_type = "S3";
            } else if(std::find(SX2.begin(), SX2.end(), atomIdx) != SX2.end()){
                energy_type = "S2";
            } else if(std::find(SX1.begin(), SX1.end(), atomIdx) != SX1.end()){
                energy_type = "S1";
            } else if(std::find(SH1.begin(), SH1.end(), atomIdx) != SH1.end()){
                energy_type = "SH1";
            }
        } else if(symbol=="P") {
            if(std::find(PX3.begin(), PX3.end(), atomIdx) != PX3.end()){
                energy_type = "P1";
            }
        } else if(symbol=="C") {
            if(std::find(CSP1.begin(), CSP1.end(), atomIdx) != CSP1.end()){
                energy_type = "CSP1";
            } else if(std::find(CSP.begin(), CSP.end(), atomIdx) != CSP.end()){
                energy_type = "CSP";
            } else if(std::find(CH3.begin(), CH3.end(), atomIdx) != CH3.end()){
                energy_type = "CH3";
            } else if(std::find(CH2.begin(), CH2.end(), atomIdx) != CH2.end()){
                energy_type = "CH2";
            } else if(std::find(CH1.begin(), CH1.end(), atomIdx) != CH1.end()){
                energy_type = "CH1";
            } else if(std::find(CT.begin(), CT.end(), atomIdx) != CT.end()){
                energy_type = "CT";
            }
        }

        atomMap[(*atomIter)->getIdx()] = name;
        output << resname << "           " << name << " " << symbol  << " " << energy_type << " " << charge << " " << x << " " << y << " " << z << "\n";
      }
  
      atomIter++; atomIdx++;
    }
    output << "loop_\n";
    output << "_chem_comp_bond.comp_id\n";
    output << "_chem_comp_bond.atom_id_1\n";
    output << "_chem_comp_bond.atom_id_2\n";
    output << "_chem_comp_bond.type\n";
    output << "_chem_comp_bond.aromatic\n";
    output << "_chem_comp_bond.value_dist\n";
    output << "_chem_comp_bond.value_dist_esd\n";

    RDKit::RWMol *kekmol = new RDKit::RWMol(*mol);
    RDKit::MolOps::Kekulize(*kekmol);

    RDKit::ROMol::BondIterator bondIter = mol->beginBonds();
    RDKit::ROMol::BondIterator kekBondIter = kekmol->beginBonds();

    while(bondIter!=mol->endBonds()){
      std::string beginAtom =  atomMap[(*bondIter)->getBeginAtomIdx()];
      std::string endAtom =  atomMap[(*bondIter)->getEndAtomIdx()];
      const RDGeom::Point3D pos1 = conf->getAtomPos((*bondIter)->getBeginAtomIdx());
      const RDGeom::Point3D pos2 = conf->getAtomPos((*bondIter)->getEndAtomIdx());
      double bondLength = sqrt((pos1.x-pos2.x)*(pos1.x-pos2.x) + (pos1.y-pos2.y)*(pos1.y-pos2.y) + (pos1.z-pos2.z)*(pos1.z-pos2.z));
      std::string bondType;
      std::string aromaticFlag;
      bool isAromatic = mol->getAtomWithIdx((*bondIter)->getBeginAtomIdx())->getIsAromatic() && mol->getAtomWithIdx((*bondIter)->getEndAtomIdx())->getIsAromatic();
      if((*kekBondIter)->getBondType()==RDKit::Bond::DOUBLE){
         bondType = "DOUBLE";
      } else if((*kekBondIter)->getBondType()==RDKit::Bond::TRIPLE){
         bondType = "TRIPLE";
      } else {
         bondType = "SINGLE";
      }
      if(isAromatic){
          aromaticFlag = "y";
      } else {
          aromaticFlag = "n";
      }
      output << resname << "  " << "    " << beginAtom <<   " "  << endAtom  << " " << bondType  << " " << aromaticFlag << " " << bondLength << "  0.020\n";
      bondIter++; kekBondIter++;
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

std::pair<std::string, std::string> MolTextToPDB(const std::string &mol_text_cpp, const std::string &TLC, int nconf, int maxIters, bool keep_orig_coords, bool minimize){

    std::pair<std::string, std::string> retval;

    RDKit::RWMol *mol = 0;

    std::cout << mol_text_cpp << std::endl;

    RDKit::SDMolSupplier *ms = new RDKit::SDMolSupplier;
    ms->setData(mol_text_cpp,false,false);
    try {
        RDKit::ROMol* romol = ms->next();
        mol = new RDKit::RWMol(*romol);
        /*
        std::cout << "ROMol has " << romol->getNumAtoms() << " atoms" << std::endl;
        std::cout << "RWMol has " << mol->getNumAtoms() << " atoms" << std::endl;
        std::cout << "ROMol Conformer 0 has " << romol->getConformer(0).getNumAtoms() << " atoms" << std::endl;
        std::cout << "RWMol Conformer 0 has " << mol->getConformer(0).getNumAtoms() << " atoms" << std::endl;
        */
        return MolToPDB(mol,TLC,nconf,maxIters,keep_orig_coords,minimize);
    } catch (RDKit::FileParseException &e) {
        std::cout << e.what() << std::endl;
        return retval;
    }

    return retval;

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

    return MolToPDB(mol,TLC,nconf,maxIters,false,true);
}

std::pair<std::string, std::string> MolToPDB(RDKit::RWMol *mol, const std::string &TLC, int nconf, int maxIters, bool keep_orig_coords, bool minimize){

    std::pair<std::string, std::string> retval;

    try {
        if(keep_orig_coords){
           RDKit::MolOps::addHs(*mol,true,true);
        } else {
           RDKit::MolOps::addHs(*mol);
        }
    } catch (RDKit::MolSanitizeException &e) {
        std::cout << e.what() << std::endl;
        std::cout << "Error adding hydrogens to MOL in MolToPDB." << std::endl;
        return retval;
    }

    //But if the original file does *not* have hydrogens, then the H positions here will be undefined. 
    RDKit::Conformer orig_conf;
    if(keep_orig_coords){
        orig_conf = mol->getConformer(0);
    }

    if(minimize){
        try {
            RDKit::DGeomHelpers::EmbedMolecule(*mol);
        } catch (...) {
            std::cout << "Error embedding molecule in MolToPDB." << std::endl;
            return retval;
        }
    }

    int minCid=0;
    if(minimize){
        minCid = MolMinimize(mol, nconf, maxIters);
        if(minCid==-1){
            std::cout << "Minimize from MOL error in MolToPDB" << std::endl;
            return retval;
        }
    }

    if(keep_orig_coords){
        int newConfId = mol->addConformer(&orig_conf,true);
        minCid = newConfId;
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

    std::string pdb = RDKit::MolToPDBBlock( *mol, minCid );

    retval.first = pdb;
    retval.second = cif;

    return retval;

}

