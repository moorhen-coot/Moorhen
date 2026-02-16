import { PlayArrowOutlined } from "@mui/icons-material";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import Editor from "react-simple-code-editor";
import { useCallback, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

export const MoorhenScriptModal = () => {
    const [code, setCode] = useState<string>("");

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);

    const handleScriptExe = useCallback(async () => {
        try {
            const scriptApi = new MoorhenScriptApi();
            scriptApi.exe(code);
        } catch (err) {
            console.error(err);
        }
    }, [code, maps, molecules]);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SCRIPTING}
            left={width / 5}
            top={height / 6}
            headerTitle="Interactive scripting"
            minHeight={convertViewtoPx(10, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(60, height)}
            maxWidth={convertRemToPx(55)}
            body={
                <div
                    style={{
                        display: "flex",
                        maxHeight: convertViewtoPx(60, height),
                        minHeight: convertViewtoPx(10, height),
                        overflowY: "auto",
                        backgroundColor: isDark ? "white" : "#e6e6e6",
                        borderColor: "black",
                    }}
                >
                    <div style={{ height: "100%", width: "100%" }}>
                        <Editor
                            value={code}
                            onValueChange={code => setCode(code)}
                            highlight={code => Prism.highlight(code, Prism.languages.javascript, "javascript")}
                            padding={10}
                            style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                                fontSize: 16,
                            }}
                        />
                    </div>
                </div>
            }
            footer={
                <MoorhenButton variant="primary" onClick={handleScriptExe}>
                    <PlayArrowOutlined />
                </MoorhenButton>
            }
        />
    );
};
