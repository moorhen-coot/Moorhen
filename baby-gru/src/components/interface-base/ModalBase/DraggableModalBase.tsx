import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { setIsDraggingAtoms } from "../../../store/generalStatesSlice";
import { setEnableAtomHovering } from "../../../store/hoveringStatesSlice";
import { ModalKey, focusOnModal, hideModal, unFocusModal } from "../../../store/modalsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenButton } from "../../inputs";
import "./draggable-modal-base.css";

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
 *                    <MoorhenStack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
 *                        <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
 *                           <span>Click on an atom...</span>
 *                           <MoorhenButton variant='danger' onClick={() => setAwaitAtomClick(-1)}>Cancel</MoorhenButton>
 *                    </MoorhenStack>
 *                </Backdrop>
 *                }
 *                body={
 *                    <MoorhenStack direction='horizontal' gap={2}
 *                             style={{display: 'flex', justifyContent: 'space-between'}}>
 *                        <AceDRGtomPicker id={1} ref={atomPickerOneRef} awaitAtomClick={awaitAtomClick}
 *                           setAwaitAtomClick={setAwaitAtomClick} />
 *                        <AceDRGtomPicker id={2} ref={atomPickerTwoRef} awaitAtomClick={awaitAtomClick}
 *                           setAwaitAtomClick={setAwaitAtomClick} />
 *                    </MoorhenStack>
 *                }
 *                footer={
 *                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'left', width: '50%'}}>
 *                        <Form.Control type="text" readOnly={true} value={errorMessage}/>
 *                    </div>
 *                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
 *                        <MoorhenButton variant='primary' onClick={handleSubmitToAcedrg}>Run AceDRG</MoorhenButton>
 *                        <MoorhenButton variant='danger' onClick={handleCancel}
 *                                  style={{marginLeft: '0.1rem'}}>Cancel</MoorhenButton>
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
        top = 100,
        left = 200,
        overflowY = "auto",
        overflowX = "hidden",
        lockAspectRatio = false,
        initialHeight = Math.min(400, props.maxHeight),
        initialWidth = Math.min(400, props.maxWidth),
        maxHeight = 600,
        maxWidth = 600,
        minHeight = 100,
        minWidth = 100,
        enforceMaxBodyDimensions = true,
    } = { ...props };

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
            // console.log("measured body size", bodyRef.current.offsetWidth, bodyRef.current.offsetHeight);
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
                height: bodySize.height > minHeight ? (bodySize.height < maxHeight ? bodySize.height : maxHeight) : minHeight,
            };
        } else {
            return {
                width: minWidth,
                height: minHeight,
            };
        }
    };
    const resizableSize = getResizableSize();

    const [size, setSize] = useState<{ width: number; height: number }>(resizableSize);
    const dispatch = useDispatch();
    const focusHierarchy = useSelector((state: moorhen.State) => state.modals.focusHierarchy);
    const windowWidth = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const windowHeight = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const transparentModalsOnMouseOut = useSelector((state: moorhen.State) => state.generalStates.transparentModalsOnMouseOut);
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering);

    const [currentZIndex, setCurrentZIndex] = useState<number>(999);
    const [opacity, setOpacity] = useState<number>(1.0);
    const [collapse, setCollapse] = useState<boolean>(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: left, y: top });

    const cachedEnableAtomHovering = useRef<boolean>(false);
    const modalIdRef = useRef<ModalKey>(props.modalId as ModalKey);

    useEffect(() => {
        const focusIndex = focusHierarchy.findIndex(item => item === modalIdRef.current);
        setCurrentZIndex(999 - focusIndex);
    }, [focusHierarchy]);

    useEffect(() => {
        return () => {
            dispatch(unFocusModal(modalIdRef.current));
        };
    }, []);

    const abortControllerRef = useRef<AbortController | null>(null);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    //** Draggable logic */
    const handleDragStart = evt => {
        if (enableAtomHovering) {
            dispatch(setEnableAtomHovering(false));
            cachedEnableAtomHovering.current = true;
        } else {
            cachedEnableAtomHovering.current = false;
        }
        evt.preventDefault();
        evt.stopPropagation();

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        /// pointer move vs mousemove is what make it work smoothly !
        window.addEventListener("pointermove", dragWindow, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
        window.addEventListener("pointerup", handleDragStop, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
    };

    const handleDragStop = () => {
        abortControllerRef.current?.abort();
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
    };

    const dragWindow = evt => {
        evt.preventDefault();
        evt.stopPropagation();
        const deltaX = evt.pageX - lastMousePos.current.x;
        const deltaY = evt.pageY - lastMousePos.current.y;
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };

        setPosition(prev => {
            let x = prev.x + deltaX;
            let y = prev.y + deltaY;
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
            // console.log("Setting position XY", x, y);
            return { x, y };
        });
    };

    //** Resizable logic */
    const handleResizeStart = (evt: React.MouseEvent<HTMLElement, MouseEvent>): void => {
        if (enableAtomHovering) {
            dispatch(setEnableAtomHovering(false));
            cachedEnableAtomHovering.current = true;
        } else {
            cachedEnableAtomHovering.current = false;
        }
        evt.preventDefault();
        evt.stopPropagation();

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        /// pointer move vs mousemove is what make it work smoothly !
        window.addEventListener("pointermove", resizeModal, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
        window.addEventListener("pointerup", handleResizeStop, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
    };

    const handleResizeStop = () => {
        abortControllerRef.current?.abort();
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
    };

    const resizeModal = evt => {
        evt.preventDefault();
        evt.stopPropagation();
        const deltaX = evt.pageX - lastMousePos.current.x;
        const deltaY = evt.pageY - lastMousePos.current.y;
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };

        setSize(prev => {
            let width = prev.width + deltaX;
            let height = prev.height + deltaY;
            if (width < minWidth) {
                width = minWidth;
            } else if (width > maxWidth) {
                width = maxWidth;
            }
            if (height < minHeight) {
                height = minHeight;
            } else if (height > maxHeight) {
                height = maxHeight;
            }
            return { width, height };
        });
    };

    const handleClose = useCallback(async () => {
        await props.onClose?.();
        dispatch(hideModal(props.modalId));
    }, [props.onClose]);

    //** Measure of the modal before displaying */
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
            /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
            /* eslint-disable jsx-a11y/click-events-have-key-events */
            <div
                id={modalIdRef.current}
                role="dialog"
                aria-modal="true"
                onClick={() => dispatch(focusOnModal(modalIdRef.current))}
                className="moorhen__modal-base-container"
                style={{
                    opacity: opacity,
                    zIndex: currentZIndex,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    height: size.height + 48 + 40,
                    width: size.width,
                    minWidth: minWidth,
                    minHeight: minHeight + 48 + 40,
                    maxWidth: maxWidth,
                    maxHeight: collapse ? 32 + 48 : maxHeight + 48 + 40,
                }}
                onMouseOver={() => setOpacity(1.0)}
                onFocus={() => setOpacity(1.0)}
                onMouseOut={() => {
                    if (transparentModalsOnMouseOut) setOpacity(0.5);
                }}
                onBlur={() => {
                    if (transparentModalsOnMouseOut) setOpacity(0.5);
                }}
            >
                <div className="moorhen__modal-header">
                    <button className="moorhen__modal-draggable-button" onMouseDown={handleDragStart}>
                        {props.headerTitle}
                    </button>
                    <div className={`moorhen__modal-header-buttons`}>
                        {collapse ? null : additionalHeaderButtons?.map(button => button)}
                        <MoorhenButton
                            type="icon-only"
                            icon={collapse ? "MatSymAdd" : "MatSymRemove"}
                            size="small"
                            onClick={() => setCollapse(!collapse)}
                        />
                        {showCloseButton && <MoorhenButton type="icon-only" icon="MatSymClose" size="small" onClick={handleClose} />}
                    </div>
                </div>
                <div
                    className="moorhen__modal-body"
                    style={{
                        maxHeight: maxHeight,
                        maxWidth: maxWidth,
                    }}
                >
                    {props.body}
                </div>
                <div className="moorhen__modal-footer">
                    {props.footer}
                    {"\u00A0\u00A0\u00A0"}
                    <MoorhenButton
                        type="icon-only"
                        icon="resizable"
                        size="medium"
                        className="moorhen__modal-stretch-button"
                        iconStyle={{ cursor: "nwse-resize" }}
                        onMouseDown={handleResizeStart}
                    />
                </div>
                {additionalChildren}
            </div>
        );
    }
};
