import { Form, Row } from "react-bootstrap";
import { useRef } from "react";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI";
import { readTextFile } from "../../utils/utils";
import { MoorhenButton } from "../inputs";

export const LoadScript = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const filesRef = useRef<null | HTMLInputElement>(null);

    const menuItemText = "Load and execute script...";

    const onCompleted = async () => {
        for (const file of filesRef.current.files) {
            const code = (await readTextFile(file)) as string;
            try {
                const scriptApi = new MoorhenScriptApi();
                scriptApi.exe(code);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <Row>
            <Form.Group style={{ width: "30rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadScript" className="mb-3">
                <Form.Label>Load and execute script</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept=".js" />
            </Form.Group>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </Row>
    );
};
