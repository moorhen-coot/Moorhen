import { NavDropdown, Form, InputGroup } from "react-bootstrap";
import { useState } from "react";

export const BabyGruPreferencesMenu = (props) => {
    const { darkMode, setDarkMode, defaultExpandDisplayCards, setDefaultExpandDisplayCards } = props;
    
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
            </NavDropdown>

}