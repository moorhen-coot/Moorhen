import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { RootState } from "../../store/MoorhenReduxStore";
import { MoorhenMenuItem } from "../menu-item/MenuItem";

export const MoorhenValidationMenu = () => {
    const dispatch = useDispatch();
    const devMode = useSelector((state: RootState) => state.generalStates.devMode);

    return (
        <>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.DIFF_MAP_PEAKS));
                    document.body.click();
                }}
            >
                Difference map peaks...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.RAMA_PLOT));
                    document.body.click();
                }}
            >
                Ramachandran plot...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.VALIDATION_PLOT));
                    document.body.click();
                }}
            >
                Validation plot...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.LIGAND_VALIDATION));
                    document.body.click();
                }}
            >
                Ligand validation...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.CARB_VALIDATION));
                    document.body.click();
                }}
            >
                Carbohydrate validation...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.PEPTIDE_FLIPS));
                    document.body.click();
                }}
            >
                Peptide flips using difference map...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.FILL_PART_RES));
                    document.body.click();
                }}
            >
                Fill partial residues...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.UNMODELLED_BLOBS));
                    document.body.click();
                }}
            >
                Unmodelled blobs...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.MMRRCC));
                    document.body.click();
                }}
            >
                MMRRCC plot...
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.QSCORE));
                    document.body.click();
                }}
            >
                Calculate Q-Score
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.WATER_VALIDATION));
                    document.body.click();
                }}
            >
                Water validation...
            </MoorhenMenuItem>
            {devMode && (
                <MoorhenMenuItem
                    onClick={() => {
                        dispatch(showModal(modalKeys.JSON_VALIDATION));
                        document.body.click();
                    }}
                >
                    Interesting bits JSON validation...
                </MoorhenMenuItem>
            )}
        </>
    );
};
