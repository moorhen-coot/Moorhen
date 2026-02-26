import { useRef } from "react";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI";
import { readTextFile } from "../../utils/utils";
import { MoorhenButton, MoorhenFileInput } from "../inputs";

export const LoadScript = () => {
    const filesRef = useRef<null | HTMLInputElement>(null);

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
        <>
            <MoorhenFileInput label="Load and execute script" ref={filesRef} multiple={false} accept=".js" />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
