import { Form, InputGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { addMapUpdatingScore, removeMapUpdatingScore, setShowScoresToast } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";

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
        <>
            <InputGroup style={{ padding: "0rem", width: "15rem" }}>
                <Form.Check
                    type="switch"
                    checked={showScoresToast}
                    onChange={() => {
                        dispatch(setShowScoresToast(!showScoresToast));
                    }}
                    label="Show scores window"
                />
            </InputGroup>
            <InputGroup style={{ padding: "0rem", width: "15rem" }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes("Rfactor")}
                    onChange={() => handleScoreChange("Rfactor")}
                    label="Show Rfactor"
                />
            </InputGroup>
            <InputGroup style={{ padding: "0rem", width: "15rem" }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes("Rfree")}
                    onChange={() => handleScoreChange("Rfree")}
                    label="Show Rfree"
                />
            </InputGroup>
            <InputGroup style={{ padding: "0rem", width: "15rem" }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes("Moorhen Points")}
                    onChange={() => handleScoreChange("Moorhen Points")}
                    label="Show Moorhen points"
                />
            </InputGroup>
        </>
    );
};
