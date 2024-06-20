import { useState } from "react";
import { MoorhenCentreOnLigandMenuItem } from "../menu-item/MoorhenCentreOnLigandMenuItem"
import { MoorhenSMILESToLigandMenuItem, MoorhenImportDictionaryMenuItem } from "../menu-item/MoorhenImportLigandDictionary";
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem";
import { MoorhenMinimizeEnergyMenuItem } from "../menu-item/MoorhenMinimizeEnergyMenuItem";
import { MoorhenMatchLigandsMenuItem } from "../menu-item/MoorhenMatchLigandsMenuItem";
import { MoorhenOpenLhasaMenuItem } from "../menu-item/MoorhenOpenLhasaMenuItem";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { moorhen } from "../../types/moorhen";

export const MoorhenLigandMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)

    const dispatch = useDispatch()

    const [popoverIsShown, setPopoverIsShown] = useState(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenGetMonomerMenuItem {...menuItemProps} />
            <MoorhenImportDictionaryMenuItem {...menuItemProps} />
            <MoorhenSMILESToLigandMenuItem {...menuItemProps} />
            <MoorhenCentreOnLigandMenuItem {...menuItemProps} />
            <MoorhenMinimizeEnergyMenuItem {...menuItemProps} />
            <MoorhenMatchLigandsMenuItem {...menuItemProps} />
            {devMode && <MoorhenOpenLhasaMenuItem {...menuItemProps}/>}
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.FIT_LIGAND))
                document.body.click()
            }}>Find ligand...</MenuItem>
    </>
}

