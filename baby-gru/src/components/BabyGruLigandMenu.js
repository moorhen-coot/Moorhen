import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { BabyGruGetMonomerMenuItem, BabyGruImportDictionaryMenuItem, BabyGruMergeMoleculesMenuItem } from "./BabyGruMenuItem";

export const BabyGruLigandMenu = (props) => {
    const [dropdownIsShown, setDropdownIsShown] = useState(false)
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    return <>
        <NavDropdown title="Ligand" id="basic-nav-dropdown" autoClose={popoverIsShown ? false : 'outside'} onToggle={() => setDropdownIsShown(!dropdownIsShown)} show={dropdownIsShown} >
            <BabyGruGetMonomerMenuItem setPopoverIsShown={setPopoverIsShown} {...props} />
            <BabyGruImportDictionaryMenuItem setPopoverIsShown={setPopoverIsShown} {...props} />
            <BabyGruMergeMoleculesMenuItem setPopoverIsShown={setPopoverIsShown} {...props} />
        </NavDropdown>
    </>
}



