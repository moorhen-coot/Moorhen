import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/MoorhenReduxStore";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../interface-base/MenuItem";
import { MoorhenCentreOnLigandMenuItem } from "../menu-item/MoorhenCentreOnLigandMenuItem";
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem";
import { MoorhenImportDictionaryMenuItem, MoorhenSMILESToLigandMenuItem } from "../menu-item/MoorhenImportLigandDictionary";
import { MoorhenMatchLigandsMenuItem } from "../menu-item/MoorhenMatchLigandsMenuItem";
import { MoorhenMinimizeEnergyMenuItem } from "../menu-item/MoorhenMinimizeEnergyMenuItem";
import { MoorhenOpenLhasaMenuItem } from "../menu-item/MoorhenOpenLhasaMenuItem";

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
