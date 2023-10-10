import { useContext, useRef, useState } from "react";
import { Button, Card, Stack } from "react-bootstrap";
import Draggable from "react-draggable";
import { convertViewtoPx } from "../../utils/MoorhenUtils";
import { MoorhenContext } from "../../utils/MoorhenContext";
import { AddOutlined, CloseOutlined, RemoveOutlined } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";

export const MoorhenDraggableModalBase = (props: {
    windowWidth: number;
    width?: number;
    top?: string;
    left?: string;
    height?: number;
    additionalHeaderButtons?: JSX.Element[];
    headerTitle: string;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    windowHeight: number;
    body: JSX.Element | JSX.Element[];
    footer: JSX.Element;
    additionalChildren?: JSX.Element;
    overflowY?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';
    handleClassName?: string;
}) => {

    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    const [opacity, setOpacity] = useState<number>(1.0)
    const [collapse, setCollapse] = useState<boolean>(false)
    const draggableNodeRef = useRef<HTMLDivElement>();

    return <Draggable nodeRef={draggableNodeRef} handle={`.${props.handleClassName}`} >
            <Card
                className="moorhen-draggable-card"
                ref={draggableNodeRef}
                style={{ display: props.show ? 'block' : 'none', position: 'absolute', top: props.top, left: props.left, opacity: opacity, width: props.windowWidth ? convertViewtoPx(props.width, props.windowWidth) : `${props.width}wh`}}
                onMouseOver={() => setOpacity(1.0)}
                onMouseOut={() => {
                    if(context.transparentModalsOnMouseOut) setOpacity(0.5)
                }}
            >
                <Card.Header className={props.handleClassName} style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                    {props.headerTitle}
                    <Stack gap={2} direction="horizontal">
                        {props.additionalHeaderButtons?.map(button => button)}
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => setCollapse(!collapse)}>
                            {collapse ? <AddOutlined/> : <RemoveOutlined/>}
                        </Button>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                            <CloseOutlined/>
                        </Button>
                    </Stack>
                </Card.Header>
                <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(props.height, props.windowHeight) : `${props.height}vh`, overflowY: props.overflowY, display: collapse ? 'none' : 'block', justifyContent: 'center'}}>
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

MoorhenDraggableModalBase.defaultProps = { handleClassName: 'handle', additionalHeaderButtons:null, additionalChildren: null, width: 35, height: 45, top: '5rem', left: '5rem', overflowY: 'scroll'}