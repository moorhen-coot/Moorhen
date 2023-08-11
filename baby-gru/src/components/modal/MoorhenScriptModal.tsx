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

export const MoorhenScriptModal = (props: {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    isDark: boolean;
    windowHeight: number;
    windowWidth: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    code?: string;
    transparentModalsOnMouseOut: boolean;
}) => {

    const [code, setCode] = useState<string>("")
    
    const handleScriptExe = useCallback(async () => {
        try {
            const scriptApi = new MoorhenScriptApi(props.molecules, props.maps, props.glRef)
            scriptApi.exe(code)
        }
        catch (err) {
            console.error(err)
        }
    }, [code, props.glRef, props.maps, props.molecules])
    
    useEffect(() => {
        if (props.code) {
            setCode(props.code)
        }
    }, [])

    return <MoorhenDraggableModalBase
                transparentOnMouseOut={props.transparentModalsOnMouseOut}
                headerTitle="Interactive scripting"
                body={
                    <div style={{backgroundColor: props.isDark ? 'white' : '#e6e6e6', borderColor:'black'}}>
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
                }
                footer={
                    <Button variant='primary' onClick={handleScriptExe}>
                        <PlayArrowOutlined/>
                    </Button>
                }
                {...props}
                />
}