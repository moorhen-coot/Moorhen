import { useCallback, useRef, useState } from "react";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';
import { Slider } from "@mui/material";
import { Button } from "react-bootstrap";

export const MoorhenColourMapByOtherMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const maps = useSelector((state: moorhen.State) => state.maps)

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null)
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null)
    const minMaxValueRef = useRef<[number, number]>([27.5, 72.5])

    const [minMaxValue, setMinMaxValue]  = useState<[number, number]>([27.5, 72.5])

    const convertValue = (percentage: number, min: number = -2.0, max: number = 2.0) => {
        const value = (percentage / 100) * (max - min) + min
        return parseFloat(value.toFixed(2))
    }

    const handleMinMaxChange = (event: Event, newValue: [number, number]) => {
        setMinMaxValue(newValue)
        minMaxValueRef.current = newValue
    }

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
        referenceMap.doCootContour(...props.glRef.current.origin.map(coord => -coord) as [number, number, number], referenceMap.mapRadius, referenceMap.contourLevel)
    }

    const handleApply = useCallback(async (_evt) => {
        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value || !minMaxValueRef.current) {
            return
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value))
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value))
        const [min, max] = minMaxValueRef.current.map(value => convertValue(value))

        if (!referenceMap || !colouringMap) {
            return
        }

        referenceMap.setOtherMapForColouring(colouringMap.molNo, min, max)
        referenceMap.doCootContour(...props.glRef.current.origin.map(coord => -coord) as [number, number, number], referenceMap.mapRadius, referenceMap.contourLevel)

    }, [maps, props.glRef])

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..."/>
        <span style={{margin: '0.5rem'}}>Min/Max values</span>
        <Slider
            getAriaLabel={() => 'Min-Max values'}
            value={minMaxValue}
            onChange={handleMinMaxChange}
            getAriaValueText={(value) => `${convertValue(value)}`}
            valueLabelFormat={(value) => `${convertValue(value)}`}
            valueLabelDisplay="on"
            sx={{
                marginTop: '1.5rem',
                '& .MuiSlider-valueLabel': {
                    fontSize: 14,
                    fontWeight: 'bold',
                    top: -1,
                    color: 'grey',
                    backgroundColor: 'unset',
                },
            }}
        />
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
