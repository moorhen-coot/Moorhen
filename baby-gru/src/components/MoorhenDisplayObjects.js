import { useState } from "react";
import { MoorhenMoleculeCard } from "./MoorhenMoleculeCard"
import { MoorhenMapCard } from "./MoorhenMapCard"
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { ListItemButton, ListItemText, Collapse } from "@mui/material"
import { convertViewtoPx} from '../utils/MoorhenUtils';

export const MoorhenDisplayObjects = (props) => {
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState(-1)

    let displayData = [];
    if (props.molecules.length !== 0) {
        props.molecules.forEach(molecule => displayData.push(
            <MoorhenMoleculeCard
                key={molecule.molNo}
                index={molecule.molNo}
                molecule={molecule}
                currentDropdownMolNo={currentDropdownMolNo}
                setCurrentDropdownMolNo={setCurrentDropdownMolNo}
                {...props} />
        )
        )
    }

    if (props.maps.length !== 0) {
        props.maps.forEach(map => displayData.push(
            <MoorhenMapCard
                key={map.molNo}
                index={map.molNo}
                map={map}
                initialContour={0.8}
                initialRadius={13}
                currentDropdownMolNo={currentDropdownMolNo}
                setCurrentDropdownMolNo={setCurrentDropdownMolNo}
                {...props} />
        ))
    }

    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <>
            <ListItemButton
                id="models-maps-dropdown"
                show={props.accordionDropdownId === props.dropdownId}
                style={{display:'flex', alignItems:'center'}}
                onClick={() => { props.dropdownId !== props.accordionDropdownId ? props.setAccordionDropdownId(props.dropdownId) : props.setAccordionDropdownId(-1) }}>
                <ListItemText primary="Models and maps" />
                {props.dropdownId !== props.accordionDropdownId ? <ExpandMore/> : <ExpandLess/>}

            </ListItemButton>

            <Collapse in={props.dropdownId === props.accordionDropdownId} timeout="auto" style={{width: props.sideBarWidth}}>
                <div style={{maxHeight: convertViewtoPx(70, props.windowHeight), overflowY: 'scroll'}}>
                    <hr></hr>
                    {props.molecules.length === 0 && props.maps.length === 0 ? "No models or maps loaded" : displayData}
                    <hr></hr>
                </div>
            </Collapse>
    </> 
}

