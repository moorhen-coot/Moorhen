import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { setValidationJson } from "../../store/jsonValidation";
import { modalKeys } from "../../utils/enums";
import { MoorhenFileInput } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation";
import { MoorhenInfoCard } from "../interface-base";

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
        <MoorhenFileInput
            accept=".json"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                loadJsonFiles(e.target.files);
            }}
        />
    );

    const infoText = (
        <>
            <h1>Interesting bits JSON Validation</h1>
            This user interface is designed to load the JSON files produced by some CCP4i2
            tasks. It's primary use case is when Moorhen is started from CCP4i2 with such a
            file and associated data files (coordinates, electron density, etc.).
        </>
    );

    const titleBar = (
        <>
            JSON validation &nbsp; <MoorhenInfoCard infoText={infoText} large />
        </>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.JSON_VALIDATION}
            allowDocking={true}
            openDocked={props.openDocked}
            headerTitle={titleBar}
            resizeNodeRef={resizeNodeRef}
            footer={footerContent}
            onDock={setIsDocked}
            body={<MoorhenJsonValidation isDocked={!!isDocked} />}
        />
    );
};
