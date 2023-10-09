import { useRef } from "react";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";

export const MoorhenMakeMaskedMapsSplitByChainMenuItem = (props: {
    maps: moorhen.Map[];
    molecules: moorhen.Molecule[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement>(null)
    const mapSelectRef = useRef<HTMLSelectElement>(null)

    const panelContent = <>
        <MoorhenMapSelect {...props} ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} ref={moleculeSelectRef} />
    </>

    const onCompleted = async () => {
        if (!mapSelectRef.current?.value || !moleculeSelectRef.current?.value) {
            return
        }
        
        const mapNo = parseInt(mapSelectRef.current.value)
        const moleculeNo = parseInt(moleculeSelectRef.current.value)

        const result = await props.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'make_masked_maps_split_by_chain',
            commandArgs: [moleculeNo, mapNo]
        }, false) as moorhen.WorkerResponse<number[]>

        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === moleculeNo)
        const selectedMap = props.maps.find(map => map.molNo === mapNo)
        
        if (result.data.result.result.length > 0 && selectedMap && selectedMolecule) {
            result.data.result.result.forEach((iNewMap, listIndex) =>{
                const newMap = new MoorhenMap(props.commandCentre, props.glRef)
                newMap.molNo = iNewMap
                newMap.name = `Chain ${listIndex} of ${selectedMap.name}`
                newMap.isDifference = selectedMap.isDifference
                newMap.suggestedContourLevel = selectedMap.contourLevel
                newMap.suggestedRadius = selectedMap.mapRadius
                props.changeMaps({ action: 'Add', item: newMap })
            })
        }
        return result
    }

    return <MoorhenBaseMenuItem
        id='make-masked-maps-split-by-chain-menu-item'
        popoverContent={panelContent}
        menuItemText="Split map by chain..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

