import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";
import { getLigandSVG } from "../../utils/MoorhenUtils";

interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenLigandValidation = (props: Props) => {
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<moorhen.LigandInfo[]> => {
        let ligandInfo: moorhen.LigandInfo[] = []
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (selectedMolecule) {
            ligandInfo = await Promise.all(selectedMolecule.ligands.map(async (ligand) => {
                const ligandSVG = await getLigandSVG(props.commandCentre, selectedModel, ligand.resName, isDark)
                return {...ligand, svg: ligandSVG}
            }))
        }

        return ligandInfo
    }

    const getCards = (selectedModel: number, selectedMap: number, ligandInfo: moorhen.LigandInfo[]): JSX.Element[] => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (!selectedMolecule) {
            return []
        }

        return ligandInfo.map((ligand, index) => {
            return <MoorhenLigandCard key={`${ligand.cid}-${selectedModel}`} ligand={ligand} molecule={selectedMolecule}/>
        })
    }

    return <MoorhenValidationListWidgetBase
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                enableMapSelect={false}
                fetchData={fetchCardData}
                getCards={getCards}
            />
}