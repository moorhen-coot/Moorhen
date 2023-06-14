import { useEffect, useState } from "react"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { SketchPicker } from "react-color";

export const MoorhenBackgroundColorMenuItem = (props: {
    backgroundColor: [number, number, number, number];
    setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: 'left' | 'right' ;
}) => {
    
    const [backgroundColor, setBackgroundColor] = useState<{ r: number; g: number; b: number; a: number; }>({
        r: 128, g: 128, b: 128, a: 0.5
    })

    useEffect(() => {
        setBackgroundColor({
            r: 255 * props.backgroundColor[0],
            g: 255 * props.backgroundColor[1],
            b: 255 * props.backgroundColor[2],
            a: props.backgroundColor[3]
        })
    }, [props.backgroundColor])

    const handleColorChange = (color: { rgb: { r: number; g: number; b: number; a: number; } }) => {
        try {
            props.setBackgroundColor([color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., color.rgb.a])
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const panelContent = <>
        <SketchPicker color={backgroundColor} onChange={handleColorChange} />
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
