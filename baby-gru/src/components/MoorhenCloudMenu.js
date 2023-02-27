import { ListItemButton, ListItemText, MenuItem, Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenCloudMenu = (props) => {

    const exportToCloud = async () => {
        let moleculePromises = props.molecules.map(molecule => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        props.molecules.forEach((molecule, index) => props.exportToCloudCallback(molecule.name, moleculeAtoms[index].data.result.pdbData))
    }

    return <>
            <ListItemButton 
                id="ccp4-cloud-dropdown" 
                onClick={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                <ListItemText primary="CCP4 Cloud" />
                {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
            </ListItemButton>
            <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
                <hr></hr>
                <MenuItem id='cloud-export-menu-item' variant="success" onClick={exportToCloud}>
                    Export to CCP4 Cloud
                </MenuItem>
                <hr></hr>
            </Collapse>
        </>
    }
