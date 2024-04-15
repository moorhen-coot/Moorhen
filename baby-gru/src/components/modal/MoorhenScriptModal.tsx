import { useState, useEffect, useCallback } from "react";
import { PlayArrowOutlined } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { highlight, languages } from 'prismjs/components/prism-core';
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import Editor from 'react-simple-code-editor';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/MoorhenUtils";

export const MoorhenScriptModal = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    code?: string;
}) => {

    const [code, setCode] = useState<string>("")
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const handleScriptExe = useCallback(async () => {
        try {
            const scriptApi = new MoorhenScriptApi(props.commandCentre, props.glRef, molecules, maps)
            scriptApi.exe(code)
        }
        catch (err) {
            console.error(err)
        }
    }, [code, props.glRef, maps, molecules])
    
    useEffect(() => {
        if (props.code) {
            setCode(props.code)
        }
    }, [])

    return <MoorhenDraggableModalBase
                modalId="script-modal"
                left={width / 5}
                top={height / 6}
                headerTitle="Interactive scripting"
                defaultHeight={convertViewtoPx(10, height)}
                defaultWidth={convertViewtoPx(10, width)}
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
                {...props}
                />
}