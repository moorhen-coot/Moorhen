import type { Overlay2DShape } from "../store/overlaysSlice";
import { arrowHead, pairsOf } from "./overlay2DGeometry";

/** Turn what is drawn next by `degrees` about the point (cx, cy). The caller saves and restores. */
export const rotateAbout = (ctx: CanvasRenderingContext2D, cx: number, cy: number, degrees?: number) => {
    if (!degrees) return
    ctx.translate(cx, cy)
    ctx.rotate(degrees * Math.PI / 180)
    ctx.translate(-cx, -cy)
}

/**
 * Draw one circle, polygon or line.
 *
 * Positions are fractions of the view; sizes are pixels, multiplied by `scale` as text is, so a
 * saved picture at a higher resolution shows the same thing.
 */
export const drawShape = (ctx: CanvasRenderingContext2D, shape: Overlay2DShape, width: number, height: number, scale: number, defaultColour: string) => {
    ctx.save()
    if (shape.type === "Line") {
        const colour = shape.strokeStyle || defaultColour
        const lineWidth = (shape.lineWidth ?? 2) * scale
        let start: [number, number] = [shape.x1 * width, shape.y1 * height]
        let end: [number, number] = [shape.x2 * width, shape.y2 * height]
        ctx.fillStyle = colour
        ctx.strokeStyle = colour
        ctx.lineWidth = lineWidth
        // Heads first, and the line stopped at their bases so its square end does not show past
        // the point.
        const tipEnd = end
        const tipStart = start
        if (shape.arrowEnd) {
            const head = arrowHead(tipEnd, tipStart, lineWidth)
            ctx.beginPath()
            head.corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
            ctx.closePath()
            ctx.fill()
            end = head.base
        }
        if (shape.arrowStart) {
            const head = arrowHead(tipStart, tipEnd, lineWidth)
            ctx.beginPath()
            head.corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
            ctx.closePath()
            ctx.fill()
            start = head.base
        }
        ctx.beginPath()
        ctx.moveTo(start[0], start[1])
        ctx.lineTo(end[0], end[1])
        ctx.stroke()
        ctx.restore()
        return
    }
    const cx = shape.x * width
    const cy = shape.y * height
    ctx.beginPath()
    if (shape.type === "Circle") {
        ctx.ellipse(cx, cy, shape.radiusX * scale, shape.radiusY * scale, (shape.rotation ?? 0) * Math.PI / 180, 0, 2 * Math.PI)
    } else {
        ctx.translate(cx, cy)
        ctx.rotate((shape.rotation ?? 0) * Math.PI / 180)
        pairsOf(shape.points).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * scale, y * scale) : ctx.lineTo(x * scale, y * scale)))
        ctx.closePath()
    }
    if (shape.drawStyle === "stroke") {
        ctx.lineWidth = (shape.lineWidth ?? 1) * scale
        ctx.lineJoin = "round"
        ctx.strokeStyle = shape.strokeStyle || defaultColour
        ctx.stroke()
    } else {
        ctx.fillStyle = shape.fillStyle || defaultColour
        ctx.fill()
    }
    ctx.restore()
}
