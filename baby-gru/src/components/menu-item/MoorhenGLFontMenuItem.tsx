import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenGLFontMenuItem = (props: {
    GLLabelsFontFamily: string;
    setGLLabelsFontFamily: React.Dispatch<React.SetStateAction<string>>;
    availableFonts: string[];
    GLLabelsFontSize: number;
    setGLLabelsFontSize: React.Dispatch<React.SetStateAction<number>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const fontSizes = [8, 9, 10, 11, 12, 13, 14, 18, 24, 30, 36, 48, 60, 72, 96]
    
    const panelContent = <div>
        <Form.Group key="WebGLFontFamily" style={{ width: '20rem', margin: '0.5rem' }} controlId="WebGLFontFamily" className="mb-3">
            <Form.Label>Graphics labels font</Form.Label>
            <Form.Select value={props.GLLabelsFontFamily} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {props.setGLLabelsFontFamily(e.target.value) }}>
            { props.availableFonts.map((item) => {
                return <option key={item} value={item}>{item}</option>
            })
            }
            </Form.Select>
            <Form.Label>Graphics labels size</Form.Label>
            <Form.Select value={props.GLLabelsFontSize} onChange={(e) => { props.setGLLabelsFontSize(parseInt(e.target.value)) }}>
            { fontSizes.map((item) => {
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
