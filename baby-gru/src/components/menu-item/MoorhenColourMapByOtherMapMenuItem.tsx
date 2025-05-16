import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useMenuMemory, useMenuStateMemory, dispatchMenuMemory } from '../../store/menusSlice'; 
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { Button } from "react-bootstrap";
import { Checkbox } from "@mui/material";
import { Stack } from "@mui/material";
import { MoorhenSlider } from "../inputs/MoorhenSlider-new";
import { get } from "http";

export const MoorhenColourMapByOtherMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {
    const dispatch = useDispatch();
    const menu ='colour-map-by-other-map-menu-item';
    const maps = useSelector((state: moorhen.State) => state.maps);

    const [minMaxValue, setMinMaxValue] = useMenuStateMemory<[number, number]>(menu, 'minMaxValue', [-1, 1]);
    const map1 = useMenuMemory<number>(menu, 'map1', -999999);
    const map2 = useMenuMemory<number>(menu, 'map2', -999999);

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null);
   
    const [locRes, setLocRes] = useMenuStateMemory<boolean>(menu, 'locRes', false, dispatch);

    const handleCancel = (_evt) => {
        document.body.click();
    };

    const handleDefaultColour = (_evt) => {
        if (!mapSelectRef_1.current.value) {
            return;
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        if (!referenceMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(null);
        referenceMap.drawMapContour();
    };

    const handleApply = () => {

        dispatchMenuMemory(dispatch, menu, [
            { key: 'minMaxValue', value: minMaxValue },
            { key: 'map1', value: mapSelectRef_1.current.value },
            { key: 'map2', value: mapSelectRef_2.current.value }
        ]);

        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value) {
            return;
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));

        if (!referenceMap || !colouringMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(colouringMap.molNo, minMaxValue[0], minMaxValue[1]);
        referenceMap.drawMapContour();
    };

    const guessValues = async () => {
        if (!mapSelectRef_2 || !mapSelectRef_1.current) {
            return;
        }
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));
        if (!colouringMap) {
            return;
        }
        const histogram = await colouringMap.getHistogram(400, 1);
        const secondNonZeroIndex = histogram.counts.findIndex((value, index, array) => {
            if (value !== 0) {
                const firstNonZeroIndex = array.findIndex(v => v !== 0);
                return index > firstNonZeroIndex && value !== 0;
            }
            return false;
        });
        const suggestedMinVal = secondNonZeroIndex * histogram.bin_width;
        if (locRes) {
            setMinMaxValue([suggestedMinVal, suggestedMinVal + 1]);
        }
    };

    const handleSelectorChange = () => {
        guessValues();
    };

    useEffect(() => {
        if (locRes) {
            guessValues();
        }
    }, [locRes]);

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." defaultValue={map1 || null} />
        <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..." defaultValue={map2 || null} onChange={handleSelectorChange} />
        <Checkbox
            checked={locRes}
            onChange={(evt) => setLocRes(evt.target.checked)}
        />
        <span style={{ margin: '0.5rem' }}>Local resolution map</span>
        <MoorhenSlider
            externalValue={minMaxValue}
            minVal={locRes ? 1.0 : -4.0}
            maxVal={locRes ? 8.0 : 4.0}
            decimalPlaces={2}
            setExternalValue={(value) => { setMinMaxValue(value as [number, number]) }}
            sliderTitle={"Levels"}
            usePreciseInput={true}
            piMinMax={null}
        />
        <Button variant="primary" onClick={handleApply}>
            Apply
        </Button>
        <Button variant="secondary" onClick={handleDefaultColour} style={{ marginLeft: '0.5rem' }}>
            Reset to default colour
        </Button>
        <Button variant="secondary" onClick={guessValues} style={{ marginLeft: '0.5rem' }}>
            Default values
        </Button>
        <Button variant="danger" onClick={handleCancel} style={{ marginLeft: '0.5rem' }}>
            Close
        </Button>
    </>;

    return <MoorhenBaseMenuItem
        id='colour-map-by-other-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Colour map by other map..."
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />;
};
