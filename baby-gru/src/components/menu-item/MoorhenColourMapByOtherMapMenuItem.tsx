import { useCallback, useRef } from "react";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';

export const MoorhenColourMapByOtherMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const maps = useSelector((state: moorhen.State) => state.maps)

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null)

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="With this map..."/>
    </>

    const onCompleted = useCallback(async () => {
        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value) {
            return
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value))
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value))

        if (!referenceMap || !colouringMap) {
            return
        }

        referenceMap.otherMapMolNoForColouring = colouringMap.molNo
        referenceMap.doCootContour(...props.glRef.current.origin.map(coord => -coord) as [number, number, number], referenceMap.mapRadius, referenceMap.contourLevel)

    }, [maps, props.glRef])

    return <MoorhenBaseMenuItem
        id='colour-map-by-other-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Colour map by other map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
