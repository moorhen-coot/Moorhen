import { Card, Col, Modal, Row } from "react-bootstrap";
import { MoorhenNavBarExtendedControlsInterface } from "../navbar-menus/MoorhenNavBar";
import { moorhen } from "../../types/moorhen";

const shortCutMouseActions = {
    residue_camera_wiggle: ['mouse-move', 'circle-left-mouse-click', 'one-finger-move'],
    measure_distances: ['circle-left-mouse-click', 'one-finger-tap'],
    measure_angles: ['circle-left-mouse-click', 'one-finger-tap'],
    label_atom: ['circle-left-mouse-click', 'one-finger-tap'],
    center_atom: ['middle-right-mouse-click', 'one-finger-tap'],
    set_map_contour: ['middle-right-mouse-click', 'mouse-scroll-arrows', 'two-finger-scroll'],
    pan_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    rotate_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move']
}

interface MoorhenControlsModalPropsInterface extends MoorhenNavBarExtendedControlsInterface {
    showControlsModal: boolean;
    setShowControlsModal: React.Dispatch<React.SetStateAction<boolean>>;

}

export const MoorhenControlsModal = (props: MoorhenControlsModalPropsInterface) => {
    const shortCuts: moorhen.Shortcut[] = props.shortCuts ? JSON.parse(props.shortCuts as string) : null
    if (shortCuts) {
        shortCuts['pan_view'] = {modifiers: ['shiftKey', 'altKey'], keyPress: '', label: 'Pan view'}
        shortCuts['rotate_view'] = {modifiers: ['shiftKey'], keyPress: '', label: 'Rotate view'} 
    }

    const handleMouseHover = (key: string, modifiers: string[], isMouseEnter: boolean = true) => {
        const cardElement = document.getElementById(`show-controls-card-${key}`)
        cardElement.style.borderWidth = isMouseEnter ? '0.2rem' : '0.1rem'
        cardElement.style.borderColor = isMouseEnter ? 'black' : 'grey'
        const query: any = document.querySelector(".moorhen-keyboard")
        const svg = query.getSVGDocument()
        if (!svg) {
            return
        }
        
        const elementsToHighlight: string[] = [...modifiers, shortCuts[key].keyPress]
        elementsToHighlight.forEach(elementId => {
            const svgElement: SVGElement = svg.getElementById(elementId)
            if(svgElement) {
                 svgElement.style.fill = isMouseEnter ? '#f55142' : '#ffffffff'
            }
        })

        if (Object.hasOwn(shortCutMouseActions, key)) {
            shortCutMouseActions[key].forEach((svgId: string) => {
                const svgElement: SVGElement = svg.getElementById(svgId)
                if(svgElement)  {
                    svgElement.style.display = isMouseEnter ? 'block' : 'none'
                }
            })
        }
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
                                         onMouseEnter={() => handleMouseHover(key, modifiers)}
                                         onMouseLeave={() => handleMouseHover(key, modifiers, false)}>
                                        <Card.Body style={{padding:'0.5rem'}}>
                                            <span style={{fontWeight:'bold'}}>
                                                {`${shortCuts[key].label}`} 
                                            </span>
                                        </Card.Body>
                                    </Card>
                            })}
                    </Col>
                    <Col className="col-8">
                        <object style={{width:'100%', height: '100%'}} className="moorhen-keyboard" data={`${props.urlPrefix}/baby-gru/pixmaps/keyboard-blank.svg`} type="image/svg+xml" aria-label="keyboard"/>
                    </Col>
                    </Row>
                </Modal.Body>
            </Modal>
}
