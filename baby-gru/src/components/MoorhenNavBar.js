import { forwardRef, useEffect, useState } from 'react';
import { Navbar, Nav,  Spinner, Form } from 'react-bootstrap';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { MoorhenHistoryMenu } from './MoorhenHistoryMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu';
import { SaveOutlined } from '@mui/icons-material';

export const MoorhenNavBar = forwardRef((props, ref) => {
    const [currentDropdownId, setCurrentDropdownId] = useState(-1)
    const [showSaveIcon, setShowSaveIcon] = useState(false)

    useEffect(() => {
        if (props.timeCapsuleRef.current) {
            setShowSaveIcon(props.timeCapsuleRef.current.busy)
        }
    }, [props.timeCapsuleRef.current?.busy])

    const collectedProps = {currentDropdownId, setCurrentDropdownId, ...props}

    return  <Navbar ref={ref} id='navbar-baby-gru' className={props.isDark ? "navbar-dark" : "navbar-light"} style={{ borderBottom: '1px solid grey', height: '2rem', justifyContent: 'between', margin: '0.1rem', padding: '0.1rem' }}>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="justify-content-left" style={{verticalAlign: 'center', alignItems:'center', alignContent:'center'}}>
                        {props.windowWidth >= 1000 ? <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt='Moorhen' style={{height: '1.6rem', marginRight: '0.3rem'}}/> : null}
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
                    {showSaveIcon && <SaveOutlined style={{padding: 0, margin: 0}}/>}
                </Nav>
            </Navbar>
})