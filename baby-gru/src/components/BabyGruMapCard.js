import { useEffect, useState, createRef, useCallback } from "react";
import { Card, Form, Button, Row, Col, Dropdown, DropdownButton } from "react-bootstrap";
import { doDownload } from '../BabyGruUtils';
import { DownloadOutlined, MoreVertOutlined, VisibilityOffOutlined, VisibilityOutlined, SettingsAccessibilitySharp } from '@mui/icons-material';
import BabyGruSlider from "./BabyGruSlider";

export const BabyGruMapCard = (props) => {
    const [cootContour, setCootContour] = useState(true)
    const [mapRadius, setMapRadius] = useState(props.initialRadius)
    const [mapContourLevel, setMapContourLevel] = useState(props.initialContour)
    const [mapLitLines, setMapLitLines] = useState(props.initialMapLitLines)    
    const nextOrigin = createRef([])
    const busyContouring = createRef(false)

    const handleDeleteMap = () => {
        let newMapList = props.maps.filter(map => map.mapMolNo !== props.map.mapMolNo)
        props.setMaps(newMapList)
        props.map.delete(props.glRef);
    }

    const handleOriginCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                props.map.contourLevel = mapContourLevel
                busyContouring.current = true
                props.commandCentre.current.extendConsoleMessage("Because contourLevel or mapRadius changed useCallback")
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [mapContourLevel, mapRadius])

    const handleContourLevelCallback = useCallback(e => {
        props.map.contourLevel = mapContourLevel
        nextOrigin.current = [...e.detail.map(coord => -coord)]
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping originChanged ', nextOrigin.current)
            }
            else {
                props.map.contourLevel = mapContourLevel
                busyContouring.current = true
                props.map.doCootContour(props.glRef.current,
                    ...nextOrigin.current,
                    mapRadius,
                    props.map.contourLevel)
                    .then(result => {
                        busyContouring.current = false
                    })
            }
        }
    }, [mapContourLevel, mapRadius])

    useEffect(() => {
        document.addEventListener("originChanged", handleOriginCallback);
        document.addEventListener("contourLevelChanged", handleContourLevelCallback);
        return () => {
            document.removeEventListener("originChanged", handleOriginCallback);
            document.removeEventListener("contourLevelChanged", handleContourLevelCallback);
        };
    }, [handleOriginCallback]);

    useEffect(() => {
        setCootContour(props.map.cootContour)
        setMapContourLevel(props.initialContour)
        setMapLitLines(props.initialMapLitLines)
        setMapRadius(props.initialRadius)
    }, [])

    useEffect(() => {
        setCootContour(props.map.cootContour)
        if (props.map.cootContour && !busyContouring.current) {
            busyContouring.current = true
            console.log(props.commandCentre.current)
            props.commandCentre.current.extendConsoleMessage('Because I can')
            props.map.litLines = mapLitLines            
            props.map.contourLevel = mapContourLevel
            props.map.doCootContour(props.glRef.current,
                ...props.glRef.current.origin.map(coord => -coord),
                mapRadius,
                props.map.contourLevel)
                .then(result => {
                    busyContouring.current = false
                })
        }
    }, [mapRadius, mapContourLevel, mapLitLines])

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.map.mapMolNo}>
        <Card.Header>
            <Row className='align-items-center'>
            <Col style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.map.mapMolNo} Map ${props.map.mapName}`}
                </Col>
                <Col style={{display:'flex', justifyContent:'right'}}>
                    <Button size="sm" variant="outlined" onClick={() => {
                        console.log(mapRadius)
                        if (!cootContour) {
                            props.map.makeCootLive(props.glRef.current, mapRadius)
                            setCootContour(true)
                        } else {
                            props.map.makeCootUnlive(props.glRef.current)
                            setCootContour(false)
                        }
                    }}>
                        {cootContour ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                    </Button>
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
                    <DropdownButton size="sm" variant="outlined">
                        <Dropdown.Item as="button" onClick={handleDeleteMap}>Delete map</Dropdown.Item>
                    </DropdownButton>
                </Col>
            </Row>
        </Card.Header>
        <Card.Body>
            <Row className="align-items-center" style={{ height: '100%', justifyContent:'between', display:'flex'}}>
                <Col className="border-left" style={{justifyContent:'left', display:'flex'}}> 
                <Row>
                        <Form.Check checked={props.map === props.activeMap}
                                    style={{margin:'0'}}
                                    inline
                                    label={'Active'}
                                    name={`setActiveMap ${props.map.mapMolNo}`}
                                    type="checkbox"
                                    variant="outline"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            props.setActiveMap(props.map)
                                        }
                                    }}
                        />
                </Row>
                <Row>
                        <Form.Check checked={props.map.litLines}
                                    style={{margin:'0'}}
                                    inline
                                    label={'Lit lines'}
                                    name={`litLines ${props.map.mapMolNo}`}
                                    type="checkbox"
                                    variant="outline"
                                    onChange={(e) => {
                                        setMapLitLines(e.target.checked)
                                    }}
                        />
                </Row>
                </Col>
                <Col>
                    <Form.Group controlId="contouringLevel" className="mb-3">
                            <BabyGruSlider minVal={0.01} maxVal={5} logScale={true} sliderTitle="Level" intialValue={props.initialContour} externalValue={mapContourLevel} setExternalValue={setMapContourLevel}/>
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="contouringRadius" className="mb-3">
                            <BabyGruSlider minVal={0.01} maxVal={50} logScale={false} sliderTitle="Radius" intialValue={props.initialRadius} externalValue={mapRadius} setExternalValue={setMapRadius}/>
                    </Form.Group>
                </Col>
            </Row>
        </Card.Body>
    </Card >
    }

