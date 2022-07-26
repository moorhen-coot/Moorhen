import React, { useState } from "react"
import { Card, Container, Modal, Navbar, NavDropdown } from "react-bootstrap"
import Utilities from "./MGUtils"
import MiniRSR from "./MiniRSR"
import NormalModes from "./NormalModes"
import Superpose from "./Superpose"

export const WebMGCootMenubar = (props) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [contentType, setContentType] = useState("")

    const helicesChanged = (params) => { props.filePendingChange({ pending: params.pending }); }

    return <Navbar>
        <Navbar.Brand href="#home">WebMGCoot</Navbar.Brand>
        <NavDropdown title="Actions" id="basic-nav-dropdown">
            <NavDropdown.Item onClick={() => { setModalVisible(true); setContentType("Superpose") }}>Superpose</NavDropdown.Item>
            <NavDropdown.Item onClick={() => { setModalVisible(true); setContentType("NormalModes") }}>Normal mode analysis</NavDropdown.Item>
            <NavDropdown.Item onClick={() => { setModalVisible(true); setContentType("MiniRSR") }}>Mini RSR</NavDropdown.Item>
            <NavDropdown.Item onClick={() => { setModalVisible(true); setContentType("Utilities") }}>Utilities</NavDropdown.Item>
        </NavDropdown>
        <Modal dialogClassName="modal-50w" show={modalVisible} onHide={() => { setModalVisible(false); setContentType("") }} >
            <Container className="p-3">
                <Card>
                    <Card.Title>{contentType}</Card.Title>
                    {(() => {
                        switch (contentType) {
                            case "Superpose":
                                return <Superpose {...props} />
                            case "NormalModes":
                                return <NormalModes {...props} />
                            case "MiniRSR":
                                return <MiniRSR {...props} />
                            case "Utilities":
                                return <Utilities {...props} helicesChanged={helicesChanged} />
                            default:
                                return null
                        }
                    })()}
                </Card>
            </Container>
        </Modal>
    </Navbar >
}
