import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react";
import { Card, Form, Button, Col, DropdownButton, Stack, Dropdown, OverlayTrigger, ToggleButton } from "react-bootstrap";
import { doDownload, getNameLabel } from '../utils/MoorhenUtils';
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined, Settings, FileCopyOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined, AddOutlined, RemoveOutlined } from '@mui/icons-material';
import { MoorhenMapSettingsMenuItem, MoorhenDeleteDisplayObjectMenuItem, MoorhenRenameDisplayObjectMenuItem } from "./MoorhenMenuItem";
import MoorhenSlider from "./MoorhenSlider";
import { IconButton, MenuItem, Tooltip } from "@mui/material";
import { SketchPicker } from "react-color";

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
    const [mapColour, setMapColour] = useState(null)
    const nextOrigin = useRef([])
    const busyContouring = useRef(false)
    const isDirty = useRef(false)

    useEffect(() => {
        props.map.fetchMapRmsd()
    }, [])

    useEffect(() => {
        setMapColour({
            r: 255 * props.map.rgba.r,
            g: 255 * props.map.rgba.g,
            b: 255 * props.map.rgba.b,
            a: props.map.rgba.a
        })
    }, [props.map.rgba])

    const handleColorChange = (color) => {
        try {
            props.map.setColour(color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., props.glRef)
            setMapColour(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const mapSettingsProps = {
        mapOpacity, setMapOpacity, mapSolid, setMapSolid, mapLitLines, setMapLitLines, setPopoverIsShown, glRef: props.glRef, map: props.map
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

    const handleDuplicate = async () => {
        const newMap = await props.map.duplicate()
        return props.changeMaps({ action: "Add", item: newMap })
    }

    const handleCenterOnMap = async () => {
        const response = await props.map.mapMoleculeCentre()
        if (response.data.result.result.success) {
            props.glRef.current.setOriginAnimated(response.data.result.result.updated_centre.map(coord => -coord))
        }
    }

    const actionButtons = {
        1: {
            label: cootContour ? "Hide map" : "Show map",
            compressed: () => { return (<MenuItem key='hide-show-map' variant="success" onClick={handleVisibility}>{cootContour ? "Hide map" : "Show map"}</MenuItem>) },
            expanded: () => {
                return (<Button key='hide-show-map' size="sm" variant="outlined" onClick={handleVisibility}>
                    {cootContour ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </Button>)
            },
        },
        2: {
            label: "Download Map",
            compressed: () => { return (<MenuItem key='donwload-map' variant="success" onClick={handleDownload}>Download map</MenuItem>) },
            expanded: () => {
                return (<Button key='donwload-map' size="sm" variant="outlined" onClick={handleDownload}>
                    <DownloadOutlined />
                </Button>)
            },
        },
        3: {
            label: 'Rename map',
            compressed: () => { return (<MoorhenRenameDisplayObjectMenuItem key='rename-map' setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.map} />) },
            expanded: null
        },
        4: {
            label: "Map draw settings",
            compressed: () => { return (<MoorhenMapSettingsMenuItem key='map-draw-settings' disabled={!cootContour} {...mapSettingsProps} />) },
            expanded: null
        },
        5: {
            label: "Duplicate map",
            compressed: () => { return (<MenuItem key='duplicate-map' variant="success" onClick={handleDuplicate}>Duplicate map</MenuItem>) },
            expanded: () => {
                return (<Button key='duplicate-map' size="sm" variant="outlined" onClick={handleDuplicate}>
                    <FileCopyOutlined />
                </Button>)
            },
        },
        6: {
            label: "Centre on map",
            compressed: () => { return (<MenuItem key='centre-on-map'variant="success" onClick={handleCenterOnMap}>Centre on map</MenuItem>) },
            expanded: null
        },
    }

    const getButtonBar = (sideBarWidth) => {
        const maximumAllowedWidth = sideBarWidth * 0.55
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
                activeMap={props.activeMap} />
        ))

        return <Fragment>
            {expandedButtons}
            <DropdownButton
                title={<Settings />}
                size="sm"
                variant="outlined"
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownMolNo === props.map.molNo}
                onToggle={() => { props.map.molNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.map.molNo) : props.setCurrentDropdownMolNo(-1) }}>
                {compressedButtons}
            </DropdownButton>
            <Button size="sm" variant="outlined"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}>
                {isCollapsed ? < ExpandMoreOutlined /> : <ExpandLessOutlined />}
            </Button>
        </Fragment>
    }

    const doContourIfDirty = () => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            props.map.doCootContour(props.glRef,
                ...nextOrigin.current,
                props.map.mapRadius,
                props.map.contourLevel)
                .then(result => {
                    busyContouring.current = false
                    doContourIfDirty()
                })
        }
    }

    const handleOriginUpdate = useCallback(e => {
        nextOrigin.current = [...e.detail.origin.map(coord => -coord)]
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour) {
            if (!busyContouring.current) {
                doContourIfDirty()
            }
        }
    }, [mapContourLevel, mapRadius])

    const handleWheelContourLevelCallback = useCallback(e => {
        let newMapContourLevel
        if (props.map.cootContour && props.map.molNo === props.activeMap.molNo) {
            if (e.detail.factor > 1) {
                newMapContourLevel = mapContourLevel + parseFloat(props.contourWheelSensitivityFactor)
            } else {
                newMapContourLevel = mapContourLevel - parseFloat(props.contourWheelSensitivityFactor)
            }
            
            setMapContourLevel(newMapContourLevel)
            props.setToastContent(
                <h5 style={{margin: 0}}>
                    <span>
                        {`Level: ${newMapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (newMapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}
                    </span>
                </h5>
            )
    
        }
    }, [mapContourLevel, mapRadius, props.activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleRadiusChangeCallback = useCallback(e => {
        if (props.map.cootContour && props.map.molNo === props.activeMap.molNo) {
            setMapRadius(mapRadius + parseInt(e.detail.factor))
        }
    }, [mapRadius, props.activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleNewMapContour = useCallback(e => {
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
        document.addEventListener("originUpdate", handleOriginUpdate);
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        document.addEventListener("newMapContour", handleNewMapContour);
        document.addEventListener("mapRadiusChanged", handleRadiusChangeCallback);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
            document.removeEventListener("newMapContour", handleNewMapContour);
            document.removeEventListener("mapRadiusChanged", handleRadiusChangeCallback);
        };
    }, [handleOriginUpdate, props.activeMap?.molNo]);

    useEffect(() => {
        props.map.setAlpha(mapOpacity, props.glRef)
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
            doContourIfDirty()
        }

    }, [mapRadius, mapContourLevel, mapLitLines, mapSolid])

    const increaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel + parseFloat(props.contourWheelSensitivityFactor))} style={{padding: 0}}>
                                    <AddOutlined/>
                                </IconButton>
    const decreaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel - parseFloat(props.contourWheelSensitivityFactor))} style={{padding: 0}}>
                                    <RemoveOutlined/>
                                </IconButton>
    const increaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius + 2)} style={{padding: 0}}>
                                    <AddOutlined/>
                                </IconButton>
    const decreaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius - 2)} style={{padding: 0}}>
                                    <RemoveOutlined/>
                                </IconButton>

    const getMapColourSelector = () => {
        if (mapColour === null) {
            return null
        }

        const dropdown =  
        <Dropdown>
            <Dropdown.Toggle variant="outlined" className="map-colour-dropdown">
                <div style={{
                    width: '20px', 
                    height: '20px', 
                    background: props.map.isDifference ? 'linear-gradient( -45deg, green, green 49%, white 49%, white 51%, red 51% )' : `rgb(${mapColour.r},${mapColour.g},${mapColour.b})`, 
                    borderRadius: '50%'
                }}/>
            </Dropdown.Toggle>
            <Dropdown.Menu style={{display: props.map.isDifference ? 'none' : '', padding: 0, margin: 0, zIndex: 9999}}>
                <SketchPicker color={mapColour} onChange={handleColorChange} disableAlpha={true} />
            </Dropdown.Menu>
        </Dropdown>

        if (props.map.isDifference) {
            return <>{dropdown}</>
        } 

        return <OverlayTrigger
                id="map-colour-selector-trigger"
                placement="bottom"
                overlay={
                    <Tooltip id="map-colour-label-tooltip" 
                        style={{
                            zIndex: 9999,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            padding: '2px 10px',
                            color: 'white',
                            borderRadius: 3,
                        }}>
                            <div>
                                Change map colour
                            </div>
                    </Tooltip>
                }>
                   {dropdown}
                </OverlayTrigger>
    }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.map.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: props.isDark ? 'white' : 'black' }}>
                    {getNameLabel(props.map)}
                    {getMapColourSelector()}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    {getButtonBar(props.sideBarWidth)}
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.5rem' }}>
            <Stack direction='horizontal' gap={4}>
                <ToggleButton
                    type="checkbox"
                    variant={props.isDark ? "outline-light" : "outline-primary"}
                    checked={props.map === props.activeMap}
                    style={{ marginLeft: '0.1rem', marginRight: '0.5rem', justifyContent: 'space-betweeen', display: 'flex'}}
                    onClick={evt => props.setActiveMap(props.map) }
                >
                    {props.map === props.activeMap ? <RadioButtonCheckedOutlined/> : <RadioButtonUncheckedOutlined/>}
                    <span style={{marginLeft: '0.5rem'}}>Active</span>
                </ToggleButton>
                <Col>
                    <Form.Group controlId="contouringLevel" className="mb-3">
                        <span>{`Lvl: ${mapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (mapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}</span>
                        <MoorhenSlider
                            minVal={0.01}
                            maxVal={5}
                            showMinMaxVal={false}
                            decrementButton={decreaseLevelButton}
                            incrementButton={increaseLevelButton}
                            allowExternalFeedback={true}
                            logScale={true}
                            showSliderTitle={false}
                            isDisabled={!cootContour}
                            initialValue={props.initialContour}
                            externalValue={mapContourLevel}
                            setExternalValue={setMapContourLevel}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="contouringRadius" className="mb-3">
                        <MoorhenSlider
                            minVal={0.01}
                            maxVal={100}
                            showMinMaxVal={false}
                            decrementButton={decreaseRadiusButton} 
                            incrementButton={increaseRadiusButton} 
                            allowExternalFeedback={true} 
                            logScale={false} 
                            sliderTitle="Radius" 
                            decimalPlaces={2} 
                            isDisabled={!cootContour} 
                            initialValue={props.initialRadius} 
                            externalValue={mapRadius} 
                            setExternalValue={setMapRadius}
                        />
                    </Form.Group>
                </Col>
            </Stack>
        </Card.Body>
    </Card >
}

