import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { addMapUpdatingScore, removeMapUpdatingScore, setShowScoresToast } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const ScoresToastPreferences = () => {
    const dispatch = useDispatch();
    const showScoresToast = useSelector((state: moorhen.State) => state.moleculeMapUpdate.showScoresToast);
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.moleculeMapUpdate.defaultUpdatingScores);

    const menuItemText = "Options for scores when updating maps...";

    const handleScoreChange = useCallback(
        (score: string) => {
            dispatch(defaultUpdatingScores.includes(score) ? removeMapUpdatingScore(score) : addMapUpdatingScore(score));
        },
        [defaultUpdatingScores]
    );

    return (
        <MoorhenStack gap={"0.25rem"}>
            <MoorhenToggle
                type="switch"
                checked={showScoresToast}
                onChange={() => {
                    dispatch(setShowScoresToast(!showScoresToast));
                }}
                label="Show scores window"
            />
            <MoorhenToggle
                type="switch"
                checked={defaultUpdatingScores.includes("Rfactor")}
                onChange={() => handleScoreChange("Rfactor")}
                label="Show Rfactor"
            />
            <MoorhenToggle
                type="switch"
                checked={defaultUpdatingScores.includes("Rfree")}
                onChange={() => handleScoreChange("Rfree")}
                label="Show Rfree"
            />
            <MoorhenToggle
                type="switch"
                checked={defaultUpdatingScores.includes("Moorhen Points")}
                onChange={() => handleScoreChange("Moorhen Points")}
                label="Show Moorhen points"
            />
        </MoorhenStack>
    );
};
