import { useCallback, useRef } from "react";
import { Form, Row } from "react-bootstrap";
import { readTextFile } from "../../utils/utils";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Store } from "@reduxjs/toolkit";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI";
import { useSelector } from "react-redux";

export const MoorhenLoadScriptMenuItem = (props: {
     setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
     glRef: React.RefObject<webGL.MGWebGL>;
     store: Store;
     commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    
    const filesRef = useRef<null | HTMLInputElement>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const panelContent = <Row>
        <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadScript" className="mb-3">
            <Form.Label>Load and execute script</Form.Label>
            <Form.Control ref={filesRef} type="file" multiple={false} accept=".js" />
        </Form.Group>
    </Row>

    const onCompleted = useCallback(async () => {
        for (const file of filesRef.current.files) {
            const code = await readTextFile(file) as string
            try {
                const scriptApi = new MoorhenScriptApi(props.commandCentre, props.glRef, props.store, molecules, maps)
                scriptApi.exe(code)
            }
            catch (err) {
                console.error(err)
            }    
        }
    }, [molecules, maps])

    return <MoorhenBaseMenuItem
        key='execute-script-menu-item'
        id='execute-on-ligand-menu-item'
        popoverContent={panelContent}
        menuItemText="Load and execute script..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
