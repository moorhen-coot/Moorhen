import { Card, Col, Modal, Row } from "react-bootstrap";

const shortCutMouseActions = {
    residue_camera_wiggle: ['mouse-move', 'circle-left-mouse-click', 'one-finger-move'],
    measure_distances: ['circle-left-mouse-click', 'one-finger-tap'],
    label_atom: ['circle-left-mouse-click', 'one-finger-tap'],
    center_atom: ['middle-right-mouse-click', 'one-finger-tap'],
    set_map_contour: ['middle-right-mouse-click', 'mouse-scroll-arrows', 'two-finger-scroll'],
    translate_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    rotate_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move']
}

export const MoorhenControlsModal = (props) => {
    const shortCuts = props.shortCuts ? JSON.parse(props.shortCuts) : null
    if (shortCuts) {
        shortCuts['translate_view'] = {modifiers: ['shiftKey', 'altKey'], keyPress: '', label: 'Translate view'}
        shortCuts['rotate_view'] = {modifiers: ['shiftKey'], keyPress: '', label: 'Rotate view'} 
    }
    
    return <Modal show={props.showControlsModal} backdrop="static" size='lg' onHide={() => props.setShowControlsModal(false)}>
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
                                            if (!svg) return
                                            modifiers.forEach(modifier => {
                                                const svgElement = svg.getElementById(modifier)
                                                if(svgElement) svgElement.style.fill = '#f55142'
                                            })
                                            const svgElement = svg.getElementById(shortCuts[key].keyPress)
                                            if(svgElement) svgElement.style.fill = '#f55142'
                                            if (Object.hasOwn(shortCutMouseActions, key)) {
                                                shortCutMouseActions[key].forEach(svgId => {
                                                    const svgElement = svg.getElementById(svgId)
                                                    if(svgElement) svgElement.style.display = 'block'
                                                })
                                            }
                                         }}
                                         onMouseLeave={() => {
                                            const cardElement = document.getElementById(`show-controls-card-${key}`)
                                            cardElement.style.borderWidth = '0.1rem'
                                            cardElement.style.borderColor = 'grey'
                                            const svg = document.querySelector(".moorhen-keyboard").getSVGDocument()
                                            if (!svg) return
                                            modifiers.forEach(modifier => {
                                                const svgElement = svg.getElementById(modifier)
                                                if (svgElement) svgElement.style.fill = '#ffffffff'
                                            })
                                            const svgElement = svg.getElementById(shortCuts[key].keyPress)
                                            if(svgElement) svgElement.style.fill = '#ffffffff'
                                            if (Object.hasOwn(shortCutMouseActions, key)) {
                                                shortCutMouseActions[key].forEach(svgId => {
                                                    const svgElement = svg.getElementById(svgId)
                                                    if(svgElement) svgElement.style.display = 'none'
                                                })
                                            }
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
}
