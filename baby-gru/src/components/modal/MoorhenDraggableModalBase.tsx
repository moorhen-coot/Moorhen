import { useRef, useState } from "react";
import { Card, Stack } from "react-bootstrap";
import Draggable from "react-draggable";
import { convertViewtoPx } from "../../utils/MoorhenUtils";
import { IconButton } from "@mui/material";
import { AddOutlined, CloseOutlined, RemoveOutlined } from "@mui/icons-material";

export const MoorhenDraggableModalBase = (props: {
    windowWidth: number;
    width?: number;
    top?: string;
    left?: string;
    height?: number;
    headerTittle: string;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    windowHeight: number;
    body: JSX.Element | JSX.Element[];
    footer: JSX.Element;
    additionalChildren?: JSX.Element;
}) => {    

    const [opacity, setOpacity] = useState<number>(1.0)
    const [collapse, setCollapse] = useState<boolean>(false)
    const draggableNodeRef = useRef<HTMLDivElement>();

    return <Draggable nodeRef={draggableNodeRef} handle=".handle" >
            <Card
                ref={draggableNodeRef}
                style={{ display: props.show ? 'block' : 'none', position: 'absolute', top: props.top, left: props.left, opacity: opacity, width: props.windowWidth ? convertViewtoPx(props.width, props.windowWidth) : `${props.width}wh`}}
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
            >
                <Card.Header className="handle" style={{ backgroundColor: 'white', justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                    {props.headerTittle}
                    <Stack gap={2} direction="horizontal">
                        <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => setCollapse(!collapse)}>
                            {collapse ? <AddOutlined/> : <RemoveOutlined/>}
                        </IconButton>
                        <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                            <CloseOutlined/>
                        </IconButton>
                    </Stack>
                </Card.Header>
                <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(props.height, props.windowHeight) : `${props.height}vh`, overflowY: 'scroll', display: collapse ? 'none' : 'block', justifyContent: 'center'}}>
                    {props.body}
                </Card.Body>
                {props.footer && 
                <Card.Footer style={{display: collapse ? 'none' : 'flex', alignItems: 'center', justifyContent: 'right'}}>
                    {props.footer}
                </Card.Footer>
                }
                {props.additionalChildren}
            </Card>
        </Draggable>
}

MoorhenDraggableModalBase.defaultProps = { additionalChildren: null, width: 35, height: 45, top: '5rem', left: '5rem'}
