import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";

export const MoorhenLigandValidation = (props: moorhen.CollectedProps) => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<moorhen.LigandInfo[]> => {
        let ligandInfo: moorhen.LigandInfo[] = []
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (selectedMolecule) {
            ligandInfo = await Promise.all(selectedMolecule.ligands.map(async (ligand) => {
                const ligandSVG = await selectedMolecule.getLigandSVG(ligand.resName, true)
                return {...ligand, svg: ligandSVG}
            }))
        }

        return ligandInfo
    }

    const getCards = (selectedModel: number, selectedMap: number, ligandInfo: moorhen.LigandInfo[]): React.JSX.Element[] => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (!selectedMolecule) {
            return []
        }

        return ligandInfo.map((ligand, index) => {
            return <MoorhenLigandCard key={`${ligand.cid}-${selectedModel}`} ligand={ligand} molecule={selectedMolecule} calculateQScore={true}/>
        })
    }

    return <MoorhenValidationListWidgetBase
                enableMapSelect={false}
                fetchData={fetchCardData}
                getCards={getCards}
                menuId="ligand-validation"
            />
}
