import { useState } from "react";
import { MoorhenCentreOnLigandMenuItem } from "../menu-item/MoorhenCentreOnLigandMenuItem"
import { MoorhenSMILESToLigandMenuItem, MoorhenImportDictionaryMenuItem } from "../menu-item/MoorhenImportLigandDictionary";
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem";
import { MoorhenMinimizeEnergyMenuItem } from "../menu-item/MoorhenMinimizeEnergyMenuItem";
import { MoorhenMatchLigandsMenuItem } from "../menu-item/MoorhenMatchLigandsMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { useDispatch } from "react-redux";
import { setShowFitLigandModal } from "../../store/activeModalsSlice";

export const MoorhenLigandMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
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
            <MenuItem onClick={() => {
                dispatch(setShowFitLigandModal(true))
                document.body.click()
            }}>Find ligand...</MenuItem>
    </>
}

