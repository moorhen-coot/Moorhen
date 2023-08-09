import { useEffect, useState } from "react"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { RgbColorPicker } from "react-colorful";
import { CirclePicker } from "react-color"
import { convertRemToPx } from "../../utils/MoorhenUtils";

export const MoorhenBackgroundColorMenuItem = (props: {
    backgroundColor: [number, number, number, number];
    setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right' ;
}) => {
    
    const [backgroundColor, setBackgroundColor] = useState<{ r: number; g: number; b: number; }>({
        r: 255 * props.backgroundColor[0],
        g: 255 * props.backgroundColor[1],
        b: 255 * props.backgroundColor[2],
    })

    useEffect(() => {
        try {
            props.setBackgroundColor([ backgroundColor.r / 255., backgroundColor.g / 255., backgroundColor.b / 255., props.backgroundColor[3] ])
        } catch (err) {
            console.log(err)
        }    
    }, [backgroundColor])

    const handleCircleClick = (color: { rgb: { r: number; g: number; b: number; a: number; } }) => {
        try {
            setBackgroundColor(color.rgb)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            setBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const panelContent = <>
        <RgbColorPicker color={backgroundColor} onChange={handleColorChange} />
        <div style={{padding: '0.5rem', margin: '0.15rem', justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
            <CirclePicker width={convertRemToPx(10)} onChange={handleCircleClick} color={backgroundColor} circleSize={convertRemToPx(10)/9} colors={['#000000', '#5c5c5c', '#8a8a8a', '#cccccc', '#ffffff']}/>
        </div>
    </>

    return <MoorhenBaseMenuItem
        id="change-background-colour-menu-item"
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText="Set background colour..."
        onCompleted={() => props.setPopoverIsShown(false)}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenBackgroundColorMenuItem.defaultProps = { popoverPlacement: "right" }
