import { useState, useEffect } from "react";
import Draggable, { DraggableCore } from "react-draggable";
import { Dialog, Button, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import Paper, { PaperProps } from '@mui/material/Paper';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import { PlayArrowOutlined } from "@mui/icons-material";
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import 'prismjs/themes/prism.css'; //Example style, you can use another

const makeDraggablePaper = (paperProps) => {
    //return <Paper {...paperProps} />
    //Draggable not working for some reason !!!
    return <Draggable handle=".handle">
        <Paper {...paperProps} />
    </Draggable>
}


export const MoorhenScriptModal = (props) => {
    const [code, setCode] = useState("")
    const [opacity, setOpacity] = useState(0.5)

    const { maps, changeMaps, molecules, changeMolecules, commandCentre, glRef, setToastContent } = props;

    useEffect(() => {
        if (props.code) setCode(props.code)
    }, [])

    return <Dialog
        disableEnforceFocus // Allows other things to take focus
        hideBackdrop  // Hides the shaded backdrop
        open={props.show}
        sx={{ opacity: opacity }}
        fullWidth={true}
        maxWidth={`${convertViewtoPx(60, props.windowWidth)}`}
        style={{
            top: '30%', // Position however you like
            height: 'fit-content',  // Ensures that the dialog is 
            width: 'fit-content',   // exactly the same size as its contents
        }}
        PaperComponent={makeDraggablePaper}
        scroll="paper"
        onClose={(event, reason) => {
            if (reason !== 'backdropClick') {
                props.setShow(false)
            }
        }}
        onMouseOver={() => { setOpacity(1.) }}
        onMouseOut={() => { setOpacity(0.5) }}
    >
        <DialogTitle className="handle" style={{ cursor: 'move', width: convertViewtoPx(60, props.windowWidth) }} id="draggable-dialog-title">
            Script
        </DialogTitle>
        <DialogContent style={{ overflowY: "auto", maxHeight: "50vh" }}>
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
        </DialogContent>
        <DialogActions>
            <Button onClick={async () => {
                try {
                    eval(code)
                }
                catch (err) {
                    console.error(err)
                }
            }}><PlayArrowOutlined />
            </Button>
            <Button onClick={() => {
                props.setShow(false)
            }}>Close
            </Button>
        </DialogActions>
    </Dialog>
}