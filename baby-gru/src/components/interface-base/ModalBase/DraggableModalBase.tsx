import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import useStateWithRef from "@/hooks/useStateWithRef";
import { RootState } from "@/store";
import { setEnableAtomHovering } from "../../../store/hoveringStatesSlice";
import { usePersistentState } from "../../../store/menusSlice";
import { ModalKey, focusOnModal, hideModal, unFocusModal } from "../../../store/modalsSlice";
import { MoorhenButton } from "../../inputs";
import "./draggable-modal-base.css";

type MoorhenDraggableModalBaseProps = {
    headerTitle: string | React.JSX.Element;
    body: React.JSX.Element | React.JSX.Element[];
    modalId: string;
    allowDocking?: boolean;
    initialWidth?: number;
    initialHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    top?: number;
    left?: number;
    rememberSize?: boolean;
    additionalHeaderButtons?: React.JSX.Element[];
    footer?: React.JSX.Element;
    additionalChildren?: React.JSX.Element;
    showCloseButton?: boolean;
    onClose?: () => void | Promise<void>;
    onResize?: (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement | null,
        delta: { width: number; height: number },
        size: { width: number; height: number }
    ) => void;
    onResizeStop?: (
        evt: MouseEvent | TouchEvent,
        direction: "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft",
        ref: HTMLDivElement | null,
        delta: { width: number; height: number }
    ) => void;
    // --- Props accepted for API compatibility but currently unused internally ---
    enforceMaxBodyDimensions?: boolean;
    resizeNodeRef?: null | React.RefObject<HTMLDivElement>;
    overflowY?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    overflowX?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    handleClassName?: string;
    lockAspectRatio?: boolean;
    enableResize?: false | { [key: string]: boolean };
};

/**
 * A draggable, resizable modal component.
 *
 * ## Auto-sizing behavior
 * If `initialWidth` and `initialHeight` are not provided, the modal renders its
 * body off-screen first to measure its natural size, then displays at that size
 * (clamped to min/max bounds). This means the body must be renderable before
 * the modal appears. If the body content is async/slow, provide explicit
 * initial dimensions to avoid a blank flash.
 *
 * ## Drag & resize implementation
 * Both dragging (via the header) and resizing (via the bottom-right handle)
 * work by attaching `pointermove`/`pointerup` listeners to `window` on
 * mousedown, and removing them via AbortController on mouseup. This avoids
 * the jank of CSS-only resize and works even when the pointer leaves the modal.
 *
 * **Stale closure caveat:** Because `dragWindow`, `resizeModal`, etc. are
 * captured by the event listener at mousedown time, they close over the
 * render-cycle's state values. For values that change during the drag gesture
 * (size, callbacks), we use refs (`sizeRef`, `onResizeRef`, `onResizeStopRef`)
 * so the listener always reads current values. See inline comments below.
 *
 * ## Z-index / focus
 * Clicking anywhere on the modal calls `focusOnModal`, which pushes it to
 * the top of the global focus hierarchy. The z-index is derived from position
 * in that hierarchy (999 minus index).
 */
