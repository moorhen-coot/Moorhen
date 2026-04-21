import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { setValidationJson } from "../../store/jsonValidation";
import { modalKeys } from "../../utils/enums";
import { MoorhenFileInput } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation";

export const MoorhenJsonValidationModal = (props: ModalComponentProps) => {
    const dispatch = useDispatch();

    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const [isDocked, setIsDocked] = useState(props.openDocked);

    const loadJsonFiles = async (files: FileList) => {
        for (const file of files) {
            const fileContents = await file.text();
            const json = JSON.parse(fileContents);
            dispatch(setValidationJson(json));
        }
    };

    const footerContent = !isDocked && (
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
                <MoorhenFileInput
                    accept=".json"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        loadJsonFiles(e.target.files);
                    }}
                />
            </MoorhenStack>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.JSON_VALIDATION}
            allowDocking={true}
            openDocked={props.openDocked}
            headerTitle="JSON validation"
            resizeNodeRef={resizeNodeRef}
            footer={footerContent}
            onDock={setIsDocked}
            body={<MoorhenJsonValidation />}
        />
    );
};
