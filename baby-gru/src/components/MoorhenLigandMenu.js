import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenAddWatersMenuItem, MoorhenCentreOnLigandMenuItem, MoorhenFitLigandRightHereMenuItem, 
    MoorhenSMILESToLigandMenuItem, MoorhenGetMonomerMenuItem, MoorhenImportDictionaryMenuItem } from "./MoorhenMenuItem";

export const MoorhenLigandMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <NavDropdown
            title="Ligand"
            id="ligand-nav-dropdown"
            style={{display:'flex', alignItems:'center'}}
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <MoorhenGetMonomerMenuItem {...menuItemProps} />
            <MoorhenImportDictionaryMenuItem {...menuItemProps} />
            <MoorhenSMILESToLigandMenuItem {...menuItemProps} />
            <MoorhenCentreOnLigandMenuItem {...menuItemProps} />
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MoorhenFitLigandRightHereMenuItem {...menuItemProps} />
        </NavDropdown>
    </>
}

