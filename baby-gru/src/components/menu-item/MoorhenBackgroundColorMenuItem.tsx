import { useEffect, useState } from "react"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { RgbColorPicker } from "react-colorful";
import { CirclePicker } from "react-color"
import { convertRemToPx } from "../../utils/utils";
import { useDispatch, useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { setBackgroundColor } from "../../store/sceneSettingsSlice";

export const MoorhenBackgroundColorMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right' ;
}) => {
    
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const dispatch = useDispatch()

    const [innerBackgroundColor, setInnerBackgroundColor] = useState<{ r: number; g: number; b: number; }>({
        r: 255 * backgroundColor[0],
        g: 255 * backgroundColor[1],
        b: 255 * backgroundColor[2],
    })

    useEffect(() => {
        try {
            if (JSON.stringify(backgroundColor) !== JSON.stringify([innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3]])) {
                dispatch(
                    setBackgroundColor([ innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3] ])
                )
            }
        } catch (err) {
            console.log(err)
        }    
    }, [innerBackgroundColor])

    const handleCircleClick = (color: { rgb: { r: number; g: number; b: number; a: number; } }) => {
        try {
            setInnerBackgroundColor(color.rgb)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            setInnerBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const panelContent = <>
        <RgbColorPicker color={innerBackgroundColor} onChange={handleColorChange} />
        <div style={{padding: '0.5rem', margin: '0.15rem', justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
            <CirclePicker width={convertRemToPx(10)} onChange={handleCircleClick} color={innerBackgroundColor} circleSize={convertRemToPx(10)/9} colors={['#000000', '#5c5c5c', '#8a8a8a', '#cccccc', '#ffffff']}/>
        </div>
    </>

    return <MoorhenBaseMenuItem
        id="change-background-colour-menu-item"
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText="Set background colour..."
        onCompleted={() => props.setPopoverIsShown(false)}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement ?? "right"}
    />
}
