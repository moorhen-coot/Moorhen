import { useDispatch, useSelector } from "react-redux";
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice";
import {
    setDoPerspectiveProjection,
    setDoSpin,
    setDrawAxes,
    setDrawCrosshairs,
    setDrawEnvBOcc,
    setDrawFPS,
    setDrawMissingLoops,
    setDrawScaleBar,
} from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { SubMenuMap } from "../menu-system/subMenuConfig";

export const OtherSceneSettings = () => {
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering);
    const drawScaleBar = useSelector((state: moorhen.State) => state.sceneSettings.drawScaleBar);
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs);
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS);
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops);
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes);
    const drawEnvBOcc = useSelector((state: moorhen.State) => state.sceneSettings.drawEnvBOcc);
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection);
    const doSpin = useSelector((state: moorhen.State) => state.sceneSettings.doSpin);

    const dispatch = useDispatch();

    const menuItemText = "Other settings...";

    return (
        <MoorhenStack>
            <MoorhenToggle
                type="switch"
                checked={drawFPS}
                onChange={() => {
                    dispatch(setDrawFPS(!drawFPS));
                }}
                label="Show frames per second counter"
            />
            <MoorhenToggle
                type="switch"
                checked={enableAtomHovering}
                onChange={() => {
                    if (enableAtomHovering) {
                        dispatch(setHoveredAtom({ molecule: null, cid: null }));
                    }
                    dispatch(setEnableAtomHovering(!enableAtomHovering));
                }}
                label="Enable atom hovering"
            />
            <MoorhenToggle
                type="switch"
                checked={drawCrosshairs}
                onChange={() => {
                    dispatch(setDrawCrosshairs(!drawCrosshairs));
                }}
                label="Show crosshairs"
            />

            <MoorhenToggle
                type="switch"
                checked={drawScaleBar}
                onChange={() => {
                    dispatch(setDrawScaleBar(!drawScaleBar));
                }}
                label="Show scale bar"
            />

            <MoorhenToggle
                type="switch"
                checked={drawAxes}
                onChange={() => {
                    dispatch(setDrawAxes(!drawAxes));
                }}
                label="Show axes"
            />

            <MoorhenToggle
                type="switch"
                checked={drawMissingLoops}
                onChange={() => {
                    dispatch(setDrawMissingLoops(!drawMissingLoops));
                }}
                label="Show missing loops"
            />

            <MoorhenToggle
                type="switch"
                checked={drawEnvBOcc}
                onChange={() => {
                    dispatch(setDrawEnvBOcc(!drawEnvBOcc));
                }}
                label="Show env. temp factors and occ."
            />

            <MoorhenToggle
                type="switch"
                checked={doPerspectiveProjection}
                onChange={() => {
                    dispatch(setDoPerspectiveProjection(!doPerspectiveProjection));
                }}
                label="Perspective projection"
            />

            <MoorhenToggle
                type="switch"
                checked={doSpin}
                onChange={() => {
                    dispatch(setDoSpin(!doSpin));
                }}
                label="Spin view"
            />
        </MoorhenStack>
    );
};

export const OtherSceneSettingsMenu: SubMenuMap = {
    "other-scene-settings": {
        label: "Other Scene Settings",
        items: [
            {
                id: "draw-fps-switch",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.drawFPS,
                action: setDrawFPS,
                label: "Show frames per second counter",
            },
            {
                id: "enable-atom-hovering",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.hoveringStates.enableAtomHovering,
                action: setEnableAtomHovering,
                label: "Enable atom hovering",
                // extraOnChange: (dispatch: any, enableAtomHovering: boolean) => {
                //     if (enableAtomHovering) {
                //         dispatch(setHoveredAtom({ molecule: null, cid: null }));
                //     }
                // },
            },
            {
                id: "show-crosshair",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.drawCrosshairs,
                action: setDrawCrosshairs,
                label: "Show crosshairs",
            },
            {
                id: "show-scale-bar",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.drawScaleBar,
                action: setDrawScaleBar,
                label: "Show scale bar",
            },
            {
                id: "show-axes",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.drawAxes,
                action: setDrawAxes,
                label: "Show axes",
            },
            {
                id: "show-missing-loops",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.drawMissingLoops,
                action: setDrawMissingLoops,
                label: "Show missing loops",
            },
            {
                id: "show-b-occupancy",
                type: "preferenceSwitch",
                keywords: ["b factors", "b-factors", "occupancy"],
                selector: (state: moorhen.State) => state.sceneSettings.drawEnvBOcc,
                action: setDrawEnvBOcc,
                label: "Show env. temp factors and occ.",
                description: "Display on screen B factors and occupancies values",
            },
            {
                id: "perspective-projection",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.doPerspectiveProjection,
                action: setDoPerspectiveProjection,
                label: "Perspective projection",
            },
            {
                id: "spin-view",
                type: "preferenceSwitch",
                selector: (state: moorhen.State) => state.sceneSettings.doSpin,
                action: setDoSpin,
                label: "Spin view",
            },
        ],
    },
};
