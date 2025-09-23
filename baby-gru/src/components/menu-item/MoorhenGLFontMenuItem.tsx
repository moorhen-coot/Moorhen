import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { useSelector, useDispatch } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { setGLLabelsFontFamily, setGLLabelsFontSize } from "../../store/labelSettingsSlice"
import { useEffect } from "react"

export const MoorhenGLFontMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const dispatch = useDispatch()
    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily)
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize)
    const availableFonts = useSelector((state: moorhen.State) => state.labelSettings.availableFonts)
    const fontSizes = [8, 9, 10, 11, 12, 13, 14, 18, 24, 30, 36, 48, 60, 72, 96]
    
    const panelContent = <div>
        <Form.Group key="WebGLFontFamily" style={{ width: '20rem', margin: '0.5rem' }} controlId="WebGLFontFamily" className="mb-3">
            <Form.Label>Graphics labels font</Form.Label>
            <Form.Select value={GLLabelsFontFamily} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {dispatch( setGLLabelsFontFamily(e.target.value) )}}>
            { availableFonts.map((item) => {
                return <option key={item} value={item}>{item}</option>
            })
            }
            </Form.Select>
            <Form.Label>Graphics labels size</Form.Label>
            <Form.Select value={GLLabelsFontSize} onChange={(e) => {dispatch( setGLLabelsFontSize(parseInt(e.target.value)) )}}>
            {fontSizes.map((item) => {
                return <option key={item} value={item}>{item}</option>
            })
            }
            </Form.Select>
        </Form.Group>
    </div>

    return <MoorhenBaseMenuItem
        id='webgl-font-menu-item'
        popoverContent={panelContent}
        menuItemText="Fonts..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
