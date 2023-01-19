import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MenuItem } from "@mui/material";

export const MoorhenCloudMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    const exportToCloud = async () => {
        let moleculePromises = props.molecules.map(molecule => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        let mapPromises = props.maps.map(map => {return map.getMap()})
        let mapData = await Promise.all(mapPromises)

        const result = {
            moleculesNames: props.molecules.map(molecule => molecule.name),
            moleculesPdbData: moleculeAtoms.map(item => item.data.result.pdbData),
            mapsNames: props.maps.map(map => map.name),
            mapsMapData: mapData.map(item => new Uint8Array(item.data.result.mapData)),
        }
        
        let exportEvent = new CustomEvent("moorhenDataExportEvent", {
            "detail": {
                result
            }
        })
        
        document.dispatchEvent(exportEvent)
    }

    return <>
            <NavDropdown 
                    title="CCP4 Cloud" 
                    id="cloud-nav-dropdown" 
                    style={{display:'flex', alignItems:'center'}}
                    autoClose={popoverIsShown ? false : 'outside'}
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                <MenuItem id='cloud-export-menu-item' variant="success" onClick={exportToCloud}>
                    Export to CCP4 Cloud
                </MenuItem>
            </NavDropdown >
        </>
    }

