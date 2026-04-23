import { useDispatch, useSelector } from "react-redux";
import {
    setDoAnaglyphStereo,
    setDoCrossEyedStereo,
    setDoMultiView,
    setDoSideBySideStereo,
    setDoThreeWayView,
} from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const LayoutSettings = () => {
    const doAnaglyphStereo = useSelector((state: moorhen.State) => state.sceneSettings.doAnaglyphStereo);
    const doCrossEyedStereo = useSelector((state: moorhen.State) => state.sceneSettings.doCrossEyedStereo);
    const doSideBySideStereo = useSelector((state: moorhen.State) => state.sceneSettings.doSideBySideStereo);
    const doThreeWayView = useSelector((state: moorhen.State) => state.sceneSettings.doThreeWayView);
    const doMultiView = useSelector((state: moorhen.State) => state.sceneSettings.doMultiView);

    const dispatch = useDispatch();

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
        <MoorhenStack>
            <MoorhenToggle
                type="radio"
                name="multiview"
                checked={doSideBySideStereo}
                onChange={e => {
                    handleChange(e, "sidebyside");
                }}
                label="Side-by-side stereo"
            />

            <MoorhenToggle
                type="radio"
                name="multiview"
                checked={doCrossEyedStereo}
                onChange={e => {
                    handleChange(e, "crosseyed");
                }}
                label="Cross-eyed stereo"
            />
            <MoorhenToggle
                type="radio"
                name="multiview"
                checked={doAnaglyphStereo}
                onChange={e => {
                    handleChange(e, "anaglyph");
                }}
                label="Anaglyph stereo"
            />
            <hr />
            <MoorhenToggle
                type="radio"
                className="custom-control-input"
                name="multiview"
                checked={doThreeWayView}
                onChange={e => {
                    handleChange(e, "threeway");
                }}
                label="Three way view"
            />
            <hr />
            <MoorhenToggle
                type="radio"
                className="custom-control-input"
                name="multiview"
                checked={doMultiView}
                onChange={e => {
                    handleChange(e, "multiview");
                }}
                label="One view per molecule"
            />
            <hr />
            <MoorhenToggle
                type="radio"
                className="custom-control-input"
                name="multiview"
                checked={normal}
                onChange={e => {
                    handleChange(e, "normal");
                }}
                label="Normal"
            />
        </MoorhenStack>
    );
};
