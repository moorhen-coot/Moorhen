import { Form, InputGroup } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useSelector, useDispatch } from "react-redux";
import { addMapUpdatingScore, removeMapUpdatingScore, setShowScoresToast } from "../../store/updatingMapScoresSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { useCallback } from "react";

export const MoorhenScoresToastPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const showScoresToast = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.showScoresToast)
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.defaultUpdatingScores)

    const handleScoreChange = useCallback((score: string) => {
        dispatch(
            defaultUpdatingScores.includes(score) ? removeMapUpdatingScore(score) : addMapUpdatingScore(score)
        )
    }, [defaultUpdatingScores])

    const panelContent =
        <>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={showScoresToast}
                    onChange={() => {dispatch( setShowScoresToast(!showScoresToast) )}}
                    label="Show scores window" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes('Rfactor')}
                    onChange={() => handleScoreChange('Rfactor')}
                    label="Show Rfactor" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes('Rfree')}
                    onChange={() => handleScoreChange('Rfree')}
                    label="Show Rfree" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={defaultUpdatingScores.includes('Moorhen Points')}
                    onChange={() => handleScoreChange('Moorhen Points')}
                    label="Show Moorhen points" />
            </InputGroup>
        </>

    return <MoorhenBaseMenuItem
        id="updating-maps-scores-options-menu-item"
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Options for scores when updating maps..."}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />

}
