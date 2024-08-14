import { useState } from "react";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem";
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from "../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem";
import { MoorhenFlipMapHandMenuItem } from "../menu-item/MoorhenFlipMapHandMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenColourMapByOtherMapMenuItem } from "../menu-item/MoorhenColourMapByOtherMapMenuItem"
import { convertViewtoPx } from "../../utils/utils";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";

export const MoorhenMapToolsMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [popoverIsShown, setPopoverIsShown] = useState(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenSharpenBlurMapMenuItem {...menuItemProps} />
            <MoorhenMapMaskingMenuItem  {...menuItemProps} />
            <MoorhenFlipMapHandMenuItem  {...menuItemProps} />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem  {...menuItemProps} />
            <MoorhenColourMapByOtherMapMenuItem {...menuItemProps}/>
    </div>
}
