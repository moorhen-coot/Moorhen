import { useRef, useState } from "react";
import { Card } from "react-bootstrap";
import Draggable from "react-draggable";
import { convertViewtoPx } from "../../utils/MoorhenUtils";
import { IconButton } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

export const MoorhenDraggableModalBase = (props: {
    windowWidth: number;
    header: JSX.Element | string;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    windowHeight: number;
    body: JSX.Element;
    footer: JSX.Element;
    additionalChildren?: JSX.Element;
}) => {    

    const [opacity, setOpacity] = useState<number>(1.0)
    const draggableNodeRef = useRef<HTMLDivElement>(null);

    return <Draggable nodeRef={draggableNodeRef} handle=".handle">
            <Card
                style={{position: 'absolute', top: '5rem', left: '5rem', opacity: opacity, width: props.windowWidth ? convertViewtoPx(35, props.windowWidth) : '35wh'}}
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
            >
                <Card.Header ref={draggableNodeRef} className="handle" style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                    {props.header}
                    <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                        <CloseOutlined/>
                    </IconButton>
                </Card.Header>
                <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(45, props.windowHeight) : '45vh', overflowY: 'scroll'}}>
                    {props.body}
                </Card.Body>
                <Card.Footer style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
                    {props.footer}
                </Card.Footer>
                {props.additionalChildren}
            </Card>
        </Draggable>
}

MoorhenDraggableModalBase.defaultProps = { additionalChildren: null }
