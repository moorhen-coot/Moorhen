import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as vec3 from 'gl-matrix/vec3';

export const MoorhenLightPosition = (props) => {

    const SIZE = 200;

    let theVec = vec3.create();
    let theVecNorm = vec3.create();
    vec3.set(theVec, props.initialValue[0], props.initialValue[1], props.initialValue[2]);
    vec3.normalize(theVecNorm, theVec);
    theVecNorm[0] *= 0.5;
    theVecNorm[1] *= 0.5;
    theVecNorm[2] *= 0.5;
    const x_in = parseInt((theVecNorm[0] + 0.5) * SIZE);
    const y_in = parseInt((-theVecNorm[1] + 0.5) * SIZE);
    
    const canvasRef = useRef(null);
    const [x, setX] = useState(x_in);
    const [y, setY] = useState(y_in);
    const [mouseDown,setMouseDown] = useState(false);

    const draw = useCallback((ctx, force) => {
        if(x>SIZE||y>SIZE||x<0||y<0) return;
        const c_x = SIZE/2;
        const c_y = SIZE/2;
        let c_dist = parseFloat((x-c_x)*(x-c_x)+(y-c_y)*(y-c_y))/(SIZE*SIZE)*4;
        if(c_dist>1.0) return;
        const width = SIZE;
        const height = SIZE;
        ctx.fillStyle = 'red';
        ctx.fillRect(0,0,width,height);
        let data = ctx.createImageData(width, height);
        for(let j=0;j<height;j++){
            for(let i=0;i<width;i++){
                if(((c_x-i)*(c_x-i)+(c_y-j)*(c_y-j))<SIZE/2*SIZE/2&&((c_x-x)*(c_x-x)+(c_y-y)*(c_y-y))<SIZE/2*SIZE/2){
                    let dist = 1.0-parseFloat((x-i)*(x-i)+(y-j)*(y-j))/(SIZE*SIZE);
                    if(dist>1) dist = 1;
                    dist = dist * dist * dist * dist;
                    data.data[(j * width + i) * 4] = parseInt(dist * 255);
                    data.data[(j * width + i) * 4 + 1] = parseInt(dist * 255);
                    data.data[(j * width + i) * 4 + 2] = parseInt(dist * 255);
                    data.data[(j * width + i) * 4 + 3] = 255;
                }
            }
        }
        ctx.putImageData(data,0,0);
        const x_2d = x/SIZE - 0.5;
        const y_2d = y/SIZE - 0.5
        const z = 0.5*Math.sqrt(Math.max(0,1.0-4.0*(x_2d*x_2d + y_2d*y_2d)));
        if(mouseDown||force){
            props.setExternalValue([120*x_2d,120*y_2d,120*z]);
        }
        
    }, [mouseDown, x, y, props])

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        draw(ctx);
    }, [])

    return (
        <div style={{width:"200px", height:"200px"}}>
            <canvas
                ref={canvasRef}
                width={200}
                height={200}
                onMouseDown = {(e) => {
                    setMouseDown(true);
                    const rect = canvasRef.current.getBoundingClientRect()
                    setX(e.clientX - rect.left);
                    setY(e.clientY - rect.top);
                    const ctx = canvasRef.current.getContext('2d');
                    draw(ctx,true);
                }}
                onMouseUp = {(e) => {
                    setMouseDown(false);
                }}
                onMouseMove = {(e) => {
                    if(mouseDown){
                        const rect = canvasRef.current.getBoundingClientRect();
                        setX(e.clientX - rect.left);
                        setY(e.clientY - rect.top);
                        const ctx = canvasRef.current.getContext('2d');
                        draw(ctx);
                    }
                }}
            /></div>
    );
}
