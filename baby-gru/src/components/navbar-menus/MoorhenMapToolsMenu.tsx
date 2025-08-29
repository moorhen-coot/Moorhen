import { MenuItem } from "@mui/material";
import { useDispatch } from "react-redux";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem";
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from "../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem";
import { MoorhenFlipMapHandMenuItem } from "../menu-item/MoorhenFlipMapHandMenuItem";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

export const MoorhenMapToolsMenu = () => {
    const dispatch = useDispatch();

    return (
        <>
            <MoorhenSharpenBlurMapMenuItem />
            <MoorhenMapMaskingMenuItem />
            <MoorhenFlipMapHandMenuItem />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem />
            <MenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.COLOR_MAP_BY_MAP));
                    document.body.click();
                }}
            >
                Color map by another map...
            </MenuItem>
        </>
    );
};
