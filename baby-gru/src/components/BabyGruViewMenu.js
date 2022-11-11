import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { BabyGruBackgroundColorMenuItem, BabyGruClipFogMenuItem } from "./BabyGruMenuItem";


export const BabyGruViewMenu = (props) => {
    const [dropdownIsShown, setDropdownIsShown] = useState(false)
    const [popoverIsShown, setPopoverIsShown] = useState(false)

return <>
        < NavDropdown title="View" id="basic-nav-dropdown" autoClose={popoverIsShown ? false : 'outside'} onToggle={() => setDropdownIsShown(!dropdownIsShown)} show={dropdownIsShown} >
            <BabyGruBackgroundColorMenuItem setPopoverIsShown={setPopoverIsShown} {...props} />
            <BabyGruClipFogMenuItem setPopoverIsShown={setPopoverIsShown} {...props} />
        </NavDropdown >
    </>
}

