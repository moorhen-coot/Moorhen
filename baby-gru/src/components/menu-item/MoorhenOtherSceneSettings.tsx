import { Form, InputGroup } from "react-bootstrap"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { setDoPerspectiveProjection, setDoSpin, setDrawAxes, setDrawCrosshairs, setDrawFPS, setDrawMissingLoops, setDrawScaleBar, setDrawEnvBOcc } from "../../store/sceneSettingsSlice"
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenOtherSceneSettings = () => {

    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering)
    const drawScaleBar = useSelector((state: moorhen.State) => state.sceneSettings.drawScaleBar)
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const drawEnvBOcc = useSelector((state: moorhen.State) => state.sceneSettings.drawEnvBOcc)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const doSpin = useSelector((state: moorhen.State) => state.sceneSettings.doSpin)

    const dispatch = useDispatch()

    const panelContent = <div style={{width: '18rem'}}>
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
                checked={drawScaleBar}
                onChange={() => {dispatch( setDrawScaleBar(!drawScaleBar) )}}
                label="Show scale bar"/>
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
                checked={drawEnvBOcc}
                onChange={() => {dispatch( setDrawEnvBOcc(!drawEnvBOcc) )}}
                label="Show env. temp factors and occ."/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check
                type="switch"
                checked={doPerspectiveProjection}
                onChange={() => {dispatch( setDoPerspectiveProjection(!doPerspectiveProjection) )}}
                label="Perspective projection"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check
                type="switch"
                checked={doSpin}
                onChange={() => {dispatch( setDoSpin(!doSpin) )}}
                label="Spin view"/>
        </InputGroup>
    </div>

    return <MoorhenBaseMenuItem
        id='other-scene-settings-menu-item'
        popoverContent={panelContent}
        menuItemText="Other settings..."
        onCompleted={() => {}}
        showOkButton={false}
    />

}
