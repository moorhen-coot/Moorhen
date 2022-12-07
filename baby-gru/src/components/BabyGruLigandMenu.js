import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { BabyGruAddWatersMenuItem, BabyGruGetMonomerMenuItem, BabyGruImportDictionaryMenuItem, BabyGruMergeMoleculesMenuItem } from "./BabyGruMenuItem";

export const BabyGruLigandMenu = (props) => {
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
            <BabyGruGetMonomerMenuItem {...menuItemProps} />
            <BabyGruImportDictionaryMenuItem {...menuItemProps} />
            <BabyGruMergeMoleculesMenuItem {...menuItemProps} />
            <BabyGruAddWatersMenuItem {...menuItemProps} />
        </NavDropdown>
    </>
}



