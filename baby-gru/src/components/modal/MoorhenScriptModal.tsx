import React, { useState, useEffect, useCallback } from "react";
import Draggable from "react-draggable";
import { IconButton } from '@mui/material';
import { CloseOutlined, PlayArrowOutlined } from "@mui/icons-material";
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import { Card, Button } from "react-bootstrap";
import { highlight, languages } from 'prismjs/components/prism-core';
import Editor from 'react-simple-code-editor';
import { MoorhenScriptApi } from "../../utils/MoorhenScriptAPI"
import { MoorhenMapInterface } from "../../utils/MoorhenMap";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

export const MoorhenScriptModal = (props: {
    molecules: moorhen.Molecule[];
    maps: MoorhenMapInterface[];
    glRef: React.RefObject<webGL.MGWebGL>;
    isDark: boolean;
    windowHeight: number;
    windowWidth: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    code?: string;
}) => {

    const [code, setCode] = useState("")
    const [opacity, setOpacity] = useState(0.5)
    
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

    return <Draggable handle=".handle">
        <Card
            style={{position: 'absolute', top: '5rem', left: '5rem', opacity: opacity, width: props.windowWidth ? convertViewtoPx(50, props.windowWidth) : '50wh', display: props.show ? '' : 'none'}}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <Card.Header className="handle" style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                Interactive scripting
                <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                    <CloseOutlined/>
                </IconButton>
            </Card.Header>
            <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(60, props.windowHeight) : '60vh', overflowY: 'scroll'}}>
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
            </Card.Body>
            <Card.Footer style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
                <Button variant='primary' onClick={handleScriptExe}>
                    <PlayArrowOutlined/>
                </Button>
            </Card.Footer>

        </Card>
    </Draggable>
}