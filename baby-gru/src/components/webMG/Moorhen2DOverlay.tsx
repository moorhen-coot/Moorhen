import { useEffect, useState, useRef, useCallback } from 'react'
import { moorhen } from "../../types/moorhen"
import { useDispatch, useSelector } from 'react-redux'
import { addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays } from "../../store/overlaysSlice"

export const Moorhen2DOverlay = ((props) => {

    const dispatch = useDispatch()

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList)
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList)
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList)
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList)
    const callbacks = useSelector((state: moorhen.State) => state.overlays.callBacks)

    const canvas2DRef = useRef<HTMLCanvasElement>(null)

    const [images, setImages] = useState<ImageFrac2D[]>([])

    interface ImageFrac2D {
        x: number
        y: number
        width: number
        height: number
        img: HTMLImageElement
    }

    useEffect(() => {
        const new_images = []
        imageOverlays.forEach(imgSrc => {
            const img = new window.Image()
            img.src = imgSrc.src
            img.crossOrigin = "Anonymous"
            const img_frac:ImageFrac2D = {x:imgSrc.x,y:imgSrc.y,img,width:imgSrc.width,height:imgSrc.height}
            new_images.push(img_frac)
        })
        setImages(new_images)
    }, [imageOverlays])

    const getContext = useCallback(() => {
        const context = canvas2DRef.current.getContext('2d', { alpha: true });
        return context
    }, [canvas2DRef])

    const draw2D = () => {
        if(!canvas2DRef.current) return
        const canvas2D_ctx = getContext()
        if(!canvas2D_ctx) return
        canvas2DRef.current.width = width
        canvas2DRef.current.height = height

        canvas2D_ctx.clearRect(0,0,canvas2DRef.current.width,canvas2DRef.current.height)

        const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114
        textOverlays.forEach(t => {
            canvas2D_ctx.font = t.font
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
                canvas2D_ctx.strokeText(t.text,t.x*canvas2DRef.current.width,t.y*canvas2DRef.current.height)
            } else {
                if(t.fillStyle){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
                canvas2D_ctx.fillText(t.text,t.x*canvas2DRef.current.width,t.y*canvas2DRef.current.height)
            }
        })

        svgPathOverlays.forEach(t => {
            let p = new Path2D(t.path)
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
                canvas2D_ctx.stroke(p)
            } else {
                if(t.fillStyle&&t.drawStyle!=="gradient"){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else if(t.drawStyle==="gradient"){
                    const grad_x0 = t.gradientBoundary[0]
                    const grad_y0 = t.gradientBoundary[1]
                    const grad_x1 = t.gradientBoundary[2]
                    const grad_y1 = t.gradientBoundary[3]
                    const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1)
                    t.gradientStops.forEach(stop => {
                        grad.addColorStop(stop[0], stop[1])
                    })
                    canvas2D_ctx.fillStyle = grad
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
                canvas2D_ctx.fill(p)
            }
        })
        images.forEach(img => {
            if(img.img){
               canvas2D_ctx.drawImage(img.img,canvas2DRef.current.width*img.x,canvas2DRef.current.height*img.y,img.width,img.height)
            }
        })

        fracPathOverlays.forEach(t => {
            canvas2D_ctx.beginPath()
            if(t.drawStyle==="stroke"){
                if(t.strokeStyle){
                    canvas2D_ctx.strokeStyle = t.strokeStyle
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.strokeStyle = "white"
                    else
                        canvas2D_ctx.strokeStyle = "black"
                }
            } else {
                if(t.fillStyle&&t.drawStyle!=="gradient"){
                    canvas2D_ctx.fillStyle = t.fillStyle
                } else if(t.drawStyle==="gradient"){
                    const grad_x0 = canvas2DRef.current.width*t.gradientBoundary[0]
                    const grad_y0 = canvas2DRef.current.height*t.gradientBoundary[1]
                    const grad_x1 = canvas2DRef.current.width*t.gradientBoundary[2]
                    const grad_y1 = canvas2DRef.current.height*t.gradientBoundary[3]
                    const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1)
                    t.gradientStops.forEach(stop => {
                        grad.addColorStop(stop[0], stop[1])
                    })
                    canvas2D_ctx.fillStyle = grad
                } else {
                    if(bright_y<0.5)
                        canvas2D_ctx.fillStyle = "white"
                    else
                        canvas2D_ctx.fillStyle = "black"
                }
            }
            canvas2D_ctx.moveTo(canvas2DRef.current.width*t.path[0][0],canvas2DRef.current.height*t.path[0][1])
            for(let i=0;i<t.path.length;i++){
                canvas2D_ctx.lineTo(canvas2DRef.current.width*t.path[i][0],canvas2DRef.current.height*t.path[i][1])
            }
            if(t.drawStyle==="stroke"){
                canvas2D_ctx.stroke()
            } else {
                canvas2D_ctx.fill()
            }
        })
        callbacks.forEach(f => {
            f(canvas2D_ctx,backgroundColor)
        })
    }

    useEffect(() => {
        draw2D()
    }, [draw2D,textOverlays,imageOverlays,svgPathOverlays,fracPathOverlays,callbacks])

    return  <>
           <canvas style={{pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef} height={width} width={height} />
            </>
});

