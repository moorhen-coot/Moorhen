import { useEffect, useState } from 'react';
import { convertRemToPx } from '../../utils/MoorhenUtils';
import { Zoom } from '@mui/material';
import { useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';

export const MoorhenNotification = (props: {width?: number, hideDelay?: number, children: JSX.Element}) => {
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
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const width = useSelector((state: moorhen.State) => state.canvasStates.width)

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
            left: canvasLeft + (width / 2) - convertRemToPx(props.width / 2),
            color: isDark ? 'white' : 'grey',
            backgroundColor: isDark ? 'grey' : 'white',
        }}>
            {props.children}
        </div>
        </Zoom>
}

MoorhenNotification.defaultProps = { width: 14 }