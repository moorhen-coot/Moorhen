import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import { Button, Card, Stack } from "react-bootstrap";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { AddOutlined, CloseOutlined, RemoveOutlined } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { ResizableBox } from "react-resizable";
import { moorhen } from "../../types/moorhen";
import { setEnableAtomHovering } from "../../store/hoveringStatesSlice";
import { hideModal, focusOnModal, unFocusModal } from "../../store/modalsSlice";
import { MoorhenStore } from "../../moorhen";

type MoorhenDraggableModalBaseProps = {
    headerTitle: string | React.JSX.Element;
    body: React.JSX.Element | React.JSX.Element[];
    modalId: string;
    enforceMaxBodyDimensions?: boolean;
    resizeNodeRef?: null | React.RefObject<HTMLDivElement>;
    initialWidth?: number;
    initialHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    top?: number;
    left?: number;
    additionalHeaderButtons?: React.JSX.Element[];
    footer?: React.JSX.Element;
    additionalChildren?: React.JSX.Element;
    overflowY?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    overflowX?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    handleClassName?: string;
    showCloseButton?: boolean;
    lockAspectRatio?: boolean;
    enableResize?: false | { [key: string]: boolean };
    onResizeStop?: (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement,
        delta: { width: number; height: number }
    ) => void;
    onClose?: () => void | Promise<void>;
    onResize?: (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement,
        delta: { width: number; height: number },
        size: { width: number; height: number }
    ) => void;
};

/**
 * The base component used to create draggable modals.
 * It autoscale to the content if initialWidth and initialHeight are not provided.
 * This scaling need to draw the content first off screen, so of the content is not ready yet, the modal will not be displayed or might be slow to display.
 * In that case provide initialWidth and initialHeight.
 * @property {string} headerTitle - The title displayed on the modal header
 * @property {boolean} show - Indicates if the modal is to be displayed
 * @property {function} setShow - Setter function for props.show
 * @property {JSX.Element} body - Element rendered as the modal body
 * @property {string} modalId - The id assigned to the modal used to keep track of the focused modal and the z-index.
 * @property {number} [width=35] - The width of the modal measured in wh
 * @property {number} [height=45] - The height of the modal measured in vh
 * @property {number} [top=500] - The intial top location of the modal
 * @property {number} [left=500] - The intial top location of the modal
 * @property {React.JSX.Element[]} [additionalHeaderButtons=null] - Additional buttons rendered on the modal header
 * @property {React.JSX.Element[]} [additionalChildren=null] - Additional JSX elements rendered inside the modal
 * @property {string} [overflowY="scroll"] - Indicates how to handle content overflow on vertical axis
 * @property {string} [handleClassName="handle"] - The css class name for the draggable handle
 * @property {JSX.Element} [footer=null] - Element rendered as the modal footer
 * @example
 * import { MoorhenDraggableModalBase } from "moorhen";
 *
 * const example = () => {
 *   return <MoorhenDraggableModalBase
 *             modalId="example-modal-id"
 *             headerTitle="Create covalent link"
 *             additionalChildren={
 *                <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
 *                            open={awaitAtomClick !== -1}>
 *                    <Stack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
 *                        <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
 *                           <span>Click on an atom...</span>
 *                           <Button variant='danger' onClick={() => setAwaitAtomClick(-1)}>Cancel</Button>
 *                    </Stack>
 *                </Backdrop>
 *                }
 *                body={
 *                    <Stack direction='horizontal' gap={2}
 *                             style={{display: 'flex', justifyContent: 'space-between'}}>
 *                        <AceDRGtomPicker id={1} ref={atomPickerOneRef} awaitAtomClick={awaitAtomClick}
 *                           setAwaitAtomClick={setAwaitAtomClick} {...props}/>
 *                        <AceDRGtomPicker id={2} ref={atomPickerTwoRef} awaitAtomClick={awaitAtomClick}
 *                           setAwaitAtomClick={setAwaitAtomClick} {...props}/>
 *                    </Stack>
 *                }
 *                footer={
 *                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'left', width: '50%'}}>
 *                        <Form.Control type="text" readOnly={true} value={errorMessage}/>
 *                    </div>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
 *                        <Button variant='primary' onClick={handleSubmitToAcedrg}>Run AceDRG</Button>
 *                        <Button variant='danger' onClick={handleCancel}
 *                                  style={{marginLeft: '0.1rem'}}>Cancel</Button>
 *                    </div>
 *                    </div>
 *                }
 *          />
 * }
 *
 */
