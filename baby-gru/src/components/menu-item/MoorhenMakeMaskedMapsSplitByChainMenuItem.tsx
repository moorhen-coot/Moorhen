import { useRef } from "react";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { batch, useDispatch, useSelector } from 'react-redux';
import { addMap } from "../../store/mapsSlice";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { useSnackbar } from "notistack";

export const MoorhenMakeMaskedMapsSplitByChainMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    store: ToolkitStore;
}) => {

    const moleculeSelectRef = useRef<HTMLSelectElement>(null)
    const mapSelectRef = useRef<HTMLSelectElement>(null)

    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const { enqueueSnackbar } = useSnackbar()

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
        <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} />
    </>

    const onCompleted = async () => {
        if (!mapSelectRef.current?.value || !moleculeSelectRef.current?.value) {
            return
        }
        
        const mapNo = parseInt(mapSelectRef.current.value)
        const moleculeNo = parseInt(moleculeSelectRef.current.value)
        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeNo)
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap || !selectedMolecule) {
            return
        }

        const result = await props.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'make_masked_maps_split_by_chain',
            commandArgs: [moleculeNo, mapNo]
        }, false) as moorhen.WorkerResponse<number[]>
        
        if (result.data.result.result.length > 0) {
            await Promise.all(
                result.data.result.result.map(async (iNewMap, listIndex) =>{
                    const newMap = new MoorhenMap(props.commandCentre, props.glRef, props.store)
                    newMap.molNo = iNewMap
                    newMap.name = `Chain ${listIndex} of ${selectedMap.name}`
                    newMap.isDifference = selectedMap.isDifference
                    await newMap.getSuggestedSettings()
                    const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams()
                    batch(() => {
                        dispatch( setMapRadius({ molNo: newMap.molNo, radius: mapRadius }) )
                        dispatch( setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }) )
                        dispatch( setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }) )
                        dispatch( setMapStyle({ molNo: newMap.molNo, style: mapStyle }) )
                        dispatch( hideMap(selectedMap) )
                        dispatch( addMap(newMap) )
                    })
                })
            )
        } else {
            enqueueSnackbar("Unable to create mask", {variant: "error"})
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

