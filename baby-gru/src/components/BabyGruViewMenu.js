import { NavDropdown, Form, Overlay, Button } from "react-bootstrap";
import { useEffect, useRef, useState } from "react";
import BabyGruSlider from "./BabyGruSlider";
import { BabyGruBackgroundColorMenuItem, BabyGruClipFogMenuItem } from "./BabyGruMenuItem";


export const BabyGruViewMenu = (props) => {
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [overlayContent, setOverlayContent] = useState(<></>)

    return <>
        < NavDropdown title="View" id="basic-nav-dropdown" >
            <BabyGruBackgroundColorMenuItem {...props} />
            <BabyGruClipFogMenuItem {...props} />
        </NavDropdown >
    </>
}

