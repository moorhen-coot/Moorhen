import { useEffect, useState } from 'react';
import { convertRemToPx } from '../../utils/MoorhenUtils';
import { Zoom } from '@mui/material';
import { useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';

export const MoorhenNotification = (props: {width?: number, maxHeight?: number; hideDelay?: number, children: JSX.Element, placeOnTop?: boolean}) => {
    const canvasElement = document.getElementById('moorhen-canvas-background')
    let canvasTop: number
    let canvasBottom: number
    let canvasLeft: number
    let canvasRight: number
    if (canvasElement !== null) {
        const rect = canvasElement.getBoundingClientRect()
        canvasLeft = rect.left
        canvasTop = rect.top
        canvasBottom = rect.bottom
        canvasRight = rect.right
    } else {
        canvasLeft = 0
        canvasTop = 0
        canvasRight = 0
    } 

    const [show, setShow] = useState<boolean>(true)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)

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
            maxHeight: `${props.maxHeight}rem`,
            top: props.placeOnTop ? canvasTop + convertRemToPx(0.5) : null,
            bottom: !props.placeOnTop ? canvasTop + convertRemToPx(0.5) : null,
            left: canvasLeft + (width / 2) - convertRemToPx(props.width / 2),
            color: isDark ? 'white' : 'grey',
            backgroundColor: isDark ? 'grey' : 'white',
        }}>
            {props.children}
        </div>
        </Zoom>
}

MoorhenNotification.defaultProps = { width: 14, placeOnTop: true, maxHeight: 10 }