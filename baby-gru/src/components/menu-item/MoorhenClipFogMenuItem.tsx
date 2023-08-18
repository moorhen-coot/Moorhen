import { useEffect, useState } from "react"
import MoorhenSlider from "../misc/MoorhenSlider"
import { Form, InputGroup } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { webGL } from "../../types/mgWebGL";

export const MoorhenClipFogMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    resetClippingFogging: boolean;
    setResetClippingFogging: React.Dispatch<React.SetStateAction<boolean>>;
    clipCap: boolean;
    setClipCap: React.Dispatch<React.SetStateAction<boolean>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const [zclipFront, setZclipFront] = useState<number>(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
    const [zclipBack, setZclipBack] = useState<number>(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
    const [zfogFront, setZfogFront] = useState<number>(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
    const [zfogBack, setZfogBack] = useState<number>(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0 && props.glRef.current.gl_clipPlane1) {
            setZclipFront(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
            setZfogFront(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)
        }
    }, [props.glRef.current.gl_clipPlane1[3], props.glRef.current.gl_clipPlane0[3], props.glRef.current.gl_fog_start, props.glRef.current.gl_fog_end])

    const panelContent = <div>
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3]}
            externalValue={zclipFront}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_clipPlane0[3] = newValue - props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZclipFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset}
            externalValue={zclipBack}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_clipPlane1[3] = props.glRef.current.fogClipOffset + newValue
                props.glRef.current.drawScene()
                setZclipBack(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start}
            externalValue={zfogFront}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_fog_start = props.glRef.current.fogClipOffset - newValue
                props.glRef.current.drawScene()
                setZfogFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={zfogBack}
            initialValue={props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_fog_end = newValue + props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZfogBack(newValue)
            }} />
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={props.resetClippingFogging}
                onChange={() => { props.setResetClippingFogging(!props.resetClippingFogging) }}
                label="Reset clipping and fogging on zoom" />
        </InputGroup>
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={props.clipCap}
                onChange={() => { props.setClipCap(!props.clipCap) }}
                label="'Clip-cap' perfect spheres" />
        </InputGroup>
    </div>

    return <MoorhenBaseMenuItem
        id='clipping-fogging-menu-item'
        popoverContent={panelContent}
        menuItemText="Clipping and fogging..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
