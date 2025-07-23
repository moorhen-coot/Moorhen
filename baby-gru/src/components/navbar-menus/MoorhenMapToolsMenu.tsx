
import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem";
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from "../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem";
import { MoorhenFlipMapHandMenuItem } from "../menu-item/MoorhenFlipMapHandMenuItem"
import { convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";


export const MoorhenMapToolsMenu = (props: { dropdownId: string }) => {
    const dispatch = useDispatch()
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenSharpenBlurMapMenuItem  />
            <MoorhenMapMaskingMenuItem  />
            <MoorhenFlipMapHandMenuItem  />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem  />
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.COLOR_MAP_BY_MAP))
                document.body.click()
            }}>Color map by another map...</MenuItem>
            </div>
}
