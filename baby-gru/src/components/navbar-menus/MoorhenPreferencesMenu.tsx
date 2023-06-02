import { useState, useEffect } from "react";
import { NavDropdown, Form, InputGroup } from "react-bootstrap";
import { MoorhenShortcutConfigModal } from "../modal/MoorhenShortcutConfigModal"
import { MenuItem } from "@mui/material";
import { convertViewtoPx } from "../../utils/MoorhenUtils";
import { MoorhenDefaultBondSmoothnessPreferencesMenuItem, MoorhenScoresToastPreferencesMenuItem, MoorhenBackupPreferencesMenuItem, MoorhenGLFontMenuItem } from '../menu-item/MoorhenMenuItem'
import MoorhenSlider from '../misc/MoorhenSlider' 
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

export const MoorhenPreferencesMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const { 
        atomLabelDepthMode, setAtomLabelDepthMode, setMouseSensitivity, enableTimeCapsule,
        defaultExpandDisplayCards, setDefaultExpandDisplayCards, defaultMapLitLines,
        setDefaultMapLitLines, refineAfterMod, setRefineAfterMod, mouseSensitivity, contourWheelSensitivityFactor,
        mapLineWidth, setMapLineWidth, makeBackups, setMakeBackups, timeCapsuleRef, setContourWheelSensitivityFactor,
        showShortcutToast, setShowShortcutToast, defaultMapSurface, setDefaultMapSurface, devMode, setDevMode,
        defaultBondSmoothness, setDefaultBondSmoothness, showScoresToast, setShowScoresToast,
        defaultUpdatingScores, setDefaultUpdatingScores, zoomWheelSensitivityFactor, setEnableTimeCapsule,
        setZoomWheelSensitivityFactor, shortcutOnHoveredAtom, setShortcutOnHoveredAtom, maxBackupCount, 
        setMaxBackupCount, modificationCountBackupThreshold, setModificationCountBackupThreshold, 
     } = props;

    const [showModal, setShowModal] = useState(null);
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    useEffect(() => {
        if (timeCapsuleRef.current) {
            timeCapsuleRef.current.disableBackups = !enableTimeCapsule
            timeCapsuleRef.current.maxBackupCount = maxBackupCount
            timeCapsuleRef.current.modificationCountBackupThreshold = modificationCountBackupThreshold
        }
    }, [maxBackupCount, modificationCountBackupThreshold, enableTimeCapsule])

    return <NavDropdown
                    title="Preferences"
                    id="preferences-nav-dropdown"
                    style={{display:'flex', alignItems:'center'}}
                    autoClose={popoverIsShown ? false : 'outside'}
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId('-1') }}>
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
                            checked={showShortcutToast}
                            onChange={() => { setShowShortcutToast(!showShortcutToast) }}
                            label="Show shortcut popup"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={makeBackups}
                            onChange={() => { setMakeBackups(!makeBackups) }}
                            label="Enable molecule undo/redo backups"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={shortcutOnHoveredAtom}
                            onChange={() => { setShortcutOnHoveredAtom(!shortcutOnHoveredAtom) }}
                            label="Hover on residue to use shortcuts"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={devMode}
                            onChange={() => { setDevMode(!devMode) }}
                            label="Developer mode"/>
                    </InputGroup>
                    <hr></hr>
                    <Form.Group controlId="mouseSensitivitySlider" style={{paddingTop:'0rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.01} maxVal={1.0} logScale={false} sliderTitle="Mouse sensitivity" initialValue={mouseSensitivity} externalValue={mouseSensitivity} setExternalValue={setMouseSensitivity}/>
                    </Form.Group>
                    <Form.Group controlId="zoomWheelSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={9.9} logScale={false} sliderTitle="Mouse wheel zoom sensitivity" initialValue={zoomWheelSensitivityFactor} externalValue={zoomWheelSensitivityFactor} setExternalValue={setZoomWheelSensitivityFactor}/>
                    </Form.Group>
                    <Form.Group controlId="mapWheelSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.01} maxVal={0.1} logScale={false} sliderTitle="Mouse wheel map contour sensitivity" initialValue={contourWheelSensitivityFactor} externalValue={contourWheelSensitivityFactor} setExternalValue={setContourWheelSensitivityFactor}/>
                    </Form.Group>
                    <Form.Group controlId="mapLineWidthSlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
                        <MoorhenSlider minVal={0.1} maxVal={1.5} logScale={true} sliderTitle="Map lines thickness" initialValue={mapLineWidth} externalValue={mapLineWidth} setExternalValue={setMapLineWidth}/>
                    </Form.Group>
                    <hr></hr>
                    <MoorhenBackupPreferencesMenuItem 
                        enableTimeCapsule={enableTimeCapsule}
                        setEnableTimeCapsule={setEnableTimeCapsule}
                        maxBackupCount={maxBackupCount}
                        setMaxBackupCount={setMaxBackupCount}
                        modificationCountBackupThreshold={modificationCountBackupThreshold}
                        setModificationCountBackupThreshold={setModificationCountBackupThreshold}
                        setPopoverIsShown={setPopoverIsShown}
                    />
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
                    <MenuItem id="configure-shortcuts-menu-item" onClick={() => setShowModal(true)} style={{marginTop:'0rem'}}>
                        Configure shortcuts...
                    </MenuItem>
                    <MoorhenShortcutConfigModal showModal={showModal} setShowModal={setShowModal} setShortCuts={props.setShortCuts} shortCuts={JSON.parse(props.shortCuts as string)}/>
                    <MoorhenGLFontMenuItem
                    {...props}
                    setPopoverIsShown={setPopoverIsShown}
                    />
            </div>
            </NavDropdown>

}
