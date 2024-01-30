import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { useDispatch } from "react-redux";
import { 
    setShowDiffMapPeaksModal, setShowFillPartialResValidationModal, setShowLigandValidationModal, setShowMmrrccModal, 
    setShowPepFlipsValidationModal, setShowRamaPlotModal, setShowUnmodelledBlobsModal, setShowValidationPlotModal, 
    setShowCarbohydrateValidationModal ,setShowWaterValidationModal
} from "../../store/activeModalsSlice";

export const MoorhenValidationMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const dispatch = useDispatch()
   
    return <>
            <MenuItem onClick={() => {
                dispatch(setShowDiffMapPeaksModal(true))
                document.body.click()
            }}>Difference map peaks...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowRamaPlotModal(true))
                document.body.click()
            }}>Ramachandran plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowValidationPlotModal(true))
                document.body.click()
            }}>Validation plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowLigandValidationModal(true))
                document.body.click()
            }}>Ligand validation...</MenuItem>

            <MenuItem onClick={() => {
                dispatch(setShowCarbohydrateValidationModal(true))
                document.body.click()
            }}>Carbohydrate validation...</MenuItem>

            <MenuItem onClick={() => {
                dispatch(setShowPepFlipsValidationModal(true))
                document.body.click()
            }}>Peptide flips using difference map...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowFillPartialResValidationModal(true))
                document.body.click()
            }}>Fill partial residues...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowUnmodelledBlobsModal(true))
                document.body.click()
            }}>Unmodelled blobs...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowMmrrccModal(true))
                document.body.click()
            }}>MMRRCC plot...</MenuItem>
            <MenuItem onClick={() => {
                dispatch(setShowWaterValidationModal(true))
                document.body.click()
            }}>Water validation...</MenuItem>
    </>
}

