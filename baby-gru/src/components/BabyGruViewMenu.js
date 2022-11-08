import { NavDropdown, Form, Overlay, Button } from "react-bootstrap";
import { useEffect, useRef, useState } from "react";
import BabyGruSlider from "./BabyGruSlider";
import { BabyGruBackgroundColorMenuItem } from "./BabyGruMenuItem";


export const BabyGruViewMenu = (props) => {
    const [overlayVisible, setOverlayVisible] = useState(false)
    const [zclipFront, setZclipFront] = useState(5)
    const [zclipBack, setZclipBack] = useState(5)
    const [zfogFront, setZfogFront] = useState(5)
    const [zfogBack, setZfogBack] = useState(5)
    const [overlayContent, setOverlayContent] = useState(<></>)
    const [overlayTarget, setOverlayTarget] = useState({ current: null })
    const target = useRef(null);
    const clipTrigger = useRef(null)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0) {
            setZclipFront(500 + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - 500)
            setZfogFront(500 - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - 500)
        }
    })

    const fractionalLog = (minVal, maxVal, val) => {
        if (minVal < 0.00001) minVal = 0.0001
        if (maxVal < 0.0001) maxVal = 0.0001
        if (val < 0.0001) val = 0.0001
        return 1 + 99 * ((Math.log10(val) - Math.log10(minVal)) / (Math.log10(maxVal) - Math.log10(minVal)))
    }
    const clipContent = () => {
        const initialClipFront = fractionalLog(0.1, 1000, 500 + props.glRef.current.gl_clipPlane0[3])
        const initialClipBack = fractionalLog(0.1, 1000, props.glRef.current.gl_clipPlane1[3])
        const initialFogFront = fractionalLog(0.1, 1000, 500 - props.glRef.current.gl_fog_end)
        const initialFogBack = fractionalLog(0.1, 1000, props.glRef.current.gl_fog_end - 500)
        console.log('initialFogBack', initialFogBack)
        return props.glRef.current && props.glRef.current.gl_clipPlane0 &&
            <div style={{ margin: "1rem" }}>
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Front clip"
                    initialValue={initialClipFront}
                    externalValue={zclipFront}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_clipPlane0[3] = newValue - 500
                        props.glRef.current.drawScene()
                        setZclipFront(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Back clip"
                    initialValue={initialClipBack}
                    externalValue={zclipBack}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_clipPlane1[3] = 500 + newValue
                        props.glRef.current.drawScene()
                        setZclipBack(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Front zFog"
                    initialValue={initialFogFront}
                    externalValue={zfogFront}
                    setExternalValue={(newValue) => {
                        props.glRef.current.gl_fog_start = 500 - newValue
                        props.glRef.current.drawScene()
                        setZfogFront(newValue)
                    }} />
                <BabyGruSlider minVal={0.1} maxVal={1000} logScale={true}
                    sliderTitle="Back zFog"
                    externalValue={zfogBack}
                    initialValue={initialFogBack}
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
            <BabyGruBackgroundColorMenuItem {...props} />
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="zclip" className="mb-3">
                <Button ref={clipTrigger}
                    style={{ width: '20rem' }} variant="light" onClick={(e) => {
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

