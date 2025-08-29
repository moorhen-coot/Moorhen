import { MenuItem } from "@mui/material";
import { useDispatch } from "react-redux";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MoorhenReferencesMenuItem } from "../menu-item/MoorhenReferencesMenuItem";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

export const MoorhenHelpMenu = (props: { dropdownId: string }) => {
    const dispatch = useDispatch();
    return (
        <>
            <MenuItem onClick={() => window.open("https://moorhen-coot.github.io/wiki/")}>
                Go to Moorhen wiki...
            </MenuItem>
            <MenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.SHOW_CONTROLS));
                    document.body.click();
                }}
            >
                Show controls...
            </MenuItem>
            <MoorhenContactMenuItem />
            <MoorhenAboutMenuItem />
            <MoorhenReferencesMenuItem />
        </>
    );
};
