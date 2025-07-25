import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";

export const MoorhenValidationMenu = ( props:{dropdownId:string}) => {

    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    
    const dispatch = useDispatch()
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
   
    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.DIFF_MAP_PEAKS))
                document.body.click()
            }}>Difference map peaks...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.RAMA_PLOT))
                document.body.click()
            }}>Ramachandran plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.VALIDATION_PLOT))
                document.body.click()
            }}>Validation plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.LIGAND_VALIDATION))
                document.body.click()
            }}>Ligand validation...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.CARB_VALIDATION))
                document.body.click()
            }}>Carbohydrate validation...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.PEPTIDE_FLIPS))
                document.body.click()
            }}>Peptide flips using difference map...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.FILL_PART_RES))
                document.body.click()
            }}>Fill partial residues...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.UNMODELLED_BLOBS))
                document.body.click()
            }}>Unmodelled blobs...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.MMRRCC))
                document.body.click()
            }}>MMRRCC plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.QSCORE))
                document.body.click()
            }}>Calculate Q-Score</MenuItem>
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.WATER_VALIDATION))
                document.body.click()
            }}>Water validation...</MenuItem>
            {devMode && <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.JSON_VALIDATION))
                document.body.click()
            }}>Interesting bits JSON validation...</MenuItem>}
    </div>
}

