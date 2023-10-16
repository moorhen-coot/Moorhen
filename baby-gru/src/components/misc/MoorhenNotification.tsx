import { useEffect, useState } from 'react';
import { convertRemToPx } from '../../utils/MoorhenUtils';
import { Zoom } from '@mui/material';

export const MoorhenNotification = (props: {isDark: boolean, windowWidth: number, width?: number, hideDelay?: number, children: JSX.Element}) => {
    const canvasElement = document.getElementById('moorhen-canvas-background')
    let canvasTop: number
    let canvasLeft: number
    let canvasRight: number
    if (canvasElement !== null) {
        const rect = canvasElement.getBoundingClientRect()
        canvasLeft = rect.left
        canvasTop = rect.top
        canvasRight = rect.right
    } else {
        canvasLeft = 0
        canvasTop = 0
        canvasRight = 0
    } 

    const [show, setShow] = useState<boolean>(true)

    useEffect(() => {
        if (props.hideDelay) {
            setTimeout(() => {
                setShow(false)
            }, props.hideDelay)
        }
    }, [])

    return <Zoom in={show} style={{ transitionDelay: show ? '500ms' : '0ms' }}>
        <div
        className="moorhen-notification-div"
        style={{
            position: 'absolute',
            width: `${props.width}rem`,
            top: canvasTop + convertRemToPx(0.5),
            left: canvasLeft + (props.windowWidth / 2) - convertRemToPx(props.width / 2),
            color: props.isDark ? 'white' : 'grey',
            backgroundColor: props.isDark ? 'grey' : 'white',
        }}>
            {props.children}
        </div>
        </Zoom>
}

MoorhenNotification.defaultProps = { width: 14 }