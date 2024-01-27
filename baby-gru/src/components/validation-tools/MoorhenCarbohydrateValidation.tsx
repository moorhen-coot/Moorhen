import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from 'react-redux';
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {PrivateerResultsEntry} from "../../types/privateer"
import {setHoveredAtom} from "../../moorhen"
import {MoorhenCarbohydrateCard} from "../card/MoorhenCarbohydrateCard";
import {MoorhenValidationListWidgetBase} from "./MoorhenValidationListWidgetBase";
interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenCarbohydrateValidation = (props: Props) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>();
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [privateerData, setPrivateerData] = useState<null | PrivateerResultsEntry[]>(null)

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const dispatch = useDispatch()
    const handleHover = useCallback((residueLabel: string) => {
        if (selectedModel !== null) {
            const molecule = molecules.find(item => item.molNo === selectedModel)
            if (molecule) {
                const [chain, resName, resNum] = residueLabel.split('/')
                const cid = `//${chain}/${resNum}(${resName})`
                dispatch(setHoveredAtom({molecule, cid}))
            }
        }
    }, [selectedModel, molecules])

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }

    }, [molecules.length])


    const fetchCardData = async (selectedModel: number): Promise<PrivateerResultsEntry[]> => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
        if (selectedMolecule) {
            return new Promise(async (resolve, _) => {
                const privateerResult = await props.commandCentre.current.cootCommand({
                    command: 'privateer_validate',
                    commandArgs: [selectedMolecule.molNo],
                    returnType: 'privateer_results'
                }, false)

                const privateerData: PrivateerResultsEntry[] = privateerResult.data.result.result;
                resolve(privateerData)
            })
        }
    }

    const getCards = (selectedModel: number, selectedMap: number, privateerResults: PrivateerResultsEntry[]): JSX.Element[] => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (!selectedMolecule) {
            return []
        }

        return privateerResults.map((carbohydrate) => {
            return <MoorhenCarbohydrateCard carbohydrate={carbohydrate} molecule={selectedMolecule}/>
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