export const MoorhenDraggableModalBase = (props: MoorhenDraggableModalBaseProps) => {
    const {
        showCloseButton = true,
        handleClassName = "handle",
        additionalHeaderButtons = null,
        additionalChildren = null,
        enableResize = {
            top: false,
            right: true,
            bottom: true,
            left: false,
            topRight: false,
            bottomRight: true,
            bottomLeft: true,
            topLeft: false,
        },
        top = 500,
        left = 500,
        overflowY = "auto",
        overflowX = "hidden",
        lockAspectRatio = false,
        initialHeight = null,
        initialWidth = null,
        maxHeight = 600,
        maxWidth = 600,
        minHeight = 100,
        minWidth = 100,
        enforceMaxBodyDimensions = true,
    } = { ...props };

    const urlPrefix = MoorhenStore.getState().coreRefs.paths.urlPrefix;

    // Measure the body size to set the initial size of the modal
    const bodyRef = useRef<HTMLDivElement>(null);
    const [bodySize, setBodySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [measured, setMeasured] = useState(props.initialWidth && props.initialHeight ? true : false);
    useLayoutEffect(() => {
        if (bodyRef.current) {
            setBodySize({
                width: bodyRef.current.offsetWidth,
                height: bodyRef.current.offsetHeight,
            });
            setMeasured(true);
            console.log("measured body size", bodyRef.current.offsetWidth, bodyRef.current.offsetHeight);
        }
    }, [measured, props.body]);

    const getResizableSize = (): { width: number; height: number } => {
        if (initialWidth && initialHeight) {
            return {
                width: initialWidth,
                height: initialHeight,
            };
        } else if (measured) {
            return {
                width: bodySize.width > minWidth ? (bodySize.width < maxWidth ? bodySize.width : maxWidth) : minWidth,
                height:
                    bodySize.height > minHeight
                        ? bodySize.height < maxHeight
                            ? bodySize.height
                            : maxHeight
                        : minHeight,
            };
        } else {
            return {
                width: minWidth,
                height: minHeight,
            };
        }
    };
    const resizableSize = getResizableSize();

    const dispatch = useDispatch();
    const focusHierarchy = useSelector((state: moorhen.State) => state.modals.focusHierarchy);
    const windowWidth = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const windowHeight = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const transparentModalsOnMouseOut = useSelector(
        (state: moorhen.State) => state.generalStates.transparentModalsOnMouseOut
    );
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering);
    const show = useSelector((state: moorhen.State) => state.modals.activeModals.includes(props.modalId));

    const [currentZIndex, setCurrentZIndex] = useState<number>(999);
    const [opacity, setOpacity] = useState<number>(1.0);
    const [collapse, setCollapse] = useState<boolean>(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: left, y: top });

    const draggableNodeRef = useRef<HTMLDivElement>(null);
    const cachedEnableAtomHovering = useRef<boolean>(false);
    const modalIdRef = useRef<string>(props.modalId);

    useEffect(() => {
        const focusIndex = focusHierarchy.findIndex((item) => item === modalIdRef.current);
        setCurrentZIndex(999 - focusIndex);
    }, [focusHierarchy]);

    useEffect(() => {
        return () => {
            dispatch(unFocusModal(modalIdRef.current));
        };
    }, []);

    useEffect(() => {
        if (show) {
            dispatch(focusOnModal(modalIdRef.current));
        } else {
            dispatch(unFocusModal(modalIdRef.current));
        }
    }, [show]);

    useEffect(() => {
        setPosition({
            x: left,
            y: top,
        });
    }, [windowWidth, windowHeight]);

    const handleDrag = (evt: DraggableEvent, data: DraggableData) => {
        setPosition((prev) => {
            return { x: prev.x + data.deltaX, y: prev.y + data.deltaY };
        });
    };

    const handleStart = useCallback(() => {
        if (enableAtomHovering) {
            dispatch(setEnableAtomHovering(false));
            cachedEnableAtomHovering.current = true;
        } else {
            cachedEnableAtomHovering.current = false;
        }
    }, [enableAtomHovering]);

    const handleDragStop = useCallback(() => {
        setPosition((prev) => {
            let x = prev.x;
            let y = prev.y;
            if (x < 0) {
                x = 0;
            } else if (x > windowWidth - 100) {
                x = windowWidth - 100;
            }
            if (y < 0) {
                y = 0;
            } else if (y > windowHeight - 100) {
                y = windowHeight - 100;
            }
            return { x, y };
        });
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
    }, [windowWidth, windowHeight]);

    const handleResizeStop = (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement,
        delta: { width: number; height: number }
    ) => {
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
        props.onResizeStop?.(evt, direction, ref, delta);
    };

    const handleClose = useCallback(async () => {
        await props.onClose?.();
        dispatch(hideModal(props.modalId));
    }, [props.onClose]);

    const handleResize = (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement,
        delta: { width: number; height: number }
    ) => {
        if (props.onResize) {
            const width = draggableNodeRef.current?.clientWidth;
            const height = draggableNodeRef.current?.clientHeight;
            props.onResize(evt, direction, ref, delta, { width, height });
        }
    };

    if (!measured) {
        return (
            // Render a hidden div to measure the body size
            <div
                ref={bodyRef}
                style={{
                    visibility: "hidden",
                    position: "absolute",
                    left: -9999,
                    top: 0,
                    height: "auto",
                    width: "auto",
                    pointerEvents: "none",
                    zIndex: -1,
                }}
            >
                {props.body}
            </div>
        );
    } else {
        return (
            <Draggable
                nodeRef={draggableNodeRef}
                handle={`.${handleClassName}`}
                position={position}
                onDrag={handleDrag}
                onStop={handleDragStop}
                onStart={handleStart}
            >
                <Card
                    id={modalIdRef.current}
                    onClick={() => dispatch(focusOnModal(modalIdRef.current))}
                    className={`moorhen-draggable-card${focusHierarchy[0] === modalIdRef.current ? "-focused" : ""}`}
                    ref={draggableNodeRef}
                    style={{
                        display: show ? "block" : "none",
                        position: "absolute",
                        opacity: opacity,
                        zIndex: currentZIndex,
                    }}
                    onMouseOver={() => setOpacity(1.0)}
                    onMouseOut={() => {
                        if (transparentModalsOnMouseOut) setOpacity(0.5);
                    }}
                >
                    <Card.Header
                        className={handleClassName}
                        style={{
                            minWidth: minWidth,
                            justifyContent: "space-between",
                            display: "flex",
                            cursor: "move",
                            alignItems: "center",
                        }}
                    >
                        {props.headerTitle}
                        <Stack gap={2} direction="horizontal">
                            {collapse ? null : additionalHeaderButtons?.map((button) => button)}
                            <Button
                                variant="white"
                                style={{ margin: "0.1rem", padding: "0.1rem" }}
                                onClick={() => setCollapse(!collapse)}
                            >
                                {collapse ? <AddOutlined /> : <RemoveOutlined />}
                            </Button>
                            {showCloseButton && (
                                <Button
                                    variant="white"
                                    style={{ margin: "0.1rem", padding: "0.1rem" }}
                                    onClick={handleClose}
                                >
                                    <CloseOutlined />
                                </Button>
                            )}
                        </Stack>
                    </Card.Header>
                    <Card.Body
                        style={{
                            display: collapse ? "none" : "flex",
                            justifyContent: "center",
                            flexDirection: "column",
                        }}
                    >
                        <ResizableBox
                            width={resizableSize.width}
                            height={resizableSize.height}
                            minConstraints={[minWidth, minHeight]}
                            maxConstraints={[maxWidth, maxHeight]}
                            lockAspectRatio={lockAspectRatio}
                            ref={props.resizeNodeRef ? props.resizeNodeRef : null}
                            resizeHandles={["se"]}
                            onResizeStop={(e, data) => {
                                handleResizeStop(
                                    e as unknown as MouseEvent | TouchEvent,
                                    data.handle as any,
                                    data.node as HTMLDivElement,
                                    {
                                        width: data.size.width,
                                        height: data.size.height,
                                    }
                                );
                            }}
                            onResizeStart={(e) => handleStart()}
                            onResize={(e, data) => {
                                handleResize(
                                    e as unknown as MouseEvent | TouchEvent,
                                    data.handle as any,
                                    data.node as HTMLDivElement,
                                    {
                                        width: data.size.width,
                                        height: data.size.height,
                                    }
                                );
                            }}
                            handle={
                                enableResize && typeof enableResize === "object" && enableResize.bottomRight ? (
                                    <img
                                        src={`${urlPrefix}/pixmaps/moorhen_icons/resizable.svg`}
                                        draggable="false"
                                        alt="resize"
                                        className="moorhen__modal__base__icon"
                                    />
                                ) : undefined
                            }
                        >
                            <div
                                style={{
                                    overflowY: overflowY as "visible" | "hidden" | "clip" | "scroll" | "auto",
                                    overflowX: overflowX as "visible" | "hidden" | "clip" | "scroll" | "auto",
                                    height: "100%",
                                    width: "100%",
                                    display: "block",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {enforceMaxBodyDimensions ? (
                                    <div
                                        style={
                                            enforceMaxBodyDimensions ? { maxHeight: maxHeight, maxWidth: maxWidth } : {}
                                        }
                                    >
                                        {props.body}
                                    </div>
                                ) : (
                                    props.body
                                )}
                            </div>
                        </ResizableBox>
                    </Card.Body>
                    {props.footer && (
                        <Card.Footer
                            style={{
                                display: collapse ? "none" : "flex",
                                alignItems: "center",
                                justifyContent: "right",
                            }}
                        >
                            {props.footer}
                        </Card.Footer>
                    )}
                    {additionalChildren}
                </Card>
            </Draggable>
        );
    }
};
