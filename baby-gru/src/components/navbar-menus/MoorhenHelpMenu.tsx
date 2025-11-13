import { useDispatch } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../interface-base/MenuItem";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MoorhenReferencesMenuItem } from "../menu-item/MoorhenReferencesMenuItem";

export const MoorhenHelpMenu = (props: { dropdownId: string }) => {
    const dispatch = useDispatch();
    return (
        <>
            <MoorhenMenuItem onClick={() => window.open("https://moorhen-coot.github.io/wiki/")}>Go to Moorhen wiki...</MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.SHOW_CONTROLS));
                    document.body.click();
                }}
            >
                Show controls...
            </MoorhenMenuItem>
            <MoorhenContactMenuItem />
            <MoorhenAboutMenuItem />
            <MoorhenReferencesMenuItem />
        </>
    );
};
