import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";
import { MoorhenAccordion, MoorhenMenuItem } from "../interface-base";
import { TreeBranch } from "../interface-base/Accordion/Tree";

export const CentreOnLigand = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const handleCentreOnLigand = (molNo: number, cid: string) => {
        const molecule = molecules.find(mol => mol.molNo === molNo);
        if (molecule) {
            molecule.centreOn(cid, true, true);
        }
    };

    return molecules.some(molecule => molecule.ligands.length > 0) ? (
        <div style={{ overflowY: "auto", maxHeight: convertViewtoPx(30, height) }}>
                {molecules
                    .filter(molecule => molecule.ligands.length > 0)
                    .map(molecule => {
                        const uniqueChainNames: string[] = molecule.ligands.reduce((uniqueChains: string[], lig) => {
                            if (!uniqueChains.includes(lig.chainName)) {
                                uniqueChains.push(lig.chainName);
                            }
                            return uniqueChains;
                        }, []);
                        return (
                            <TreeBranch key={molecule.molNo} label={molecule.name}>
                                {uniqueChainNames.map(chainName => {
                                    return (
                                        <TreeBranch
                                            key={`${molecule.molNo}-${chainName}`}
                                            // itemId={`${molecule.molNo}-${chainName}`}
                                            label={`Chain ${chainName}`}
                                        >
                                            {molecule.ligands
                                                .filter(lig => lig.chainName === chainName)
                                                .map(ligand => {
                                                    return (
                                                        <MoorhenMenuItem
                                                            key={`${molecule.molNo}-${ligand.cid}`}
                                                            // itemId={`${molecule.molNo}-${ligand.cid}`}
                                                            // label={ligand.cid}
                                                            onClick={() => handleCentreOnLigand(molecule.molNo,ligand.cid)}
                                                        >{ligand.cid}</MoorhenMenuItem>
                                                    );
                                                })}
                                        </TreeBranch>
                                    );
                                })}
                            </TreeBranch>
                        );
                    })}
        </div>
    ) : (
        <span>No ligands...</span>
    );
};
("Centre on ligand...");
