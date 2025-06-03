import { useState } from "react";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem";
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from "../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem";
import { MoorhenFlipMapHandMenuItem } from "../menu-item/MoorhenFlipMapHandMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { convertViewtoPx } from "../../utils/utils";
import { MenuItem } from "@mui/material";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

export const MoorhenMapToolsMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const dispatch = useDispatch()
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [popoverIsShown, setPopoverIsShown] = useState(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenSharpenBlurMapMenuItem {...menuItemProps} />
            <MoorhenMapMaskingMenuItem  {...menuItemProps} />
            <MoorhenFlipMapHandMenuItem  {...menuItemProps} />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem  {...menuItemProps} />
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.COLOR_MAP_BY_MAP))
                document.body.click()
            }}>Color map by another map...</MenuItem>
            </div>
}
