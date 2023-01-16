import { useState } from "react";
import { NavDropdown, Form, InputGroup } from "react-bootstrap";
import { MoorhenShortcutConfigModal } from "./MoorhenShortcutConfigModal"
import { MenuItem } from "@mui/material";
import { convertViewtoPx } from "../utils/MoorhenUtils";
import MoorhenSlider from './MoorhenSlider' 

export const MoorhenPreferencesMenu = (props) => {
    const { 
        atomLabelDepthMode, setAtomLabelDepthMode, darkMode, setDarkMode, 
        defaultExpandDisplayCards, setDefaultExpandDisplayCards, defaultLitLines,
        setDefaultLitLines, refineAfterMod, setRefineAfterMod, mouseSensitivity,
        setMouseSensitivity, drawCrosshairs, setDrawCrosshairs, drawMissingLoops,
        setDrawMissingLoops, mapLineWidth, setMapLineWidth
     } = props;
    const [showModal, setShowModal] = useState(null);

    return <NavDropdown
                    title="Preferences"
                    id="preferences-nav-dropdown"
                    style={{display:'flex', alignItems:'center'}}
                    autoClose="outside"
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
                <div style={{maxHeight: convertViewtoPx(60, props.windowHeight), overflowY: 'auto'}}>
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
                            checked={defaultLitLines}
                            onChange={() => { setDefaultLitLines(!defaultLitLines) }}
                            label="Activate map lit lines by default"/>
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
                            checked={drawCrosshairs}
                            onChange={() => { setDrawCrosshairs(!drawCrosshairs) }}
                            label="Show crosshairs"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={drawMissingLoops}
                            onChange={() => { setDrawMissingLoops(!drawMissingLoops) }}
                            label="Show missing loops"/>
                    </InputGroup>
                    <hr></hr>
                    <Form.Group controlId="mouseSensitivitySlider" style={{paddingTop:'0rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={10.0} logScale={false} sliderTitle="Mouse sensitivity" intialValue={2.5} externalValue={mouseSensitivity} setExternalValue={setMouseSensitivity}/>
                    </Form.Group>
                    <Form.Group controlId="mapLineWidthSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={5.0} logScale={true} sliderTitle="Map lines thickness" intialValue={2.5} externalValue={mapLineWidth} setExternalValue={setMapLineWidth}/>
                    </Form.Group>
                    <hr></hr>
                    <MenuItem variant="success" onClick={() => setShowModal(true)} id='configure-shortcuts-menu-item' style={{marginTop:'0rem'}}>
                        Configure shortcuts
                    </MenuItem>
                    <MoorhenShortcutConfigModal showModal={showModal} setShowModal={setShowModal} setShortCuts={props.setShortCuts} shortCuts={JSON.parse(props.shortCuts)}/>
            </div>
            </NavDropdown>

}
