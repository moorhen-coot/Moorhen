import { Form, Row, Stack } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { setValidationJson } from "../../store/jsonValidation";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx, readTextFile } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation";

export const MoorhenJsonValidationModal = () => {
    const dispatch = useDispatch();

    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const loadJsonFiles = async (files: FileList) => {
        for (const file of files) {
            const fileContents = (await readTextFile(file)) as string;
            const json = JSON.parse(fileContents);
            dispatch(setValidationJson(json));
        }
    };

    const footerContent = (
        <MoorhenStack
            gap={2}
            direction="horizontal"
            style={{
                paddingTop: "0.5rem",
                alignItems: "space-between",
                alignContent: "space-between",
                justifyContent: "space-between",
                width: "100%",
            }}
        >
            <MoorhenStack gap={2} direction="horizontal" style={{ alignItems: "center", alignContent: "center", justifyContent: "center" }}>
                <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadMrParse" className="mb-3">
                    <Form.Control
                        type="file"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            loadJsonFiles(e.target.files);
                        }}
                    />
                </Form.Group>
            </MoorhenStack>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.JSON_VALIDATION}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="JSON validation"
            resizeNodeRef={resizeNodeRef}
            footer={footerContent}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"small-validation-tool-container-row"}>
                        <MoorhenJsonValidation />
                    </Row>
                </div>
            }
        />
    );
};
