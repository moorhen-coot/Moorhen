import { useRef, useState } from "react";
import { Button, Card, Stack } from "react-bootstrap";
import Draggable from "react-draggable";
import { convertViewtoPx } from "../../utils/MoorhenUtils";
import { AddOutlined, CloseOutlined, RemoveOutlined } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";

/**
 * The base component used to create draggable modals.
 * @property {number} [width=35] - The width of the modal measured in wh
 * @property {number} [height=45] - The height of the modal measured in vh
 * @property {string} [top="5rem"] - The intial top location of the modal
 * @property {string} [left="5rem"] - The intial top location of the modal
 * @property {JSX.Element[]} [additionalHeaderButtons=null] - Additional buttons rendered on the modal header
 * @property {JSX.Element[]} [additionalChildren=null] - Additional JSX elements rendered inside the modal
 * @property {string} headerTitle - The title displayed on the modal header
 * @property {string} [overflowY="scroll"] - Indicates how to handle content overflow on vertical axis
 * @property {string} [handleClassName="handle"] - The css class name for the draggable handle
 * @property {boolean} show - Indicates if the modal is to be displayed
 * @property {function} setShow - Setter function for props.show
 * @property {JSX.Element} [footer=null] - Element rendered as the modal footer
 * @property {JSX.Element} body - Element rendered as the modal body
 * @example 
 * import { MoorhenDraggableModalBase } from "moorhen";
 * 
 * const example = () => {
 *   return <MoorhenDraggableModalBase 
 *                headerTitle="Create covalent link"
 *                additionalChildren={
 *                    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={awaitAtomClick !== -1}>
 *                        <Stack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
 *                            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
 *                            <span>Click on an atom...</span>
 *                            <Button variant='danger' onClick={() => setAwaitAtomClick(-1)}>Cancel</Button>
 *                        </Stack>
 *                    </Backdrop>
 *                }
 *                body={
 *                    <Stack direction='horizontal' gap={2} style={{display: 'flex', justifyContent: 'space-between'}}>
 *                        <AceDRGtomPicker id={1} ref={atomPickerOneRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} {...props}/>
 *                        <AceDRGtomPicker id={2} ref={atomPickerTwoRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} {...props}/>
 *                    </Stack>
 *                }
 *                footer={
 *                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'left', width: '50%'}}>
 *                        <Form.Control type="text" readOnly={true} value={errorMessage}/>
 *                    </div>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
 *                        <Button variant='primary' onClick={handleSubmitToAcedrg}>Run AceDRG</Button>
 *                        <Button variant='danger' onClick={handleCancel} style={{marginLeft: '0.1rem'}}>Cancel</Button>
 *                    </div>
 *                    </div>
 *                }
 *            />
 * }
 * 
 */
export const MoorhenDraggableModalBase = (props: {
    width?: number;
    top?: string;
    left?: string;
    height?: number;
    additionalHeaderButtons?: JSX.Element[];
    headerTitle: string;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    body: JSX.Element | JSX.Element[];
    footer: JSX.Element;
    additionalChildren?: JSX.Element;
    overflowY?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';
    handleClassName?: string;
    showCloseButton?: boolean;
}) => {
    
    const [opacity, setOpacity] = useState<number>(1.0)
    const [collapse, setCollapse] = useState<boolean>(false)
    const draggableNodeRef = useRef<HTMLDivElement>();

    const windowWidth = useSelector((state: moorhen.State) => state.canvasStates.width)
    const windowHeight = useSelector((state: moorhen.State) => state.canvasStates.height)
    const transparentModalsOnMouseOut = useSelector((state: moorhen.State) => state.miscAppSettings.transparentModalsOnMouseOut)

    return <Draggable nodeRef={draggableNodeRef} handle={`.${props.handleClassName}`} >
            <Card
                className="moorhen-draggable-card"
                ref={draggableNodeRef}
                style={{ display: props.show ? 'block' : 'none', position: 'absolute', top: props.top, left: props.left, opacity: opacity, width: windowWidth ? convertViewtoPx(props.width, windowWidth) : `${props.width}wh`}}
                onMouseOver={() => setOpacity(1.0)}
                onMouseOut={() => {
                    if(transparentModalsOnMouseOut) setOpacity(0.5)
                }}
            >
                <Card.Header className={props.handleClassName} style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                    {props.headerTitle}
                    <Stack gap={2} direction="horizontal">
                        {props.additionalHeaderButtons?.map(button => button)}
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => setCollapse(!collapse)}>
                            {collapse ? <AddOutlined/> : <RemoveOutlined/>}
                        </Button>
                        {props.showCloseButton &&
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                            <CloseOutlined/>
                        </Button>                    
                        }
                    </Stack>
                </Card.Header>
                <Card.Body style={{maxHeight: windowHeight ? convertViewtoPx(props.height, windowHeight) : `${props.height}vh`, overflowY: props.overflowY, display: collapse ? 'none' : 'block', justifyContent: 'center'}}>
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

MoorhenDraggableModalBase.defaultProps = { 
    showCloseButton: true, handleClassName: 'handle', additionalHeaderButtons:null, additionalChildren: null, 
    width: 35, height: 45, top: '5rem', left: '5rem', overflowY: 'scroll'
}
