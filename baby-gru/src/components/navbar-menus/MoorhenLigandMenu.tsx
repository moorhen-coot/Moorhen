import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenCentreOnLigandMenuItem } from "../menu-item/MoorhenCentreOnLigandMenuItem"
import { MoorhenSMILESToLigandMenuItem, MoorhenImportDictionaryMenuItem } from "../menu-item/MoorhenImportLigandDictionary";
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem";
import { MoorhenMinimizeEnergyMenuItem } from "../menu-item/MoorhenMinimizeEnergyMenuItem";
import { MoorhenMatchLigandsMenuItem } from "../menu-item/MoorhenMatchLigandsMenuItem";
import { MoorhenOpenLhasaMenuItem } from "../menu-item/MoorhenOpenLhasaMenuItem";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";


export const MoorhenLigandMenu = (props: {
    dropdownId: string;
}) => {

    const disableFileUploads = useSelector((state: moorhen.State) => state.generalStates.disableFileUpload)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const dispatch = useDispatch()
 
    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenGetMonomerMenuItem  />
            {!disableFileUploads && <MoorhenImportDictionaryMenuItem  />}
            <MoorhenSMILESToLigandMenuItem  />
            <MoorhenCentreOnLigandMenuItem  />
            <MoorhenMinimizeEnergyMenuItem  />
            <MoorhenMatchLigandsMenuItem  />
            <MoorhenOpenLhasaMenuItem />
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.FIT_LIGAND))
                document.body.click()
            }}>Find ligand...</MenuItem>
    </div>
}

