import { useState } from "react";
import { NavDropdown, Form, InputGroup } from "react-bootstrap";
import { MoorhenShortcutConfigModal } from "./MoorhenShortcutConfigModal"
import { MenuItem } from "@mui/material";
import { convertViewtoPx } from "../utils/MoorhenUtils";
import { MoorhenDefaultBondSmoothnessPreferencesMenuItem, MoorhenScoresToastPreferencesMenuItem } from './MoorhenMenuItem'
import MoorhenSlider from './MoorhenSlider' 

export const MoorhenPreferencesMenu = (props) => {
    const { 
        atomLabelDepthMode, setAtomLabelDepthMode, darkMode, setDarkMode, 
        defaultExpandDisplayCards, setDefaultExpandDisplayCards, defaultMapLitLines,
        setDefaultMapLitLines, refineAfterMod, setRefineAfterMod, mouseSensitivity,
        setMouseSensitivity, drawCrosshairs, setDrawCrosshairs, drawMissingLoops,
        setDrawMissingLoops, mapLineWidth, setMapLineWidth, makeBackups, setMakeBackups,
        showShortcutToast, setShowShortcutToast, defaultMapSurface, setDefaultMapSurface,
        defaultBondSmoothness, setDefaultBondSmoothness, showScoresToast, setShowScoresToast,
        defaultUpdatingScores, setDefaultUpdatingScores, drawFPS, setDrawFPS, wheelSensitivityFactor,
        setWheelSensitivityFactor, shortcutOnHoveredAtom, setShortcutOnHoveredAtom
     } = props;

    const [showModal, setShowModal] = useState(null);
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    return <NavDropdown
                    title="Preferences"
                    id="preferences-nav-dropdown"
                    style={{display:'flex', alignItems:'center'}}
                    autoClose={popoverIsShown ? false : 'outside'}
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
                <div style={{maxHeight: convertViewtoPx(65, props.windowHeight), overflowY: 'auto'}}>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            label="Expand display cards after file upload"
                            checked={defaultExpandDisplayCards}
                            onChange={() => { setDefaultExpandDisplayCards(!defaultExpandDisplayCards) }}
                        />
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={darkMode}
                            onChange={() => { setDarkMode(!darkMode) }}
                            label={darkMode ? "Switch lights on": "Switch lights off"}/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={atomLabelDepthMode}
                            onChange={() => { setAtomLabelDepthMode(!atomLabelDepthMode) }}
                            label="Depth cue atom labels"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={defaultMapLitLines}
                            onChange={() => { setDefaultMapLitLines(!defaultMapLitLines) }}
                            label="Activate map lit lines by default"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={defaultMapSurface}
                            onChange={() => { setDefaultMapSurface(!defaultMapSurface) }}
                            label="Show maps as surface by default"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={refineAfterMod}
                            onChange={() => { setRefineAfterMod(!refineAfterMod) }}
                            label="Automatic triple refine post-modification"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={drawFPS}
                            onChange={() => { setDrawFPS(!drawFPS) }}
                            label="Show frames per second counter"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={drawCrosshairs}
                            onChange={() => { setDrawCrosshairs(!drawCrosshairs) }}
                            label="Show crosshairs"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={showShortcutToast}
                            onChange={() => { setShowShortcutToast(!showShortcutToast) }}
                            label="Show shortcut popup"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={drawMissingLoops}
                            onChange={() => { setDrawMissingLoops(!drawMissingLoops) }}
                            label="Show missing loops"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={drawMissingLoops}
                            onChange={() => { setDefaultBondSmoothness(!drawMissingLoops) }}
                            label="Default quality of molecule bonds"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={makeBackups}
                            onChange={() => { setMakeBackups(!makeBackups) }}
                            label="Make molecule backups"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={shortcutOnHoveredAtom}
                            onChange={() => { setShortcutOnHoveredAtom(!shortcutOnHoveredAtom) }}
                            label="Hover on residue to use shortcuts"/>
                    </InputGroup>
                    <MoorhenScoresToastPreferencesMenuItem
                        showScoresToast={showScoresToast}
                        setShowScoresToast={setShowScoresToast}
                        defaultUpdatingScores={defaultUpdatingScores}
                        setDefaultUpdatingScores={setDefaultUpdatingScores}
                        setPopoverIsShown={setPopoverIsShown}
                    />
                    <MoorhenDefaultBondSmoothnessPreferencesMenuItem
                        defaultBondSmoothness={defaultBondSmoothness}
                        setDefaultBondSmoothness={setDefaultBondSmoothness}
                        setPopoverIsShown={setPopoverIsShown}
                    />
                    <hr></hr>
                    <Form.Group controlId="mouseSensitivitySlider" style={{paddingTop:'0rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={10.0} logScale={false} sliderTitle="Mouse sensitivity" initialValue={2.5} externalValue={mouseSensitivity} setExternalValue={setMouseSensitivity}/>
                    </Form.Group>
                    <Form.Group controlId="wheelSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={9.9} logScale={false} sliderTitle="Mouse wheel zoom sensitivity" initialValue={1.0} externalValue={wheelSensitivityFactor} setExternalValue={setWheelSensitivityFactor}/>
                    </Form.Group>
                    <Form.Group controlId="mapLineWidthSlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={5.0} logScale={true} sliderTitle="Map lines thickness" initialValue={2.5} externalValue={mapLineWidth} setExternalValue={setMapLineWidth}/>
                    </Form.Group>
                    <hr></hr>
                    <MenuItem variant="success" onClick={() => setShowModal(true)} id='configure-shortcuts-menu-item' style={{marginTop:'0rem'}}>
                        Configure shortcuts
                    </MenuItem>
                    <MoorhenShortcutConfigModal showModal={showModal} setShowModal={setShowModal} setShortCuts={props.setShortCuts} shortCuts={JSON.parse(props.shortCuts)}/>
            </div>
            </NavDropdown>

}
