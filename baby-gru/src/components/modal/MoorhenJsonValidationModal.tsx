import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { setValidationJson } from "../../store/jsonValidation";
import { modalKeys } from "../../utils/enums";
<<<<<<< HEAD
import { MoorhenFileInput } from "../inputs";
=======
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";
>>>>>>> d3cee605 (Resolved conflicts)
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation";

export const MoorhenJsonValidationModal = (props: ModalComponentProps) => {
    const dispatch = useDispatch();

    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const [isDocked, setIsDocked] = useState(props.openDocked);

    const loadJsonFiles = async (files: FileList) => {
        for (const file of files) {
<<<<<<< HEAD
            const fileContents = await file.text();
=======
            const fileContents = await file.text()
>>>>>>> d3cee605 (Resolved conflicts)
            const json = JSON.parse(fileContents);
            dispatch(setValidationJson(json));
        }
    };

    const footerContent = !isDocked && (
        <MoorhenFileInput
            accept=".json"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                loadJsonFiles(e.target.files);
            }}
        />
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
            body={<MoorhenJsonValidation isDocked={!!isDocked} />}
        />
    );
};
