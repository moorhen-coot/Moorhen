import { useRef } from "react";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";

export const MoorhenFlipMapHandMenuItem = (props: {
    maps: moorhen.Map[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const selectRef = useRef<HTMLSelectElement>(null)

    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return
        }

        const mapNo = parseInt(selectRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)

        const result  = await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'flip_hand',
            commandArgs: [ mapNo ]
        }, true) as moorhen.WorkerResponse<number>

        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result
            newMap.name = `Flipped map ${mapNo}`
            const oldMaps = props.maps.filter(map => map.molNo === mapNo)
            newMap.isDifference = oldMaps[0].isDifference
            newMap.contourLevel = oldMaps[0].contourLevel
            props.changeMaps({ action: 'Add', item: newMap })
        }
    }

    return <MoorhenBaseMenuItem
        id='flip-hand-map-menu-item'
        popoverContent={<MoorhenMapSelect {...props} ref={selectRef} />}
        menuItemText="Flip map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

