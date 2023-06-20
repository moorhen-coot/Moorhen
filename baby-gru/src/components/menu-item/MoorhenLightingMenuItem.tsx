import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import MoorhenSlider from "../misc/MoorhenSlider"
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { webGL } from "../../types/mgWebGL";

export const MoorhenLightingMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: Dispatch<SetStateAction<boolean>> ;
}) => {

    const busyLighting = useRef<boolean>(false)
    const isSetLightPosIsDirty = useRef<boolean>(false)
    const [diffuse, setDiffuse] = useState<[number, number, number, number]>(props.glRef.current.light_colours_diffuse)
    const [specular, setSpecular] = useState<[number, number, number, number]>(props.glRef.current.light_colours_specular)
    const [ambient, setAmbient] = useState<[number, number, number, number]>(props.glRef.current.light_colours_ambient)
    const [specularPower, setSpecularPower] = useState<number>(props.glRef.current.specularPower)
    const [position, setPosition] = useState<[number, number, number]>([props.glRef.current.light_positions[0], props.glRef.current.light_positions[1], props.glRef.current.light_positions[2]])

    const setLightingPositionIfDirty = (newValue: [number, number, number]) => {
        if (isSetLightPosIsDirty.current) {
            busyLighting.current = true
            isSetLightPosIsDirty.current = false
            props.glRef.current.setLightPosition(newValue[0], -newValue[1], newValue[2])
            props.glRef.current.drawScene()
            busyLighting.current = false;
            setLightingPositionIfDirty(newValue)
        }
    }

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.light_colours_diffuse) {
            setDiffuse(props.glRef.current.light_colours_diffuse)
            setSpecular(props.glRef.current.light_colours_specular)
            setAmbient(props.glRef.current.light_colours_ambient)
            setSpecularPower(props.glRef.current.specularPower)
            setPosition([props.glRef.current.light_positions[0], props.glRef.current.light_positions[1], props.glRef.current.light_positions[2]])
        }
    }, [props.glRef.current.specularPower, props.glRef.current.light_positions, props.glRef.current.light_colours_diffuse, props.glRef.current.light_colours_specular, props.glRef.current.light_colours_ambient])

    const panelContent = <div>
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Diffuse"
            initialValue={props.glRef.current.light_colours_diffuse[0]}
            externalValue={props.glRef.current.light_colours_diffuse[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_diffuse = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setDiffuse([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Specular"
            initialValue={props.glRef.current.light_colours_specular[0]}
            externalValue={props.glRef.current.light_colours_specular[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_specular = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setSpecular([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Ambient"
            initialValue={props.glRef.current.light_colours_ambient[0]}
            externalValue={props.glRef.current.light_colours_ambient[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_ambient = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setAmbient([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={1.0} maxVal={128.0} logScale={false}
            sliderTitle="Specular Power"
            initialValue={props.glRef.current.specularPower}
            externalValue={props.glRef.current.specularPower}
            setExternalValue={(newValue: number) => {
                props.glRef.current.specularPower = newValue
                props.glRef.current.drawScene()
                setSpecularPower(newValue)
            }} />
        <MoorhenLightPosition
            initialValue={props.glRef.current.light_positions}
            externalValue={props.glRef.current.light_positions}
            setExternalValue={(newValues: [number, number, number]) => {
                isSetLightPosIsDirty.current = true
                setLightingPositionIfDirty(newValues)
            }}
        />
    </div>

    return <MoorhenBaseMenuItem
        id='lighting-menu-item'
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Lighting..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

