import { useEffect, useState, createRef, useCallback, useMemo, Fragment } from "react";
import { Card, Form, Button, Row, Col, DropdownButton } from "react-bootstrap";
import { doDownload } from '../utils/BabyGruUtils';
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined } from '@mui/icons-material';
import BabyGruSlider from "./BabyGruSlider";
import { BabyGruDeleteDisplayObjectMenuItem, BabyGruRenameDisplayObjectMenuItem } from "./BabyGruMenuItem";
import { MenuItem } from "@mui/material";

export const BabyGruMapCard = (props) => {
    const [cootContour, setCootContour] = useState(true)
    const [mapRadius, setMapRadius] = useState(props.initialRadius)
    const [mapContourLevel, setMapContourLevel] = useState(props.initialContour)
    const [mapLitLines, setMapLitLines] = useState(props.initialMapLitLines)    
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [currentName, setCurrentName] = useState(props.map.mapName);
    const nextOrigin = createRef([])
    const busyContouring = createRef(false)
    const [dropdownIsShown, setDropdownIsShown] = useState(false)
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    const handleDownload = async () => {
        let response = await props.map.getMap()
        doDownload([response.data.result.mapData], `${props.map.mapName.replace('.mtz', '.map')}`)
    }

    const handleVisibility = () => {
        if (!cootContour) {
            props.map.makeCootLive(props.glRef.current, mapRadius)
            setCootContour(true)
        } else {
            props.map.makeCootUnlive(props.glRef.current)
            setCootContour(false)
        }
    }

    const actionButtons = {
        1: {
            label: cootContour ? "Hide map" : "Show map", 
            compressed: () => {return (<MenuItem variant="success" onClick={handleVisibility}>{cootContour ? "Hide map" : "Show map"}</MenuItem>)},
            expanded: () => {return (<Button size="sm" variant="outlined" onClick={handleVisibility}>
                                        {cootContour ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                                    </Button>)},
        },
        2: {
            label: "Download Map", 
            compressed: () => {return (<MenuItem variant="success" onClick={handleDownload}>Download map</MenuItem>)},
            expanded:  () => {return (<Button size="sm" variant="outlined" onClick={handleDownload}>
                                        <DownloadOutlined />
                                      </Button> )},
        },
        3: {
            label: mapLitLines ? "Deactivate lit lines" : "Activate lit lines",
            compressed: () => {return (<MenuItem variant="success" onClick={() => {setMapLitLines(!mapLitLines)}}>{mapLitLines ? "Deactivate lit lines" : "Activate lit lines"}</MenuItem>)},
            expanded: null
        },
        4: {
            label: 'Rename map',
            compressed: () => {return (<BabyGruRenameDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.map} />)},
            expanded: null
        }
    }

    const getButtonBar = (sideBarWidth) => {
        const maximumAllowedWidth = sideBarWidth * 0.35
        let currentlyUsedWidth = 0
        let expandedButtons = []
        let compressedButtons = []

        Object.keys(actionButtons).forEach(key => {
            if (actionButtons[key].expanded === null) {
                compressedButtons.push(actionButtons[key].compressed())
            } else {
                currentlyUsedWidth += 60
                if (currentlyUsedWidth < maximumAllowedWidth) {
                    expandedButtons.push(actionButtons[key].expanded())
                } else {
                    compressedButtons.push(actionButtons[key].compressed())
                }
            }
        })

        compressedButtons.push((
            <BabyGruDeleteDisplayObjectMenuItem setPopoverIsShown={setPopoverIsShown} glRef={props.glRef} changeItemList={props.changeMaps} itemList={props.maps} item={props.map}/>
        ))
        
        return  <Fragment>
                    {expandedButtons}
                    <DropdownButton 
                            size="sm" 
                            variant="outlined" 
                            autoClose={popoverIsShown ? false : 'outside'} 
                            show={props.currentDropdownMolNo === props.map.molNo} 
                            onToggle={() => {props.map.molNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.map.molNo) : props.setCurrentDropdownMolNo(-1)}}>
                        {compressedButtons}
                    </DropdownButton>
                    <Button size="sm" variant="outlined"
                        onClick={() => {
                            setIsCollapsed(!isCollapsed)
                        }}>
                        {isCollapsed ? < ExpandMoreOutlined/> : <ExpandLessOutlined />}
                    </Button>
                </Fragment>

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

    useMemo(() => {
        if (currentName == "") {
            return
        }
        props.map.mapName = currentName

    }, [currentName]);

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

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.map.molNo}>
        <Card.Header>
            <Row className='align-items-center'>
            <Col style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.map.molNo} Map ${props.map.mapName}`}
            </Col>
            <Col style={{display:'flex', justifyContent:'right'}}>
                {getButtonBar(props.sideBarWidth)}
            </Col>
            </Row>
        </Card.Header>
        <Card.Body style={{display: isCollapsed ? 'none' : ''}}>
            <Row className="align-items-center" style={{ height: '100%', justifyContent:'between', display:'flex'}}>
                <Col className="border-left" style={{justifyContent:'left', display:'flex'}}> 
                <Row>
                        <Form.Check checked={props.map === props.activeMap}
                                    style={{margin:'0'}}
                                    inline
                                    label={'Active'}
                                    name={`setActiveMap ${props.map.molNo}`}
                                    type="checkbox"
                                    variant="outline"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            props.setActiveMap(props.map)
                                        }
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
                            <BabyGruSlider minVal={0.01} maxVal={100} logScale={false} sliderTitle="Radius" intialValue={props.initialRadius} externalValue={mapRadius} setExternalValue={setMapRadius}/>
                    </Form.Group>
                </Col>
            </Row>
        </Card.Body>
    </Card >
    }

