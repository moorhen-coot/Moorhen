import { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import { PlayArrowOutlined } from "@mui/icons-material";
import 'prismjs/themes/prism.css'; //Example style, you can use another

export const MoorhenScriptModal = (props) => {
    const [code, setCode] = useState("//No code provided")

    const { maps, changeMaps, molecules, changeMolecules, commandCentre, glRef, setToastContent } = props;

    useEffect(() => {
        if (props.code) setCode(props.code)
    }, [])

    return <Modal show={props.show} size="xl" onHide={() => props.setShow(false)}>
        <Modal.Header closeButton>
            <Modal.Title>Script preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div style={{ overflowY: "auto", maxHeight: "50vh" }}>
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
        </Modal.Body>
        <Modal.Footer>
            <Button onClick={async () => {
                try {
                    eval(code)
                }
                catch (err) {
                    console.error(err)
                }
            }}><PlayArrowOutlined />
            </Button>
        </Modal.Footer>
    </Modal >
}