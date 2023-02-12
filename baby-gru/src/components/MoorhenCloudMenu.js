import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MenuItem } from "@mui/material";

export const MoorhenCloudMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    const exportToCloud = async () => {
        let moleculePromises = props.molecules.map(molecule => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        props.molecules.forEach((molecule, index) => props.exportToCloudCallback(molecule.name, moleculeAtoms[index].data.result.pdbData))
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

