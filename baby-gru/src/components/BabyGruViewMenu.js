import { NavDropdown, Form, Overlay, InputGroup, Button, OverlayTrigger } from "react-bootstrap";
import { createRef, useEffect, useRef, useState } from "react";
import { SketchPicker } from 'react-color'
import BabyGruSlider from "./BabyGruSlider";


export const BabyGruViewMenu = (props) => {
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [backgroundColor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255, a: 1 })
    const [zclipFront, setZclipFront] = useState(5)
    const [zclipBack, setZclipBack] = useState(5)
    const [zfogFront, setZfogFront] = useState(5)
    const [zfogBack, setZfogBack] = useState(5)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState({ current: null })
    const target = useRef(null);
    const clipTrigger = useRef(null)

    useEffect(() => {
        setBackgroundColor({
            r: 255 * props.backgroundColor[0],
            g: 255 * props.backgroundColor[1],
            b: 255 * props.backgroundColor[2],
            a: props.backgroundColor[3]
        })
    }, [props.backgroundColor])

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0) {
            setZclipFront(500 + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - 500)
            setZfogFront(500 - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - 500)
        }
    })

    const handleColorChange = (color) => {
        try {
            setOverlayVisible(false)
            props.setBackgroundColor([color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., color.rgb.a])
            setBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const clipContent = () => {
        return props.glRef.current && props.glRef.current.gl_clipPlane0 &&
            <div style={{ margin: "1rem" }}>
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Front clipping plane"
                    externalValue={zclipFront}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_clipPlane0[3] = newValue - 500
                        props.glRef.current.drawScene()
                        setZclipFront(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Back clipping plane"
                    externalValue={zclipBack}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_clipPlane1[3] = 500 + newValue
                        props.glRef.current.drawScene()
                        setZclipBack(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Front zFog"
                    externalValue={zfogFront}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_fog_start = 500 - newValue
                        props.glRef.current.drawScene()
                        setZfogFront(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Back zFog"
                    externalValue={zfogBack}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_fog_end = newValue + 500
                        props.glRef.current.drawScene()
                        setZfogBack(newValue)
                    }} />
                <Button onClick={() => { setOverlayVisible(false) }}>Dismiss</Button>
            </div>
    }


    return <>
        < NavDropdown title="View" id="basic-nav-dropdown" >
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="setBackground" className="mb-3">
                <Form.Label>Set background color</Form.Label>
                <InputGroup>
                    <Form.Control
                        style={{
                            backgroundColor: `rgba(  ${backgroundColor.r}, ${backgroundColor.g},
                                ${backgroundColor.b},  ${backgroundColor.a})`
                        }}
                        type="text" onKeyDown={(e) => {
                        }} />
                    <Button ref={target}
                        variant="outline-secondary" onClick={(e) => {
                            setOverlayTarget(target)
                            setOverlayVisible(true)
                            setOverlayContent(<SketchPicker
                                color={backgroundColor}
                                onChange={handleColorChange}
                            />)
                        }}>
                        Change
                    </Button>
                </InputGroup>
            </Form.Group>
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="zclip" className="mb-3">
                <Button ref={clipTrigger}
                    style={{ width: '20rem' }} variant="outline-secondary" onClick={(e) => {
                        setOverlayTarget(clipTrigger)
                        setOverlayVisible(true)
                        setOverlayContent(clipContent)
                    }}>
                    Clip and FormGroup
                </Button>
            </Form.Group>
        </NavDropdown >
        <Overlay
            target={overlayTarget.current}
            show={overlayVisible}
            placement={"right"}
            onHide={() => { setOverlayVisible(false) }}
        >
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute', marginBottom: '0.5rem',
                        marginLeft: '1rem', backgroundColor: 'rgba(200, 200, 200, 0.65)',
                        color: 'black', borderRadius: 3, ...props.style,
                    }}
                >
                    {overlayContent}
                </div>
            )}
        </Overlay>
    </>
}

