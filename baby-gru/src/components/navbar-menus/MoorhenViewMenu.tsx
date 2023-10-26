import { Form, InputGroup } from "react-bootstrap";
import { useState } from "react";
import { MoorhenClipFogMenuItem } from "../menu-item/MoorhenClipFogMenuItem";
import { MoorhenLightingMenuItem } from "../menu-item/MoorhenLightingMenuItem"
import { MoorhenBlurMenuItem } from "../menu-item/MoorhenBlurMenuItem"
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem"
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from "react-redux";
import { setDoPerspectiveProjection, setDrawAxes, setDrawCrosshairs, setDrawFPS, setDrawInteractions, setDrawMissingLoops } from "../../store/sceneSettingsSlice";
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice";

export const MoorhenViewMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering)
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const drawInteractions = useSelector((state: moorhen.State) => state.sceneSettings.drawInteractions)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const dispatch = useDispatch()

    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={drawFPS}
                        onChange={() => {dispatch( setDrawFPS(!drawFPS) )}}
                        label="Show frames per second counter"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={enableAtomHovering}
                        onChange={() => { 
                            if (enableAtomHovering) {
                                dispatch( setHoveredAtom({molecule: null, cid: null}) )
                            }
                            dispatch( setEnableAtomHovering(!enableAtomHovering) )
                        }}
                        label="Enable atom hovering"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={drawCrosshairs}
                        onChange={() => {dispatch( setDrawCrosshairs(!drawCrosshairs) )}}
                        label="Show crosshairs"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={drawAxes}
                        onChange={() => {dispatch( setDrawAxes(!drawAxes) )}}
                        label="Show axes"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={drawMissingLoops}
                        onChange={() => {dispatch( setDrawMissingLoops(!drawMissingLoops) )}}
                        label="Show missing loops"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={drawInteractions}
                        onChange={() => {dispatch( setDrawInteractions(!drawInteractions) )}}
                        label="Show Environment Distances"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={doPerspectiveProjection}
                        onChange={() => {dispatch( setDoPerspectiveProjection(!doPerspectiveProjection) )}}
                        label="Perspective projection"/>
                </InputGroup>
                <hr></hr>
                <MoorhenScenePresetMenuItem {...menuItemProps} />
                <MoorhenBackgroundColorMenuItem {...menuItemProps} />
                <MoorhenClipFogMenuItem {...menuItemProps} />
                <MoorhenLightingMenuItem {...menuItemProps} />
                {props.glRef.current.isWebGL2 () && <MoorhenBlurMenuItem {...menuItemProps} />}
    </>
}
