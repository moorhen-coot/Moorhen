import { Card, Col, Row } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { convertViewtoPx } from "../../utils/utils";
import parse from 'html-react-parser'
import { modalKeys } from "../../utils/enums";

const shortCutMouseActions = {
    open_context_menu: ['circle-right-mouse-click', 'two-finger-tap'],
    residue_camera_wiggle: ['mouse-move', 'circle-left-mouse-click', 'one-finger-move'],
    residue_selection: ['circle-left-mouse-click', 'one-finger-tap'],
    measure_distances: ['circle-left-mouse-click', 'one-finger-tap'],
    measure_angles: ['circle-left-mouse-click', 'one-finger-tap'],
    label_atom: ['circle-left-mouse-click', 'one-finger-tap'],
    dist_ang_2d: ['circle-left-mouse-click', 'one-finger-tap'],
    center_atom: ['middle-right-mouse-click', 'one-finger-tap'],
    set_map_contour: ['middle-right-mouse-click', 'mouse-scroll-arrows', 'two-finger-scroll'],
    pan_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    rotate_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    contour_lvl: ['mouse-scroll-arrows', 'two-finger-scroll']
}

export const MoorhenControlsModal = (props: { urlPrefix: string }) => {

    const _shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)

    const [svgString, setSvgString] = useState<string | null>(null)

    useEffect(() => {
        const fetchSVG = async () => {
            const response = await fetch(`${props.urlPrefix}/pixmaps/keyboard-blank.svg`)
            if (response.ok) {
                const text = await response.text()
                setSvgString(text)
            }
        }
        fetchSVG()
    }, [])

    const shortCuts: moorhen.Shortcut[] = _shortCuts ? JSON.parse(_shortCuts as string) : null
    if (shortCuts) {
        shortCuts['pan_view'] = {modifiers: ['shiftKey', 'altKey'], keyPress: '', label: 'Pan view'}
        shortCuts['rotate_view'] = {modifiers: ['shiftKey'], keyPress: '', label: 'Rotate view'} 
        shortCuts['open_context_menu'] = {modifiers: [], keyPress: '', label: 'Open context menu'} 
        shortCuts['contour_lvl'] = {modifiers: ['ctrlKey'], keyPress: '', label: 'Change active map contour'}
    }

    const handleMouseHover = (key: string, modifiers: string[], isMouseEnter: boolean = true) => {
        const cardElement = document.getElementById(`show-controls-card-${key}`)
        cardElement.style.borderWidth = isMouseEnter ? '0.2rem' : '0.1rem'
        cardElement.style.borderColor = isMouseEnter ? 'black' : 'grey'
        const svg: any = document.querySelector("#moorhen-keyboard-blank-svg")
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

    return <MoorhenDraggableModalBase
                modalId={modalKeys.SHOW_CONTROLS}
                left={width / 5}
                top={height / 5}
                minHeight={convertViewtoPx(60, height)}
                minWidth={convertViewtoPx(60, width)}
                maxHeight={convertViewtoPx(60, height)}
                maxWidth={convertViewtoPx(60, width)}
                headerTitle='Moorhen Controls'
                enableResize={false}
                footer={null}
                body={
                    <Row style={{display: 'flex'}}>
                    <Col className="col-4" style={{overflowY: 'scroll', height: convertViewtoPx(60, height)}}>
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
                    <Col className="col-8" style={{ display: 'flex' }}>
                        {svgString ? parse(svgString) : null}
                    </Col>
                    </Row>
                }
                {...props}
            />
}
