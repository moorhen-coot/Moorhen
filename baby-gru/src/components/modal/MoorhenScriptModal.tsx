import { useState, useCallback } from "react";
import { PlayArrowOutlined } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { highlight, languages } from 'prismjs/components/prism-core';
import Editor from 'react-simple-code-editor';
import { useSelector } from "react-redux";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI"
import { moorhen } from "../../types/moorhen";
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";

export const MoorhenScriptModal = () => {

    const [code, setCode] = useState<string>("")
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const handleScriptExe = useCallback(async () => {
        try {
            const scriptApi = new MoorhenScriptApi()
            scriptApi.exe(code)
        }
        catch (err) {
            console.error(err)
        }
    }, [code, maps, molecules])
    
    return <MoorhenDraggableModalBase
                modalId={modalKeys.SCRIPTING}
                left={width / 5}
                top={height / 6}
                headerTitle="Interactive scripting"
                minHeight={convertViewtoPx(10, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(60, height)}
                maxWidth={convertRemToPx(55)}
                body={
                    <div style={{display: 'flex', maxHeight: convertViewtoPx(60, height), minHeight: convertViewtoPx(10, height) , overflowY: 'auto', backgroundColor: isDark ? 'white' : '#e6e6e6', borderColor:'black'}}>
                        <div style={{height: '100%', width: '100%'}}>
                        <Editor
                                value={code}
                                onValueChange={code => setCode(code)}
                                highlight={code => highlight(code, languages.js)}
                                padding={10}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 16
                                }}
                            /> 
                        </div>
                    </div>
                }
                footer={
                    <Button variant='primary' onClick={handleScriptExe}>
                        <PlayArrowOutlined/>
                    </Button>
                }
                />
}
