import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenFlipMapHandMenuItem = (props: {
    maps: moorhen.Map[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const selectRef = useRef<HTMLSelectElement>(null)

    const panelContent = <>
        <MoorhenMapSelect {...props} ref={selectRef} />
    </>


    const onCompleted = () => {
        const mapNo = parseInt(selectRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre)

        const blurMap = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'flip_hand',
                commandArgs: [mapNo
                ]
            }, true) as Promise<moorhen.WorkerResponse<number>>
        }

        blurMap()
            .then(result => {
                if (result.data.result.result !== -1) {
                    newMap.molNo = result.data.result.result
                    newMap.name = `Flipped map ${mapNo}`
                    const oldMaps = props.maps.filter(map => map.molNo === mapNo)
                    newMap.isDifference = oldMaps[0].isDifference
                    newMap.contourLevel = oldMaps[0].contourLevel
                    props.changeMaps({ action: 'Add', item: newMap })
                }
                return Promise.resolve(result)
            })
    }

    return <MoorhenBaseMenuItem
        id='sharpen-blur-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Flip map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

