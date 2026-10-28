import { DragGesture, PinchGesture } from '@use-gesture/vanilla';
import { createZQuatFromDX } from '../quatUtils';
import { MGWebGL } from '../mgWebGL';
import { panBy } from './eventHandlers';

/**
 * Touch-gesture layer for the WebGL viewer.
 *
 * The mouse handlers in eventHandlers.ts already implement rotate / translate /
 * z-rotate / zoom, selected by modifier keys inside `doMouseMove`. Touch has no
 * modifier keys, so this layer maps finger gestures onto those *same* code paths
 * by feeding synthetic mouse-shaped events into the existing handlers — the
 * gestures "follow whatever the mouse does" rather than re-deriving the maths.
 *
 * Mapping (see the branches in doMouseMove):
 *   1-finger drag → rotate      (buttons:1, no modifiers)          → myQuat
 *   2-finger drag → translate   (as alt+shift drag)                → panBy (view or active molecule)
 *   twist         → z-rotate    (shiftKey)                         → myQuat
 *   pinch         → zoom        (setZoom(zoom*factor), like wheel) → zoom
 *   tap                         → doClick (on press, as the mouse does)
 *   double-tap                  → doDoubleClick (centre on atom)
 *   long-press (1000ms, still)  → doRightClick (context menu)
 *
 * Notes carried over from the earlier use-gesture prototype:
 *   - Do NOT set `filterTaps` on the drag recogniser: it delays the first
 *     callback until movement exceeds a threshold, so `doClick` never runs on
 *     the initial press and `currentlyDraggedAtom` is not set before drag
 *     events arrive, breaking atom dragging.
 *   - Mouse hover needs nothing here: the native mousemove listener in
 *     attachCanvasListeners already drives doMouseMove / doHover.
 */

const TAP_MAX_PX = 3;
const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 20;
const LONG_PRESS_MS = 1000;
const TWIST_DEADZONE_RAD = 0.001;

/** Build a synthetic event carrying the fields the mouse handlers read. */
function syntheticEvent(
    self: MGWebGL,
    x: number,
    y: number,
    opts: { shiftKey?: boolean; altKey?: boolean; button?: number; buttons?: number } = {}
) {
    return {
        pageX: x,
        pageY: y,
        clientX: x,
        clientY: y,
        shiftKey: opts.shiftKey ?? false,
        altKey: opts.altKey ?? false,
        button: opts.button ?? 0,
        buttons: opts.buttons ?? 0,
        // no-ops so handlers that call these on the event don't throw
        preventDefault: () => {},
        stopPropagation: () => {},
    };
}

/**
 * Attach the touch-gesture recognisers to the canvas. Returns a teardown
 * function that destroys the recognisers.
 */
