import { useDispatch, useSelector } from "react-redux";
import { MoorhenCentreOnLigandMenuItem } from "../menu-item/MoorhenCentreOnLigandMenuItem";
import {
    MoorhenSMILESToLigandMenuItem,
    MoorhenImportDictionaryMenuItem,
} from "../menu-item/MoorhenImportLigandDictionary";
import { RootState } from "../../store/MoorhenReduxStore";
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem";
import { MoorhenMinimizeEnergyMenuItem } from "../menu-item/MoorhenMinimizeEnergyMenuItem";
import { MoorhenMatchLigandsMenuItem } from "../menu-item/MoorhenMatchLigandsMenuItem";
import { MoorhenOpenLhasaMenuItem } from "../menu-item/MoorhenOpenLhasaMenuItem";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../menu-item/MenuItem";

export const MoorhenLigandMenu = () => {
    const disableFileUploads = useSelector((state: RootState) => state.generalStates.disableFileUpload);
    const dispatch = useDispatch();

    return (
        <>
            <MoorhenGetMonomerMenuItem />
            {!disableFileUploads && <MoorhenImportDictionaryMenuItem />}
            <MoorhenSMILESToLigandMenuItem />
            <MoorhenCentreOnLigandMenuItem />
            <MoorhenMinimizeEnergyMenuItem />
            <MoorhenMatchLigandsMenuItem />
            <MoorhenOpenLhasaMenuItem />
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.FIT_LIGAND));
                    document.body.click();
                }}
            >
                Find ligand...
            </MoorhenMenuItem>
        </>
    );
};
