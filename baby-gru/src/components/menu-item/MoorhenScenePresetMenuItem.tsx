import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { webGL } from "../../types/mgWebGL";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setResetClippingFogging } from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { setRequestDrawScene } from "../../store/glRefSlice"

export const MoorhenScenePresetMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const [presetValue, setPresetValue] = useState<string | null>(null)

    useEffect(() => {
        switch(presetValue) {
            
            case "model-building":
                dispatch( setResetClippingFogging(true) )
                const fieldDepthFront: number = 8;
                const fieldDepthBack: number = 21;
                if (props.glRef !== null && typeof props.glRef !== 'function') { 
                    props.glRef.current.set_fog_range(props.glRef.current.fogClipOffset - (props.glRef.current.zoom * fieldDepthFront), props.glRef.current.fogClipOffset + (props.glRef.current.zoom * fieldDepthBack))
                    props.glRef.current.set_clip_range(0 - (props.glRef.current.zoom * fieldDepthFront), 0 + (props.glRef.current.zoom * fieldDepthBack))
                    props.glRef.current.doDrawClickedAtomLines = false    
                }
                dispatch(setRequestDrawScene(true))
                break
            
            case "figure-making":
                dispatch( setResetClippingFogging(false) )
                props.glRef.current.gl_clipPlane0[3] = 40 - props.glRef.current.fogClipOffset
                props.glRef.current.gl_clipPlane1[3] = props.glRef.current.fogClipOffset + 40
                props.glRef.current.gl_fog_start = props.glRef.current.fogClipOffset - 2
                props.glRef.current.gl_fog_end = 120 + props.glRef.current.fogClipOffset
                dispatch(setRequestDrawScene(true))
                break
            
            default:
                console.log(`Unrecognised preset... ${presetValue}`)
                break
        }
    }, [presetValue])

    const getToggleButton = (label: string, value: string) => {

        let borderColor: string
        let color: string
        if (presetValue === value) {
            if (isDark) {
                borderColor = 'white'
                color = 'white'
            } else {
                borderColor = 'black'
                color = 'black'
            }
        } else {
            borderColor = 'grey'
            color = 'grey'
        }

        return <ToggleButton value={value} aria-label={value} style={{borderColor: borderColor, color: color}}>
                    {label}
                </ToggleButton>

    }

    const panelContent = <>
        <p>Select a preset...</p>
        <ToggleButtonGroup color={isDark ? 'primary' : "standard"} orientation="vertical" value={presetValue} onChange={(evt, newValue: string) => {setPresetValue(newValue)}} exclusive>
            {getToggleButton('Model building', 'model-building')}
            {getToggleButton('Figure making', 'figure-making')}
        </ToggleButtonGroup>
    </>

    return <MoorhenBaseMenuItem
        id='scene-preset-menu-item'
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Activate scene preset..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