export function attachTouchGestures(self: MGWebGL): () => void {
    const canvas = self.canvas;

    // Without this the browser claims touches on the canvas for its own page
    // pan / pinch-zoom and cancels them, so the recognisers never see a drag.
    canvas.style.touchAction = 'none';

    let lastTap: { time: number; x: number; y: number } | null = null;

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    const clearLongPress = () => {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    // --- 1-finger drag → rotate; tap → click; long-press → right-click.
    const drag = new DragGesture(
        canvas,
        (state) => {
            const {
                first,
                last,
                pinching,
                movement: [mx, my],
                xy: [x, y],
                elapsedTime,
                event,
            } = state;

            // PinchGesture owns two-finger input. DragGesture and PinchGesture are
            // separate recognisers with separate controllers, so `pinching` is never
            // set here; the drag also keeps tracking its first finger while a second
            // is down. Count the touches instead, and keep the mouse baseline at the
            // first finger so rotation doesn't jump when going back to one finger.
            const touchCount = (event as TouchEvent)?.touches?.length ?? 0;
            if (pinching || touchCount > 1) {
                clearLongPress();
                self.init_x = x;
                self.init_y = y;
                return;
            }

            // Mouse input is fully handled by the native mousedown/mousemove/
            // mouseup/click listeners still registered in attachCanvasListeners.
            // Only drive the simulated path for touch, or DragGesture would
            // double-fire doClick / doMouseMove for the mouse.
            // With `pointer.touch` these are TouchEvents, which have no
            // pointerType; and on release `touches` is already 0.
            const isTouch =
                (event && 'touches' in event) ||
                (event as PointerEvent)?.pointerType === 'touch';
            if (!isTouch) {
                clearLongPress();
                return;
            }

            // Stops the browser following a tap with emulated mouse events,
            // which would reach the native listeners and click a second time.
            // Touch only: on a mouse, cancelling pointerdown would suppress
            // the native mousedown / mousemove / mouseup.
            if (event?.cancelable) event.preventDefault();

            if (first) {
                const down = syntheticEvent(self, x, y, { button: 0, buttons: 1 });
                if (self.keysDown['dist_ang_2d']) {
                    self.doMouseDownMeasure(down, self);
                } else {
                    self.doMouseDown(down, self);
                    // set currentlyDraggedAtom up front (no filterTaps) so an
                    // atom drag that starts immediately still works.
                    self.doClick(down, self);
                }
                self.mouseMoved = false;
                clearLongPress();
                longPressTimer = setTimeout(() => {
                    if (self.mouseDown && !self.mouseMoved) {
                        self.doRightClick(syntheticEvent(self, x, y, { button: 2 }), self);
                    }
                }, LONG_PRESS_MS);
            } else if (last) {
                clearLongPress();
                const up = syntheticEvent(self, x, y, { button: 0 });
                if (self.keysDown['dist_ang_2d']) {
                    self.doMouseUpMeasure(up, self);
                } else {
                    // doClick already ran on press, as it does for the mouse;
                    // a second one here would undo toggles such as atom labels.
                    self.doMouseUp(up, self);
                }

                // The browser's own dblclick is suppressed along with the
                // emulated mouse events, so recognise the double-tap here.
                const isTap =
                    elapsedTime < TAP_MAX_MS &&
                    Math.abs(mx) < TAP_MAX_PX &&
                    Math.abs(my) < TAP_MAX_PX;
                if (!isTap) {
                    lastTap = null;
                } else if (
                    lastTap &&
                    performance.now() - lastTap.time < DOUBLE_TAP_MS &&
                    Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_PX
                ) {
                    lastTap = null;
                    // doDoubleClick reads the cursor position, not the event,
                    // and a tap never moved it: a buttonless move updates it.
                    self.doMouseMove(syntheticEvent(self, x, y), self);
                    self.doDoubleClick(up, self);
                } else {
                    lastTap = { time: performance.now(), x, y };
                }
            } else {
                // ongoing 1-finger move → rotate (buttons:1, no modifiers).
                if (Math.abs(mx) > TAP_MAX_PX || Math.abs(my) > TAP_MAX_PX) {
                    clearLongPress();
                }
                const move = syntheticEvent(self, x, y, { button: 0, buttons: 1 });
                if (self.keysDown['dist_ang_2d']) {
                    self.doMouseMoveMeasure(move, self);
                } else {
                    self.doMouseMove(move, self);
                }
            }
        },
        {
            pointer: { touch: true },
            // Not `preventScrollAxis`: it holds the drag back for 250ms and
            // aborts it as a page scroll if the finger moves before then, so
            // quick drags and taps never reached the handlers.
            eventOptions: { passive: false },
        }
    );

    // --- 2-finger: pinch → zoom, twist → z-rotate, drag → translate.
    let baseZoom: number | null = null;
    let lastAngle = 0;
    let lastOrigin: [number, number] = [0, 0];

    const pinch = new PinchGesture(
        canvas,
        (state) => {
            const {
                first,
                last,
                origin: [ox, oy],
                da: [distance, angle],
                memo,
                event,
            } = state;

            if ((event as PointerEvent)?.pointerType === 'mouse') return memo;

            if (first) {
                clearLongPress();
                baseZoom = self.zoom;
                lastAngle = angle;
                lastOrigin = [ox, oy];
                self.mouseDown = true;
                self.mouseMoved = false;
                return { initialDistance: distance || 1 };
            }

            if (last) {
                baseZoom = null;
                self.mouseDown = false;
                if (self.reContourMapOnlyOnMouseUp) {
                    self.handleOriginUpdated(true);
                }
                return memo;
            }

            const initialDistance = (memo?.initialDistance as number) || distance || 1;

            // pinch → zoom (multiplicative / scale-aware, like doWheel)
            if (baseZoom !== null && distance > 0) {
                const scale = distance / initialDistance;
                let newZoom = baseZoom / scale;
                if (newZoom < 0.01) newZoom = 0.01;
                self.setZoom(newZoom);
            }

            // twist → z-rotate: turn the camera by the finger-angle delta
            // via the same Z-quat helper the mouse shift-drag path uses
            // (createZQuatFromDX takes degrees), so lights + cameras follow.
            const angleDeltaDeg = angle - lastAngle;
            lastAngle = angle;
            if (Math.abs((angleDeltaDeg * Math.PI) / 180) > TWIST_DEADZONE_RAD) {
                const zQ = createZQuatFromDX(angleDeltaDeg);
                // Through the camera, as the mouse shift-drag does, so a twist during
                // a centring move accumulates rather than being overwritten.
                self.turnCameraBy(zQ);
            }

            // two-finger drag → translate: the same panBy the mouse pan branch of
            // doMouseMove uses, so it moves the active molecule when there is one.
            const panDx = (ox - lastOrigin[0]) * self.props.mouseSensitivityFactor;
            const panDy = (oy - lastOrigin[1]) * self.props.mouseSensitivityFactor;
            lastOrigin = [ox, oy];
            if (Math.abs(panDx) > 0.01 || Math.abs(panDy) > 0.01) {
                panBy(self, panDx, panDy);
            }

            self.drawScene();
            return memo;
        },
        {
            pointer: { touch: true },
            eventOptions: { passive: false },
            // Otherwise ctrl+wheel (and trackpad pinch, which arrives as
            // ctrl+wheel) runs this handler as well as doWheel: it zooms on
            // top of set_map_contour's ctrl+scroll and holds mouseDown true.
            pinchOnWheel: false,
        }
    );

    return () => {
        clearLongPress();
        drag.destroy();
        pinch.destroy();
    };
}
