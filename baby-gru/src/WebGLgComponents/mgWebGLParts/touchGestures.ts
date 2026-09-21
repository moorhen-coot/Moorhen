import { DragGesture, PinchGesture } from '@use-gesture/vanilla';
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../quatToMat4.js';
import { createZQuatFromDX } from '../quatUtils';
import { getDeviceScale } from '../webGLUtils';
import { MGWebGL } from '../mgWebGL';

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
 *   2-finger drag → translate   (altKey+shiftKey)                  → setOrigin
 *   twist         → z-rotate    (shiftKey)                         → myQuat
 *   pinch         → zoom        (setZoom(zoom*factor), like wheel) → zoom
 *   tap  (<300ms, <3px)         → doClick
 *   long-press (1000ms, still)  → doRightClick (context menu)
 *
 * Notes carried over from the earlier use-gesture prototype:
 *   - Do NOT set `filterTaps` on the drag recogniser: it delays the first
 *     callback until movement exceeds a threshold, so `doClick` never runs on
 *     the initial press and `currentlyDraggedAtom` is not set before drag
 *     events arrive, breaking atom dragging. Tap is detected manually on release.
 *   - Plain hover (no button down) is not delivered by DragGesture, so a
 *     separate `!mouseDown`-guarded pointermove listener keeps atom hover alive.
 */

const TAP_MAX_MS = 300;
const TAP_MAX_PX = 3;
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
 * function that destroys the recognisers and removes the hover listener.
 */
export function attachTouchGestures(self: MGWebGL): () => void {
    const canvas = self.canvas;

    // --- hover: DragGesture only fires during drags, so drive doHover from a
    //     plain pointermove when no gesture/drag is active (restores atom hover).
    const onPointerMove = (evt: PointerEvent) => {
        if (evt.pointerType === 'touch') return; // touch has no hover
        if (!self.mouseDown) {
            self.doMouseMove(evt, self);
        }
    };
    canvas.addEventListener('pointermove', onPointerMove, false);

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

            // PinchGesture owns two-finger input; ignore drag while pinching.
            if (pinching) {
                clearLongPress();
                return;
            }

            // Mouse input is fully handled by the native mousedown/mousemove/
            // mouseup/click listeners still registered in attachCanvasListeners.
            // Only drive the simulated path for touch, or DragGesture would
            // double-fire doClick / doMouseMove for the mouse.
            const isTouch =
                (event as PointerEvent)?.pointerType === 'touch' ||
                (state.touches ?? 0) > 0;
            if (!isTouch) {
                clearLongPress();
                return;
            }

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
                if (isTouch) {
                    clearLongPress();
                    longPressTimer = setTimeout(() => {
                        if (self.mouseDown && !self.mouseMoved) {
                            self.doRightClick(syntheticEvent(self, x, y, { button: 2 }), self);
                        }
                    }, LONG_PRESS_MS);
                }
            } else if (last) {
                clearLongPress();
                const up = syntheticEvent(self, x, y, { button: 0 });
                const isTap =
                    elapsedTime < TAP_MAX_MS &&
                    Math.abs(mx) < TAP_MAX_PX &&
                    Math.abs(my) < TAP_MAX_PX;
                if (self.keysDown['dist_ang_2d']) {
                    self.doMouseUpMeasure(up, self);
                } else {
                    if (isTouch && isTap) {
                        self.doClick(up, self);
                    }
                    self.doMouseUp(up, self);
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
            preventScrollAxis: 'xy',
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

            // twist → z-rotate: apply the finger-angle delta straight into myQuat
            // via the same Z-quat helper the mouse shift-drag path uses
            // (createZQuatFromDX takes degrees), so lights + cameras follow.
            const angleDeltaDeg = angle - lastAngle;
            lastAngle = angle;
            if (Math.abs((angleDeltaDeg * Math.PI) / 180) > TWIST_DEADZONE_RAD) {
                const zQ = createZQuatFromDX(angleDeltaDeg);
                quat4.multiply(self.myQuat, self.myQuat, zQ);
            }

            // two-finger drag → translate: same origin math as the mouse pan
            // branch of doMouseMove (inverse-quat screen shift, zoom-scaled /8).
            const panDx = (ox - lastOrigin[0]) * self.props.mouseSensitivityFactor;
            const panDy = (oy - lastOrigin[1]) * self.props.mouseSensitivityFactor;
            lastOrigin = [ox, oy];
            if (Math.abs(panDx) > 0.01 || Math.abs(panDy) > 0.01) {
                const moveFactor =
                    (getDeviceScale() * 400.0) / self.canvas.height *
                    self.moveFactor / self.props.mouseSensitivityFactor;
                const invQuat = quat4.create();
                quat4Inverse(self.myQuat, invQuat);
                const theMatrix = quatToMat4(invQuat);
                const xshift = vec3.create();
                vec3.set(xshift, moveFactor * panDx, 0, 0);
                const yshift = vec3.create();
                vec3.set(yshift, 0, moveFactor * panDy, 0);
                vec3.transformMat4(xshift, xshift, theMatrix);
                vec3.transformMat4(yshift, yshift, theMatrix);
                const newOrigin = self.origin.map((coord, i) => {
                    return coord + (self.zoom * xshift[i]) / 8 - (self.zoom * yshift[i]) / 8;
                }) as [number, number, number];
                self.setOrigin(newOrigin, false, !self.reContourMapOnlyOnMouseUp);
            }

            self.drawScene();
            return memo;
        },
        {
            pointer: { touch: true },
            eventOptions: { passive: false },
        }
    );

    return () => {
        clearLongPress();
        canvas.removeEventListener('pointermove', onPointerMove, false);
        drag.destroy();
        pinch.destroy();
    };
}
