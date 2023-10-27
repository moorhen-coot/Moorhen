import { useRef } from "react";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { addMap } from "../../store/mapsSlice";

export const MoorhenFlipMapHandMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const selectRef = useRef<HTMLSelectElement>(null)

    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return
        }

        const mapNo = parseInt(selectRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap) {
            return
        }

        const result  = await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'flip_hand',
            commandArgs: [ mapNo ]
        }, true) as moorhen.WorkerResponse<number>

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result
            newMap.name = `Flipped map ${mapNo}`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            newMap.suggestedContourLevel = selectedMap.suggestedContourLevel
            newMap.contourLevel = selectedMap.contourLevel
            dispatch( addMap(newMap) )
        }
    }

    return <MoorhenBaseMenuItem
        id='flip-hand-map-menu-item'
        popoverContent={<MoorhenMapSelect maps={maps} ref={selectRef} />}
        menuItemText="Flip map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

