import { createRef, Fragment, useCallback, useEffect, useState } from "react";
import { Table, Button, Row, Col, Form, FormCheck } from "react-bootstrap";
import { doDownload } from "../BabyGruUtils";
import { DownloadOutlined } from '@mui/icons-material';
import BabyGruSlider from "./BabyGruSlider";

//import { Download } from 'react-bootstrap-icons';

export const BabyGruMaps = (props) => {
    const [mapRadius, setMapRadius] = useState(15.)
    const busyContouring = createRef(false)

    useEffect(() => {
    }, [])

    const recontourActiveMap = (newLevel) => {
        if (props.activeMap) {
            props.activeMap.contourLevel = newLevel
            if (props.activeMap.cootContour) {
                if (busyContouring.current) {
                }
                else {
                    busyContouring.current = true
                    props.activeMap.doCootContour(props.glRef.current,
                        ...props.glRef.current.origin,
                        mapRadius,
                        props.activeMap.contourLevel)
                        .then(result => {
                            busyContouring.current = false
                        })
                }
            }
        }
    }

    return <Fragment>
        <Row className="mx-auto" style={{ marginTop: '2rem', width: '20rem' }}>
            <Form.Group style={{ width: '20rem' }} controlId="downloadCoords" className="mb-3">
                <Form.Label>Coot contouring radius</Form.Label>
                <Form.Control type="number" value={mapRadius} onChange={(e) => {
                    setMapRadius(parseFloat(e.target.value))
                }} />
            </Form.Group>
        </Row>
        <Row>
            <Form.Group style={{ width: '20rem' }} controlId="Contouring level" className="mb-3">
                <Form.Label>Contour level</Form.Label>
                <BabyGruSlider minVal={0.01} maxVal={50} logScale={true} setExternalValue={recontourActiveMap} />
            </Form.Group>
        </Row>
        <Table key="BabyGruMaps" style={{ marginTop: '0.5rem' }}>
            <thead><tr><th>Active</th><th>No.</th><th>Name</th><th>Download</th><th>WC</th><th>CC</th></tr></thead>
            <tbody>
                {props.maps.length == 0 ?
                    <div>No map data loaded<hr style={{}}></hr></div> :
                    props.maps.map(map => <BabyGruMapRow {...props}
                        mapRadius={mapRadius}
                        map={map}
                    />)
                }
            </tbody>
        </Table>
    </Fragment>
}

const BabyGruMapRow = (props) => {
    const [webMGContour, setWebMGContour] = useState(false)
    const [cootContour, setCootContour] = useState(true)
    const nextOrigin = createRef([])
    const busyContouring = createRef(false)

    const handleOriginCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                busyContouring.current = true
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    props.mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [props.map.contourLevel, props.mapRadius])

    const handleContourLevelCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                busyContouring.current = true
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    props.mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [props.map.contourLevel, props.mapRadius])


    useEffect(() => {
        document.addEventListener("originChanged", handleOriginCallback);
        document.addEventListener("contourLevelChanged", handleContourLevelCallback);
        return () => {
            document.removeEventListener("originChanged", handleOriginCallback);
            document.removeEventListener("contourLevelChanged", handleContourLevelCallback);
        };
    }, [handleOriginCallback]);

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
    }, [])

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
        if (props.map.cootContour) {
            busyContouring.current = true
            props.map.doCootContour(props.glRef.current,
                ...props.glRef.current.origin.map(coord => -coord),
                props.mapRadius,
                props.map.contourLevel)
                .then(result => {
                    busyContouring.current = false
                })
        }
    }, [props.mapRadius, props.map.contourLevel])

    return <tr key={props.map.mapMolNo} >
        <td>
            <Form.Check checked={props.map === props.activeMap}
                onChange={(e) => {
                    if (e.target.checked) {
                        props.setActiveMap(props.map)
                    }
                }}
            />
        </td>
        <td>{props.map.mapMolNo}</td>
        <td>{props.map.name}</td>
        <td>
            <Button size="sm" variant="outlined"
                onClick={() => {
                    props.map.getMap()
                        .then(reply => {
                            doDownload([reply.data.result.mapData],
                                `${props.map.name.replace('.mtz', '.map')}`
                            )
                        })
                }}>
                <DownloadOutlined />
            </Button>
        </td>
        <td>
            <FormCheck checked={webMGContour}
                onChange={(newState) => {
                    if (newState.target.checked && !webMGContour) {
                        props.map.makeWebMGLive(props.glRef.current)
                        setWebMGContour(true)
                    }
                    else if (!newState.target.checked && webMGContour) {
                        props.map.makeWebMGUnlive(props.glRef.current)
                        setWebMGContour(false)
                    }
                }} />
        </td>
        <td>
            <FormCheck checked={cootContour}
                onChange={(newState) => {
                    if (newState.target.checked && !cootContour) {
                        props.map.makeCootLive(props.glRef.current, props.mapRadius)
                        setCootContour(true)
                    }
                    else if (!newState.target.checked && cootContour) {
                        props.map.makeCootUnlive(props.glRef.current)
                        setCootContour(false)
                    }
                }} />
        </td>
    </tr>
}


