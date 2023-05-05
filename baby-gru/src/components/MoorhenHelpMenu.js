import { Button, Card, Col, Modal, NavDropdown, Row } from "react-bootstrap";
import { useState } from "react";
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";
import { List, ListItem, MenuItem } from "@mui/material";

export const MoorhenHelpMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [showControlsModal, setShowControlsModal] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}
    const shortCuts = props.shortCuts ? JSON.parse(props.shortCuts) : null

    return <>
            < NavDropdown 
                title="Help" 
                id="help-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                    {/**<MoorhenSearchBar {...props}/>
                     *<hr></hr>
                    */}
                     <MenuItem onClick={() => window.open('https://filomenosanchez.github.io/Moorhen/')}>Go to Moorhen blog...</MenuItem>
                     <MoorhenAboutMenuItem {...menuItemProps} />
                     <MenuItem onClick={() => setShowControlsModal(true)}>Show controls...</MenuItem>
            </NavDropdown >

            <Modal show={showControlsModal} backdrop="static" size='lg' onHide={() => setShowControlsModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Moorhen Controls</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{height:'65vh', overflowY: 'scroll'}}>
                <Row>
                    <Col className="col-4" style={{overflowY: 'scroll', height: '60vh'}}>
                    {shortCuts && Object.keys(shortCuts).map(key => {
                            let modifiers = []
                            if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("Shift")
                            if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("Ctrl")
                            if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("Meta")
                            if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("Alt")
                            if (shortCuts[key].keyPress === " ") modifiers.push("Space")
                            return <Card id={`show-controls-card-${key}`} key={key} style={{margin:'0.5rem', borderColor: 'grey'}}
                                         onMouseEnter={() => {
                                            const cardElement = document.getElementById(`show-controls-card-${key}`)
                                            cardElement.style.borderWidth = '0.2rem'
                                            cardElement.style.borderColor = 'black'
                                            const svg = document.querySelector(".moorhen-keyboard").getSVGDocument()
                                            modifiers.forEach(modifier => {
                                                const svgElement = svg.getElementById(modifier)
                                                if(svgElement) svgElement.style.fill = '#f55142'
                                            })
                                            const svgElement = svg.getElementById(shortCuts[key].keyPress)
                                            if(svgElement) svgElement.style.fill = '#f55142'
                                         }}
                                         onMouseLeave={() => {
                                            const cardElement = document.getElementById(`show-controls-card-${key}`)
                                            cardElement.style.borderWidth = '0.1rem'
                                            cardElement.style.borderColor = 'grey'
                                            const svg = document.querySelector(".moorhen-keyboard").getSVGDocument()
                                            modifiers.forEach(modifier => {
                                                const svgElement = svg.getElementById(modifier)
                                                if (svgElement) svgElement.style.fill = '#ffffffff'
                                            })
                                            const svgElement = svg.getElementById(shortCuts[key].keyPress)
                                            if(svgElement) svgElement.style.fill = '#ffffffff'
                                         }}>
                                        <Card.Body style={{padding:'0.5rem'}}>
                                            <span style={{fontWeight:'bold'}}>
                                                {`${shortCuts[key].label}`} 
                                            </span>
                                        </Card.Body>
                                    </Card>
                            })}
                    </Col>
                    <Col className="col-8">
                        <object style={{width:'100%', height: '100%'}} className="moorhen-keyboard" data={`${props.urlPrefix}/baby-gru/pixmaps/keyboard-blank.svg`} type="image/svg+xml"/>
                    </Col>
                    </Row>
                </Modal.Body>
            </Modal>

        </>
    }
