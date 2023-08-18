import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { webGL } from "../../types/mgWebGL";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useState, useEffect } from "react";

export const MoorhenScenePresetMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    resetClippingFogging: boolean;
    setResetClippingFogging: React.Dispatch<React.SetStateAction<boolean>>;
    clipCap: boolean;
    setClipCap: React.Dispatch<React.SetStateAction<boolean>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    isDark: boolean;
}) => {

    const [presetValue, setPresetValue] = useState<string | null>(null)

    useEffect(() => {
        switch(presetValue) {
            
            case "model-building":
                props.setResetClippingFogging(true)
                const fieldDepthFront: number = 8;
                const fieldDepthBack: number = 21;
                if (props.glRef !== null && typeof props.glRef !== 'function') { 
                    props.glRef.current.set_fog_range(props.glRef.current.fogClipOffset - (props.glRef.current.zoom * fieldDepthFront), props.glRef.current.fogClipOffset + (props.glRef.current.zoom * fieldDepthBack))
                    props.glRef.current.set_clip_range(0 - (props.glRef.current.zoom * fieldDepthFront), 0 + (props.glRef.current.zoom * fieldDepthBack))
                    props.glRef.current.doDrawClickedAtomLines = false    
                }
                props.glRef.current.drawScene()
                break
            
            case "figure-making":
                props.setResetClippingFogging(false)
                props.glRef.current.gl_clipPlane0[3] = 40 - props.glRef.current.fogClipOffset
                props.glRef.current.gl_clipPlane1[3] = props.glRef.current.fogClipOffset + 40
                props.glRef.current.gl_fog_start = props.glRef.current.fogClipOffset - 2
                props.glRef.current.gl_fog_end = 120 + props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
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
            if (props.isDark) {
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
        <ToggleButtonGroup color={props.isDark ? 'primary' : "standard"} orientation="vertical" value={presetValue} onChange={(evt, newValue: string) => {setPresetValue(newValue)}} exclusive>
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