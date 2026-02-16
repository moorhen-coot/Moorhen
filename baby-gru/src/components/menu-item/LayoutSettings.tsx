import { Form, InputGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
    setDoAnaglyphStereo,
    setDoCrossEyedStereo,
    setDoMultiView,
    setDoSideBySideStereo,
    setDoThreeWayView,
} from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenToggle } from "../inputs";

export const LayoutSettings = () => {
    const doAnaglyphStereo = useSelector((state: moorhen.State) => state.sceneSettings.doAnaglyphStereo);
    const doCrossEyedStereo = useSelector((state: moorhen.State) => state.sceneSettings.doCrossEyedStereo);
    const doSideBySideStereo = useSelector((state: moorhen.State) => state.sceneSettings.doSideBySideStereo);
    const doThreeWayView = useSelector((state: moorhen.State) => state.sceneSettings.doThreeWayView);
    const doMultiView = useSelector((state: moorhen.State) => state.sceneSettings.doMultiView);

    const dispatch = useDispatch();

    const menuItemText = "Layout...";

    const handleChange = (event, type) => {
        dispatch(setDoSideBySideStereo(false));
        dispatch(setDoCrossEyedStereo(false));
        dispatch(setDoAnaglyphStereo(false));
        dispatch(setDoThreeWayView(false));
        dispatch(setDoMultiView(false));
        if (type === "threeway") {
            dispatch(setDoThreeWayView(true));
        } else if (type === "sidebyside") {
            dispatch(setDoSideBySideStereo(true));
        } else if (type === "crosseyed") {
            dispatch(setDoCrossEyedStereo(true));
        } else if (type === "anaglyph") {
            dispatch(setDoAnaglyphStereo(true));
        } else if (type === "multiview") {
            dispatch(setDoMultiView(true));
        }
    };

    let normal = false;
    if (!doMultiView && !doSideBySideStereo && !doCrossEyedStereo && !doAnaglyphStereo && !doThreeWayView) normal = true;

    return (
        <div style={{ width: "18rem" }}>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    name="multiview"
                    defaultChecked={doSideBySideStereo}
                    onChange={e => {
                        handleChange(e, "sidebyside");
                    }}
                    label="Side-by-side stereo"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    name="multiview"
                    defaultChecked={doCrossEyedStereo}
                    onChange={e => {
                        handleChange(e, "crosseyed");
                    }}
                    label="Cross-eyed stereo"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    name="multiview"
                    defaultChecked={doAnaglyphStereo}
                    onChange={e => {
                        handleChange(e, "anaglyph");
                    }}
                    label="Anaglyph stereo"
                />
            </InputGroup>
            <hr />
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    className="custom-control-input"
                    name="multiview"
                    defaultChecked={doThreeWayView}
                    onChange={e => {
                        handleChange(e, "threeway");
                    }}
                    label="Three way view"
                />
            </InputGroup>
            <hr />
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    className="custom-control-input"
                    name="multiview"
                    defaultChecked={doMultiView}
                    onChange={e => {
                        handleChange(e, "multiview");
                    }}
                    label="One view per molecule"
                />
            </InputGroup>
            <hr />
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="radio"
                    className="custom-control-input"
                    name="multiview"
                    defaultChecked={normal}
                    onChange={e => {
                        handleChange(e, "normal");
                    }}
                    label="Normal"
                />
            </InputGroup>
        </div>
    );
};
