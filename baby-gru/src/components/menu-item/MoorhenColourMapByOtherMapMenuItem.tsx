import { useCallback, useEffect, useRef, useState } from "react";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';
import { Button } from "react-bootstrap";
import { Checkbox } from "@mui/material";
import { Stack } from "@mui/material";
import { MoorhenRangeSlider } from "../inputs/MoorhenRangeSlider";
import { MoorhenSlider } from "../inputs/MoorhenSlider-new";

export const MoorhenColourMapByOtherMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const maps = useSelector((state: moorhen.State) => state.maps)

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null)

    const [minMaxValue, setMinMaxValue]  = useState<[number, number]>([-1, 1])
    const [locRes, setLocRes] = useState<boolean>(false)

    useEffect(() => {
        console.log('minMaxValue', minMaxValue)
    }, [minMaxValue])



    const handleCancel = (_evt) => {
        document.body.click()
    }

    const handleDefaultColour = (_evt) => {
        if (!mapSelectRef_1.current.value) {
            return
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value))
        
        if (!referenceMap) {
            return
        }

        referenceMap.setOtherMapForColouring(null)
        referenceMap.drawMapContour()
    }

    const handleApply = useCallback(async (_evt) => {
        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value) {
            return
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value))
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value))


        if (!referenceMap || !colouringMap) {
            return
        }

        referenceMap.setOtherMapForColouring(colouringMap.molNo, minMaxValue[0], minMaxValue[1])
        referenceMap.drawMapContour()

    }, [maps, props.glRef])

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..."/>
        <Checkbox 
        checked={locRes}
        onChange = {(evt) => setLocRes(evt.target.checked)}       
        /> 
        <span style={{margin: '0.5rem'}}>Local resolution map</span>
        <Stack direction="column" spacing={1} style={{alignItems: "center"}}>        
            <span style={{margin: '0.5rem'}}>Min/Max values</span>
            <MoorhenSlider
                externalValue={minMaxValue}
                minVal={-2.0}
                maxVal={2.0}
                setExternalRange={(value) => {
                    if (Array.isArray(value)) {
                        setMinMaxValue(value as [number, number]);
                    }
                }}
                sliderTitle= {"Min/Max"}
                usePreciseInput={true}
            />
        </Stack>
        <Button variant="primary" onClick={handleApply}>
            Apply
        </Button>
        <Button variant="secondary" onClick={handleDefaultColour} style={{marginLeft: '0.5rem'}}>
            Reset to default colour
        </Button>
        <Button variant="danger" onClick={handleCancel} style={{marginLeft: '0.5rem'}}>
            Close
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='colour-map-by-other-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Colour map by other map..."
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