export const MoorhenDraggableModalBase = (props: MoorhenDraggableModalBaseProps) => {
    const {
        showCloseButton = true,
        additionalHeaderButtons = null,
        additionalChildren = null,
        top = 100,
        left = 200,
        initialHeight = null,
        initialWidth = null,
        minHeight = 300,
        minWidth = 300,
        lockAspectRatio = false,
        allowDocking = false,
        rememberSize = true,
        // The following props are accepted but not used internally.
        // They remain in the type so that existing callers don't break.
        // handleClassName: _handleClassName,
        // enableResize: _enableResize,
        // overflowY: _overflowY,
        // overflowX: _overflowX,
        // enforceMaxBodyDimensions: _enforceMaxBodyDimensions,
    } = { ...props };

    // ── Auto-size measurement ──────────────────────────────────────────
    // When no explicit initialWidth/Height is given, we render the body
    // off-screen in a hidden div, measure it with useLayoutEffect, then
    // switch to the real modal. `measured` gates this two-phase render.
    const bodyRef = useRef<HTMLDivElement>(null);
    const [measured, setMeasured] = useState(false);
    const glWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const glHeight = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const sceneWidth = useSelector((state: RootState) => state.sceneSettings.width);
    const sceneHeight = useSelector((state: RootState) => state.sceneSettings.height);
    const maxHeight = props.maxHeight ?? glHeight;
    const maxWidth = props.maxWidth ?? glWidth;
    const aspectRatioRef = useRef<number>(1);
    const [size, setSize, sizeRef] = useStateWithRef<{ width: number; height: number }>({
        width: 1,
        height: 1,
    });
    const [docked, setDocked] = useState<boolean>(false);

    const [savedSize, setSavedSize] = usePersistentState("modalSizes", props.modalId, { width: null, height: null }, true);

    useLayoutEffect(() => {
        if (bodyRef.current) {
            const rect = bodyRef.current.getBoundingClientRect();
            let width: number, height: number;
            if (savedSize.width) {
                console.log(`Restoring saved size: ${savedSize.width}x${savedSize.height}`);
                width = savedSize.width;
                height = savedSize.height;
            } else {
                width = initialWidth ?? Math.min(rect.width, maxWidth);
                height = initialHeight ? initialHeight - 48 - 40 : Math.min(rect.height, maxHeight);
            }
            setSize({
                width: width,
                height: height,
            });
            props.onResize?.(null, "bottomRight", bodyRef.current, { width: 0, height: 0 }, { width, height });
            props.onResizeStop?.(null, "bottomRight", bodyRef.current, { width: 0, height: 0 });
            aspectRatioRef.current = width / height;
            console.log(`Measured body size: ${rect.width}x${rect.height}`);
            setMeasured(true);
        }
    }, []);
    const modalRef = useRef<HTMLDivElement>(null);

    // Refs to avoid stale closures in event listeners.
    //
    // When handleResizeStart attaches `resizeModal` as a pointermove listener,
    // that function is captured from the current render. If React re-renders
    // (e.g. because setSize triggers it), the listener still references the
    // OLD function closure. Regular state (like `size`) would be stale.
    //
    // sizeRef: mirrors `size` synchronously so resizeModal always reads
    //   the latest dimensions without needing the functional setState form
    //   (which would prevent us from also calling the onResize callback
    //   with the computed value).
    //
    // onResizeRef / onResizeStopRef: since callers typically pass inline
    //   arrow functions (new reference every render), a stale closure would
    //   hold an old callback. The ref always points to the latest one.
    const onResizeRef = useRef(props.onResize);
    onResizeRef.current = props.onResize;
    const onResizeStopRef = useRef(props.onResizeStop);
    onResizeStopRef.current = props.onResizeStop;

    const dispatch = useDispatch();
    const focusHierarchy = useSelector((state: RootState) => state.modals.focusHierarchy);
    const transparentModalsOnMouseOut = useSelector((state: RootState) => state.generalStates.transparentModalsOnMouseOut);
    const enableAtomHovering = useSelector((state: RootState) => state.hoveringStates.enableAtomHovering);

    const [currentZIndex, setCurrentZIndex] = useState<number>(999);
    const [opacity, setOpacity] = useState<number>(1.0);
    const [collapse, setCollapse] = useState<boolean>(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: left, y: top });

    // Tracks whether atom hovering was on before a drag/resize started,
    // so we can restore it on stop. We disable hovering during drag/resize
    // to prevent the 3D view from reacting to pointer events meant for us.
    const cachedEnableAtomHovering = useRef<boolean>(false);
    const modalIdRef = useRef<ModalKey>(props.modalId as ModalKey);

    // ── Z-index management ─────────────────────────────────────────────
    // Recalculate our z-index whenever the global focus hierarchy changes.
    useEffect(() => {
        const focusIndex = focusHierarchy.findIndex(item => item === modalIdRef.current);
        setCurrentZIndex(999 - focusIndex);
    }, [focusHierarchy]);

    // Remove ourselves from the focus hierarchy on unmount.
    useEffect(() => {
        return () => {
            dispatch(unFocusModal(modalIdRef.current));
        };
    }, []);

    // Shared AbortController for drag/resize pointer listeners.
    // Aborting the controller removes all listeners registered with its signal.
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // ── Shared helpers ─────────────────────────────────────────────────

    /** Disable atom hovering if active, caching the previous state for restoration. */
    const pauseAtomHovering = () => {
        if (enableAtomHovering) {
            dispatch(setEnableAtomHovering(false));
            cachedEnableAtomHovering.current = true;
        } else {
            cachedEnableAtomHovering.current = false;
        }
    };

    /** Restore atom hovering to its state before the last pause. */
    const resumeAtomHovering = () => {
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
    };

    /**
     * Begin tracking pointer movement. Aborts any previous tracking session,
     * then attaches `onMove` (pointermove) and `onStop` (pointerup) to window
     * using an AbortController for clean teardown.
     *
     * Uses `pointermove` rather than `mousemove` for smoother tracking.
     */
    const beginPointerTracking = (evt: React.MouseEvent | MouseEvent, onMove: (e: PointerEvent) => void, onStop: () => void) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        window.addEventListener("pointermove", onMove, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
        window.addEventListener("pointerup", onStop, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
    };

    // ── Drag logic ─────────────────────────────────────────────────────

    /** onMouseDown handler for the header drag button. Starts drag tracking. */
    const handleDragStart = (evt: React.MouseEvent) => {
        dispatch(focusOnModal(modalIdRef.current));
        pauseAtomHovering();
        evt.preventDefault();
        evt.stopPropagation();
        beginPointerTracking(evt, dragWindow, handleDragStop);
    };

    /** pointerup handler: stops drag tracking and restores atom hovering. */
    const handleDragStop = () => {
        abortControllerRef.current?.abort();
        resumeAtomHovering();
    };

    /**
     * pointermove handler during drag. Computes the delta from last position
     * and updates the modal's translate transform, clamped so at least 100px
     * of the modal remains on screen.
     */
    const dragWindow = (evt: PointerEvent) => {
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
            } else if (x > sceneWidth - size.width) {
                x = sceneWidth - size.width;
            }
            if (y < 0) {
                y = 0;
            } else if (y > sceneHeight - size.height - 88) {
                y = sceneHeight - size.height - 88;
            }
            return { x: docked ? prev.x : x, y };
        });
    };

    useLayoutEffect(() => {
        if (position.x > sceneWidth - size.width) {
            setPosition(prev => ({ ...prev, x: sceneWidth - size.width }));
        }
        if (position.y + size.height + 88 > sceneHeight) {
            const y = sceneHeight - size.height - 88;
            setPosition(prev => ({ ...prev, y: y > 0 ? y : 0 }));
        }
    }, [sceneWidth, sceneHeight]);

    // ── Resize logic ───────────────────────────────────────────────────

    /** onMouseDown handler for the resize grip. Starts resize tracking. */
    const handleResizeStart = (evt: React.MouseEvent<HTMLElement, MouseEvent>): void => {
        pauseAtomHovering();
        evt.preventDefault();
        evt.stopPropagation();
        beginPointerTracking(evt, resizeModal, handleResizeStop);
    };

    /** pointerup handler: stops resize tracking, restores atom hovering, fires onResizeStop. */
    const handleResizeStop = () => {
        abortControllerRef.current?.abort();
        resumeAtomHovering();
        if (rememberSize) {
            setSavedSize(sizeRef.current);
        }
        onResizeStopRef.current?.(null, "bottomRight", null, { width: 0, height: 0 });
    };

    /**
     * pointermove handler during resize. Computes new size from pointer delta,
     * clamps to min/max bounds, then updates both the synchronous ref (for
     * the next pointermove) and React state (to trigger re-render).
     */
    const resizeModal = (evt: PointerEvent) => {
        if (docked) {
            return;
        }
        evt.preventDefault();
        evt.stopPropagation();
        const deltaX = evt.pageX - lastMousePos.current.x;
        const deltaY = evt.pageY - lastMousePos.current.y;
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };

        let width = sizeRef.current.width + deltaX;
        let height = sizeRef.current.height + deltaY;

        if (lockAspectRatio) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                height = width / aspectRatioRef.current;
            } else {
                width = height * aspectRatioRef.current;
            }
        }

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
        const newSize = { width, height };
        setSize(newSize);
        onResizeRef.current?.(evt, "bottomRight", null, { width: deltaX, height: deltaY }, newSize);
    };

    // ── Docking & collapsing logic ─────────────────────────────────────
    const unDockRef = useRef<{ position: { x: number; y: number }; size: { width: number; height: number } }>({ position, size });
    const handleDocking = () => {
        if (!allowDocking) {
            return;
        }
        if (!docked) {
            unDockRef.current = { position, size };
            setPosition({ x: glWidth - 300 - 36, y: 100 });
            setSize(prev => {
                const aspect = prev.width / prev.height;
                return { width: 300, height: 300 / aspect };
            });
            setDocked(true);
            onResizeRef.current?.(null, "bottomRight", null, { width: 0, height: 0 }, { width: 300, height: 300 / aspectRatioRef.current });
            onResizeStopRef.current?.(null, "bottomRight", null, { width: 0, height: 0 });
        } else {
            setPosition(unDockRef.current.position);
            setSize(unDockRef.current.size);
            setDocked(false);
            onResizeRef.current?.(null, "bottomRight", null, { width: 0, height: 0 }, unDockRef.current.size);
            onResizeStopRef.current?.(null, "bottomRight", null, { width: 0, height: 0 });
        }
    };

    useLayoutEffect(() => {
        if (!docked) {
            return;
        }
        setPosition({ x: glWidth - size.width - 36, y: position.y });
    }, [glWidth]);

    // ── Close logic ────────────────────────────────────────────────────
    const handleClose = useCallback(async () => {
        await props.onClose?.();
        dispatch(hideModal(props.modalId));
    }, [props.onClose]);

    // ── Render ─────────────────────────────────────────────────────────

    // Phase 1: measure body off-screen before showing the modal.
    if (!measured) {
        return (
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
    }

    // Phase 2: the actual visible modal.
    return (
        <div
            id={modalIdRef.current}
            ref={modalRef}
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
                minHeight: collapse ? 40 : minHeight + 88,
                maxWidth: maxWidth,
                maxHeight: collapse ? 43 : maxHeight + 48 + 40,
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
                    {allowDocking && (
                        <MoorhenButton
                            type="icon-only"
                            icon={docked ? "MatSymArrowMenuClose" : "MatSymLastPage"}
                            size="small"
                            onClick={handleDocking}
                            tooltip={docked ? "Undock" : "Dock to side"}
                        />
                    )}
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
                    maxHeight: maxHeight - 88, // Account for header/footer height
                    maxWidth: maxWidth,
                }}
            >
                {props.body}
            </div>
            {!collapse && (
                <>
                    <div className="moorhen__modal-footer">
                        {props.footer}
                        {"\u00A0\u00A0\u00A0"}
                        {!docked && (
                            <MoorhenButton
                                type="icon-only"
                                icon="resizable"
                                size="medium"
                                className="moorhen__modal-stretch-button"
                                iconStyle={{ cursor: "nwse-resize" }}
                                onMouseDown={handleResizeStart}
                            />
                        )}
                    </div>
                    {additionalChildren}{" "}
                </>
            )}
        </div>
    );
};
