import { useRef } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { addMap } from "../../store/mapsSlice";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhenGlobalInstance } from "../../InstanceManager/MoorhenGlobalInstance";

export const MoorhenFlipMapHandMenuItem = () => {

    const dispatch = useDispatch()

    const maps = useSelector((state: moorhen.State) => state.maps)
    
    const selectRef = useRef<HTMLSelectElement>(null)
    const commandCentre = moorhenGlobalInstance.getCommandCentreRef();

    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return
        }

        const mapNo = parseInt(selectRef.current.value)
        const newMap = new MoorhenMap()
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap) {
            return
        }

        const result  = await commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'flip_hand',
            commandArgs: [ mapNo ]
        }, true) as moorhen.WorkerResponse<number>

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result
            newMap.name = `Flipped map ${mapNo}`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams()
            batch(() => {
                dispatch( setMapRadius({ molNo: newMap.molNo, radius: mapRadius }) )
                dispatch( setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }) )
                dispatch( setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }) )
                dispatch( setMapStyle({ molNo: newMap.molNo, style: mapStyle }) )
                dispatch( hideMap(selectedMap) )
                dispatch( addMap(newMap) )    
            })
        }
    }

    return <MoorhenBaseMenuItem
        id='flip-hand-map-menu-item'
        popoverContent={<MoorhenMapSelect maps={maps} ref={selectRef} />}
        menuItemText="Flip map..."
        onCompleted={onCompleted}
    />
}

