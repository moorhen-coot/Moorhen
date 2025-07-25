import { useSelector } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { privateer } from "../../types/privateer";
import { MoorhenCarbohydrateCard } from "../card/MoorhenCarbohydrateCard";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenCarbohydrateValidation = (props: moorhen.CollectedProps) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const fetchCardData = async (selectedModel: number): Promise<privateer.ResultsEntry[]> => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
        if (selectedMolecule) {
            const result = await selectedMolecule.getPrivateerValidation(true)
            return result
        }
    }

    const getCards = (selectedModel: number, selectedMap: number, privateerResults: privateer.ResultsEntry[]): React.JSX.Element[] => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (!selectedMolecule) {
            return []
        }

        return privateerResults.map((carbohydrate) => {
            return <MoorhenCarbohydrateCard key={carbohydrate.id} carbohydrate={carbohydrate} molecule={selectedMolecule}/>
        })
    }

    return <MoorhenValidationListWidgetBase
        enableMapSelect={false}
        fetchData={fetchCardData}
        getCards={getCards}
        menuId="carbohydrate-validation"
    />

}
