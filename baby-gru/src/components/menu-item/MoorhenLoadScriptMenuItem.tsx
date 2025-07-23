import { useRef } from "react";
import { Form, Row } from "react-bootstrap";
import { readTextFile } from "../../utils/utils";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenLoadScriptMenuItem = (props: {
     setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const filesRef = useRef<null | HTMLInputElement>(null)

    const panelContent = <Row>
        <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadScript" className="mb-3">
            <Form.Label>Load and execute script</Form.Label>
            <Form.Control ref={filesRef} type="file" multiple={false} accept=".js" />
        </Form.Group>
    </Row>

    const onCompleted =async () => {
        for (const file of filesRef.current.files) {
            const code = await readTextFile(file) as string
            try {
                const scriptApi = new MoorhenScriptApi()
                scriptApi.exe(code)
            }
            catch (err) {
                console.error(err)
            }    
        }
    }

    return <MoorhenBaseMenuItem
        key='execute-script-menu-item'
        id='execute-on-ligand-menu-item'
        popoverContent={panelContent}
        menuItemText="Load and execute script..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
