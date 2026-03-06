import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { LigandInfo } from "../../utils/MoorhenMolecule";
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenLigandValidation = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<LigandInfo[]> => {
        let ligandInfo: LigandInfo[] = [];
        const selectedMolecule = molecules.find((molecule) => molecule.molNo === selectedModel);

        if (selectedMolecule) {
            ligandInfo = await Promise.all(
                selectedMolecule.ligands.map(async (ligand) => {
                    const ligandSVG = await selectedMolecule.getLigandSVG(ligand.resName, true);
                    return { ...ligand, svg: ligandSVG };
                })
            );
        }

        return ligandInfo;
    };

    const getCards = (selectedModel: number, selectedMap: number, ligandInfo: LigandInfo[]): React.JSX.Element[] => {
        const selectedMolecule = molecules.find((molecule) => molecule.molNo === selectedModel);

        if (!selectedMolecule) {
            return [];
        }

        return ligandInfo.map((ligand, index) => {
            return (
                <MoorhenLigandCard
                    key={`${ligand.cid}-${selectedModel}`}
                    ligand={ligand}
                    molecule={selectedMolecule}
                    calculateQScore={true}
                />
            );
        });
    };

    return (
        <MoorhenValidationListWidgetBase
            enableMapSelect={false}
            fetchData={fetchCardData}
            getCards={getCards}
            menuId="ligand-validation"
        />
    );
};
