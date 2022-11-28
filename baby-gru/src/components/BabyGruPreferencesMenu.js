import { useState } from "react";
import { NavDropdown, Form, InputGroup } from "react-bootstrap";
import { BabyGruShortcutConfigModal } from "./BabyGruShortcutConfigModal"
import { MenuItem } from "@mui/material";

export const BabyGruPreferencesMenu = (props) => {
    const { 
        atomLabelDepthMode, setAtomLabelDepthMode, darkMode, setDarkMode, 
        defaultExpandDisplayCards, setDefaultExpandDisplayCards, defaultLitLines,
        setDefaultLitLines, refineAfterMod, setRefineAfterMod
     } = props;
    const [showModal, setShowModal] = useState(null);

    return <NavDropdown
                    title="Preferences"
                    id="basic-nav-dropdown"
                    autoClose="outside"
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
                <InputGroup style={{ padding:'0.5rem', width: '20rem'}}>
                    <Form.Check 
                        type="switch"
                        label="Expand display cards after file upload"
                        checked={defaultExpandDisplayCards}
                        onChange={() => { setDefaultExpandDisplayCards(!defaultExpandDisplayCards) }}
                    />
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '20rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={darkMode}
                        onChange={() => { setDarkMode(!darkMode) }}
                        label={darkMode ? "Switch lights on": "Switch lights off"}/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '20rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={atomLabelDepthMode}
                        onChange={() => { setAtomLabelDepthMode(!atomLabelDepthMode) }}
                        label="Depth cue atom labels"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '20rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={defaultLitLines}
                        onChange={() => { setDefaultLitLines(!defaultLitLines) }}
                        label="Activate map lit lines by default"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '20rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={refineAfterMod}
                        onChange={() => { setRefineAfterMod(!refineAfterMod) }}
                        label="Automatic triple refine post-modification"/>
                </InputGroup>
                <MenuItem variant="success" onClick={() => setShowModal(true)}>
                    Configure shortcuts
                </MenuItem>
                <BabyGruShortcutConfigModal showModal={showModal} setShowModal={setShowModal} setShortCuts={props.setShortCuts} shortCuts={JSON.parse(props.shortCuts)}/>
            </NavDropdown>

}
