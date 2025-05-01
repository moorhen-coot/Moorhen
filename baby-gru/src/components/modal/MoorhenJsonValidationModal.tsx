import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef, useState } from "react";
import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useSelector } from "react-redux";
import { modalKeys } from "../../utils/enums";
import { readTextFile } from "../../utils/utils"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Table  } from "react-bootstrap"

export const MoorhenJsonValidationModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [validationJson, setValidationJson] = useState<any>({})

    const loadJsonFiles = async (files: FileList) => {
        for(const file of files) {
            const fileContents = await readTextFile(file) as string
            const json = JSON.parse(fileContents)
            setValidationJson(json)
        }
    }

    const footerContent = <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'space-between', alignContent: 'space-between', justifyContent: 'space-between', width: '100%' }}>
        <Stack gap={2} direction='horizontal' style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMrParse" className="mb-3">
            <Form.Control type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadJsonFiles(e.target.files) }}/>
            </Form.Group>
        </Stack>
    </Stack>

    const collectedProps = {validationJson:validationJson, collectedProps:props}

    return <MoorhenDraggableModalBase
                modalId={modalKeys.JSON_VALIDATION}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='JSON validation'
                resizeNodeRef={resizeNodeRef}
                footer={footerContent}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"small-validation-tool-container-row"}>
                            <MoorhenJsonValidation {...collectedProps} />
                        </Row>
                    </div>
                }
            />
}

