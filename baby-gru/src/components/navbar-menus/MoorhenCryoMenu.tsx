import { useState } from "react";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem";
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from "../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem";
import { MoorhenFlipMapHandMenuItem } from "../menu-item/MoorhenFlipMapHandMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenColourMapByOtherMapMenuItem } from "../menu-item/MoorhenColourMapByOtherMapMenuItem"

export const MoorhenCryoMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenSharpenBlurMapMenuItem {...menuItemProps} />
            <MoorhenMapMaskingMenuItem  {...menuItemProps} />
            <MoorhenFlipMapHandMenuItem  {...menuItemProps} />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem  {...menuItemProps} />
            <MoorhenColourMapByOtherMapMenuItem {...menuItemProps}/>
    </>
}
