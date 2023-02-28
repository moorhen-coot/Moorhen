import { forwardRef, useState } from 'react';
import { Navbar, Nav,  Spinner, Form } from 'react-bootstrap';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { MoorhenHistoryMenu } from './MoorhenHistoryMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu';

export const MoorhenNavBar = forwardRef((props, ref) => {
    const [currentDropdownId, setCurrentDropdownId] = useState(-1)

    const collectedProps = {currentDropdownId, setCurrentDropdownId, ...props}

    return  <Navbar ref={ref} id='navbar-baby-gru' className={props.isDark ? "navbar-dark" : "navbar-light"} style={{ height: '2rem', justifyContent: 'between', margin: '0.1rem', padding: '0.1rem' }}>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="justify-content-left">
                        <MoorhenFileMenu dropdownId="File" {...collectedProps} />
                        <MoorhenEditMenu dropdownId="Edit" {...collectedProps} />
                        <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} />
                        <MoorhenViewMenu dropdownId="View" {...collectedProps} />
                        <MoorhenHistoryMenu dropdownId="History" {...collectedProps} />
                        <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} />
                        <MoorhenHelpMenu dropdownId="Help" {...collectedProps}/>
                        {props.extraMenus && props.extraMenus.map(menu=>menu)}
                    </Nav>
                </Navbar.Collapse>
                <Nav className="justify-content-right">
                    {props.hoveredAtom.cid && <Form.Control style={{ height: '2rem', width: "20rem" }} type="text" readOnly={true} value={`${props.hoveredAtom.molecule.name}:${props.hoveredAtom.cid}`} />}
                    {props.busy && <Spinner animation="border" style={{ height: '2rem', marginRight: '0.5rem', marginLeft: '0.5rem' }} />}
                </Nav>
            </Navbar>
})