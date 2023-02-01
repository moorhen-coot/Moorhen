import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react";
import { Card, Form, Button, Row, Col, DropdownButton } from "react-bootstrap";
import { doDownload } from '../utils/MoorhenUtils';
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined, Settings } from '@mui/icons-material';
import MoorhenSlider from "./MoorhenSlider";
import { MoorhenDeleteDisplayObjectMenuItem, MoorhenRenameDisplayObjectMenuItem } from "./MoorhenMenuItem";
import { MenuItem } from "@mui/material";
import { MoorhenMapSettingsMenuItem } from "./MoorhenMenuItem";

export const MoorhenMapCard = (props) => {
    const [cootContour, setCootContour] = useState(true)
    const [mapRadius, setMapRadius] = useState(props.initialRadius)
    const [mapContourLevel, setMapContourLevel] = useState(props.initialContour)
    const [mapLitLines, setMapLitLines] = useState(props.defaultMapLitLines)
    const [mapSolid, setMapSolid] = useState(props.defaultMapSurface)
    const [mapOpacity, setMapOpacity] = useState(1.0)
    const [isCollapsed, setIsCollapsed] = useState(!props.defaultExpandDisplayCards);
    const [currentName, setCurrentName] = useState(props.map.name);
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const nextOrigin = useRef([])
    const busyContouring = useRef(false)
    const isDirty = useRef(false)

    const mapSettingsProps = {
        mapOpacity, setMapOpacity, mapSolid, setMapSolid
    }

    const handleDownload = async () => {
        let response = await props.map.getMap()
        doDownload([response.data.result.mapData], `${props.map.name.replace('.mtz', '.map')}`)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleVisibility = () => {
        if (!cootContour) {
            props.map.mapRadius = mapRadius
            props.map.makeCootLive(props.glRef)
            setCootContour(true)
        } else {
            props.map.makeCootUnlive(props.glRef)
            setCootContour(false)
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleLitLines = () => {
        setMapLitLines(!mapLitLines)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleSolid = () => {
        setMapSolid(!mapSolid)
        props.setCurrentDropdownMolNo(-1)
    }

    const actionButtons = {
        1: {
            label: cootContour ? "Hide map" : "Show map", 
            compressed: () => {return (<MenuItem key='hide-show-map' variant="success" onClick={handleVisibility}>{cootContour ? "Hide map" : "Show map"}</MenuItem>)},
            expanded: () => {return (<Button key='hide-show-map' size="sm" variant="outlined" onClick={handleVisibility}>
                                        {cootContour ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                                    </Button>)},
        },
        2: {
            label: "Download Map", 
            compressed: () => {return (<MenuItem key='donwload-map' variant="success" onClick={handleDownload}>Download map</MenuItem>)},
            expanded:  () => {return (<Button key='donwload-map' size="sm" variant="outlined" onClick={handleDownload}>
                                        <DownloadOutlined />
                                      </Button> )},
        },
        3: {
            label: mapLitLines ? "Deactivate lit lines" : "Activate lit lines",
            compressed: () => {return (<MenuItem key='activate-deactivate-lit-lines' variant="success" disabled={!cootContour}  onClick={handleLitLines}>{mapLitLines ? "Deactivate lit lines" : "Activate lit lines"}</MenuItem>)},
            expanded: null
        },
        4: {
            label: 'Rename map',
            compressed: () => {return (<MoorhenRenameDisplayObjectMenuItem key='rename-map' setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.map} />)},
            expanded: null
        },
        5: {
            label: "Map draw settings",
            compressed: () => {return (<MoorhenMapSettingsMenuItem key={5} disabled={!cootContour} setPopoverIsShown={setPopoverIsShown} map={props.map} {...mapSettingsProps} />)},
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
            <MoorhenDeleteDisplayObjectMenuItem 
                key='delete-map'
                setPopoverIsShown={setPopoverIsShown} 
                glRef={props.glRef} 
                changeItemList={props.changeMaps}
                itemList={props.maps} 
                item={props.map}
                setActiveMap={props.setActiveMap}
                activeMap={props.activeMap}/>
        ))
        
        return  <Fragment>
                    {expandedButtons}
                    <DropdownButton 
                            title={<Settings/>}
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

    const reContourIfDirty = () => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            props.map.doCootContour(props.glRef,
                ...nextOrigin.current,
                props.map.mapRadius,
                props.map.contourLevel)
                .then(result => {
                    busyContouring.current = false
                    reContourIfDirty()
                })
        }
    }

    const handleUpdateMapCallback = useCallback(e => {
        nextOrigin.current = [...e.detail.origin.map(coord => -coord)]
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour) {
            if (busyContouring.current) {
                console.log('Skipping map update because already busy ')
            } else {
                reContourIfDirty()
            }
        }
    }, [mapContourLevel, mapRadius])

    const handleWheelContourLevelCallback = useCallback(e => {
        if (props.map.cootContour && props.map.molNo === props.activeMap.molNo) {
            if (e.detail.factor > 1){
                setMapContourLevel(mapContourLevel + 0.1)
            } else {
                setMapContourLevel(mapContourLevel - 0.1)
            }
        }
    }, [mapContourLevel, mapRadius, props.activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleContourOnSessionLoad = useCallback(e => {
        if (props.map.molNo === e.detail.molNo) {
            setCootContour(e.detail.cootContour)
            setMapContourLevel(e.detail.contourLevel)
            setMapLitLines(e.detail.litLines)
            setMapRadius(e.detail.mapRadius)
        }
    }, [props.map.molNo])

    useMemo(() => {
        if (currentName === "") {
            return
        }
        props.map.name = currentName

    }, [currentName]);

    useEffect(() => {
        document.addEventListener("mapUpdate", handleUpdateMapCallback);
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        document.addEventListener("contourOnSessionLoad", handleContourOnSessionLoad);
        return () => {
            document.removeEventListener("mapUpdate", handleUpdateMapCallback);
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
            document.removeEventListener("contourOnSessionLoad", handleContourOnSessionLoad);
        };
    }, [handleUpdateMapCallback, props.activeMap?.molNo]);

    useEffect(() => {
        props.map.setAlpha(mapOpacity,props.glRef)
    }, [mapOpacity])

    useEffect(() => {
        setCootContour(props.map.cootContour)
        nextOrigin.current = props.glRef.current.origin.map(coord => -coord)
        props.map.litLines = mapLitLines
        props.map.solid = mapSolid
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour && !busyContouring.current) {
            reContourIfDirty()
        } else {
            console.log('Skipping map re-contour because already busy ')
        }

    }, [mapRadius, mapContourLevel, mapLitLines, mapSolid])

    return <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}} key={props.map.molNo}>
        <Card.Header>
            <Row className='align-items-center'>
            <Col className='align-items-center' style={{display:'flex', justifyContent:'left'}}>
                    {`#${props.map.molNo} Map ${props.map.name}`}
                    <img 
                        className="baby-gru-map-icon"
                        alt="..."
                        style={{width: '20px', height: '20px', margin:'0.5rem', padding:'0'}}
                        src={props.map.isDifference ? `${props.urlPrefix}/baby-gru/pixmaps/diff-map.png` : `${props.urlPrefix}/baby-gru/pixmaps/map.svg`}
                    />
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
                        <MoorhenSlider minVal={0.01} maxVal={5} logScale={true} sliderTitle="Level" isDisabled={!cootContour} intialValue={props.initialContour} externalValue={mapContourLevel} setExternalValue={setMapContourLevel}/>
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="contouringRadius" className="mb-3">
                        <MoorhenSlider minVal={0.01} maxVal={100} logScale={false} sliderTitle="Radius" isDisabled={!cootContour} intialValue={props.initialRadius} externalValue={mapRadius} setExternalValue={setMapRadius}/>
                    </Form.Group>
                </Col>
            </Row>
        </Card.Body>
    </Card >
    }

