import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react"
import { Card, Form, Button, Col, DropdownButton, Stack, OverlayTrigger, ToggleButton, Spinner } from "react-bootstrap"
import { doDownload, guid } from '../../utils/MoorhenUtils'
import { getNameLabel } from "./cardUtils"
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined, Settings, FileCopyOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined, AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { MoorhenMapSettingsMenuItem } from "../menu-item/MoorhenMapSettingsMenuItem";
import { MoorhenRenameDisplayObjectMenuItem } from "../menu-item/MoorhenRenameDisplayObjectMenuItem"
import { MoorhenDeleteDisplayObjectMenuItem } from "../menu-item/MoorhenDeleteDisplayObjectMenuItem"
import { MoorhenSetMapWeight } from "../menu-item/MoorhenSetMapWeight"
import { MoorhenMapHistogram } from "../misc/MoorhenMapHistogram"
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { Accordion, AccordionDetails, AccordionSummary, IconButton, MenuItem, Popover, Tooltip } from "@mui/material"
import { RgbColorPicker } from "react-colorful"
import { moorhen } from "../../types/moorhen"
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { useSelector, useDispatch } from 'react-redux';
import { setActiveMap, setNotificationContent } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";

type ActionButtonType = {
    label: string;
    compressed: () => JSX.Element;
    expanded: null | ( () => JSX.Element );
}

interface MoorhenMapCardPropsInterface extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
    busy: boolean;
    key: number;
    index: number;
    map: moorhen.Map;
    initialContour: number;
    initialRadius: number;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

export const MoorhenMapCard = forwardRef<any, MoorhenMapCardPropsInterface>((props, cardRef) => {
    const dispatch = useDispatch()
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor)
    const defaultMapLitLines = useSelector((state: moorhen.State) => state.mapSettings.defaultMapLitLines)
    const defaultMapSurface = useSelector((state: moorhen.State) => state.mapSettings.defaultMapSurface)
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.miscAppSettings.defaultExpandDisplayCards)
    
    const [cootContour, setCootContour] = useState<boolean>(true)
    const [mapRadius, setMapRadius] = useState<number>(props.initialRadius)
    const [mapContourLevel, setMapContourLevel] = useState<number>(props.initialContour)
    const [mapLitLines, setMapLitLines] = useState<boolean>(defaultMapLitLines)
    const [mapSolid, setMapSolid] = useState<boolean>(defaultMapSurface)
    const [mapOpacity, setMapOpacity] = useState<number>(1.0)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards);
    const [currentName, setCurrentName] = useState<string>(props.map.name);
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [mapColour, setMapColour] = useState<{ r: number; g: number; b: number; } | null>(null)
    const [negativeMapColour, setNegativeMapColour] = useState<{ r: number; g: number; b: number; } | null>(null)
    const [positiveMapColour, setPositiveMapColour] = useState<{ r: number; g: number; b: number; } | null>(null)
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [histogramBusy, setHistogramBusy] = useState<boolean>(false)
    
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const nextOrigin = useRef<number[]>([])
    const busyContouring = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const histogramRef = useRef(null)

    useImperativeHandle(cardRef, () => ({
        forceIsCollapsed: (value: boolean) => { 
            setIsCollapsed(value)
         }
    }), 
    [setIsCollapsed])

    useEffect(() => {
        setMapColour({
            r: 255 * props.map.rgba.mapColour.r,
            g: 255 * props.map.rgba.mapColour.g,
            b: 255 * props.map.rgba.mapColour.b,
        })
        setNegativeMapColour({
            r: 255 * props.map.rgba.negativeDiffColour.r,
            g: 255 * props.map.rgba.negativeDiffColour.g,
            b: 255 * props.map.rgba.negativeDiffColour.b,
        })
        setPositiveMapColour({
            r: 255 * props.map.rgba.positiveDiffColour.r,
            g: 255 * props.map.rgba.positiveDiffColour.g,
            b: 255 * props.map.rgba.positiveDiffColour.b,
        })
    }, [])

    const handlePositiveMapColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            props.map.setDiffMapColour('positiveDiffColour', color.r / 255., color.g / 255., color.b / 255.)
            setPositiveMapColour({r: color.r, g: color.g, b: color.b})
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleNegativeMapColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            props.map.setDiffMapColour('negativeDiffColour', color.r / 255., color.g / 255., color.b / 255.)
            setNegativeMapColour({r: color.r, g: color.g, b: color.b})
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            props.map.setColour(color.r / 255., color.g / 255., color.b / 255.)
            setMapColour({r: color.r, g: color.g, b: color.b})
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
            props.map.makeCootLive()
            setCootContour(true)
        } else {
            props.map.makeCootUnlive()
            setCootContour(false)
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleDuplicate = async () => {
        const newMap = await props.map.duplicate()
        dispatch( addMap(newMap) )
    }

    const actionButtons: { [key: number] : ActionButtonType } = {
        1: {
            label: cootContour ? "Hide map" : "Show map",
            compressed: () => { return (<MenuItem key='hide-show-map' onClick={handleVisibility}>{cootContour ? "Hide map" : "Show map"}</MenuItem>) },
            expanded: () => {
                return (<Button key='hide-show-map' size="sm" variant="outlined" onClick={handleVisibility}>
                    {cootContour ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </Button>)
            },
        },
        2: {
            label: "Download Map",
            compressed: () => { return (<MenuItem key='donwload-map' onClick={handleDownload}>Download map</MenuItem>) },
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
            compressed: () => { return (<MenuItem key='duplicate-map' onClick={handleDuplicate}>Duplicate map</MenuItem>) },
            expanded: () => {
                return (<Button key='duplicate-map' size="sm" variant="outlined" onClick={handleDuplicate}>
                    <FileCopyOutlined />
                </Button>)
            },
        },
        6: {
            label: "Centre on map",
            compressed: () => { return (<MenuItem key='centre-on-map'onClick={() => props.map.centreOnMap()}>Centre on map</MenuItem>) },
            expanded: null
        },
        7: {
            label: "Set map weight...",
            compressed: () => { return (<MoorhenSetMapWeight key='set-map-weight' disabled={!cootContour} {...mapSettingsProps} />) },
            expanded: null
        },
    }

    const getButtonBar = (sideBarWidth: number) => {
        const maximumAllowedWidth = sideBarWidth * 0.55
        let currentlyUsedWidth = 0
        let expandedButtons: JSX.Element[] = []
        let compressedButtons: JSX.Element[] = []

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
                item={props.map}/>
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
            props.map.doCootContour(
                ...nextOrigin.current as [number, number, number],
                props.map.mapRadius,
                props.map.contourLevel
            ).then(() => {
                busyContouring.current = false
                doContourIfDirty()
            })
        }
    }

    const handleOriginUpdate = useCallback((evt: moorhen.OriginUpdateEvent) => {
        nextOrigin.current = [...evt.detail.origin.map((coord: number) => -coord)]
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour) {
            if (!busyContouring.current) {
                doContourIfDirty()
            }
        }
    }, [mapContourLevel, mapRadius])

    const handleWheelContourLevelCallback = useCallback((evt: moorhen.WheelContourLevelEvent) => {
        let newMapContourLevel: number
        if (props.map.cootContour && props.map.molNo === activeMap.molNo) {
            if (evt.detail.factor > 1) {
                newMapContourLevel = mapContourLevel + contourWheelSensitivityFactor
            } else {
                newMapContourLevel = mapContourLevel - contourWheelSensitivityFactor
            }
            setMapContourLevel(newMapContourLevel)
            dispatch(setNotificationContent(
                <MoorhenNotification key={guid()} hideDelay={5000}>
                <h5 style={{margin: 0}}>
                    <span>
                        {`Level: ${newMapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (newMapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}
                    </span>
                </h5>
                </MoorhenNotification>
            ))
        }
    }, [mapContourLevel, mapRadius, activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleRadiusChangeCallback = useCallback((evt: moorhen.MapRadiusChangeEvent) => {
        if (props.map.cootContour && props.map.molNo === activeMap.molNo) {
            setMapRadius(mapRadius + evt.detail.factor)
        }
    }, [mapRadius, activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleNewMapContour = useCallback((evt: moorhen.NewMapContourEvent) => {
        if (props.map.molNo === evt.detail.molNo) {
            setCootContour(evt.detail.cootContour)
            setMapContourLevel(evt.detail.contourLevel)
            setMapLitLines(evt.detail.litLines)
            setMapRadius(evt.detail.mapRadius)
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
    }, [handleOriginUpdate, activeMap?.molNo]);

    useEffect(() => {
        props.map.setAlpha(mapOpacity)
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

    const increaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel + contourWheelSensitivityFactor)} style={{padding: 0, color: isDark ? 'white' : 'black'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel - contourWheelSensitivityFactor)} style={{padding: 0, color: isDark ? 'white' : 'black'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>
    const increaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius + 2)} style={{padding: 0, color: isDark ? 'white' : 'black'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius - 2)} style={{padding: 0, color: isDark ? 'white' : 'black'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>

    const getMapColourSelector = () => {
        if (mapColour === null) {
            return null
        }

        let dropdown: JSX.Element
        if (props.map.isDifference) {
            dropdown = <>
                    <div ref={colourSwatchRef} onClick={() => setShowColourPicker(true)}
                        style={{
                            marginLeft: '0.5rem',
                            width: '25px',
                            height: '25px',
                            borderRadius: '8px',
                            border: '3px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
                            cursor: 'pointer',
                            background: `linear-gradient( -45deg, rgba(${positiveMapColour.r},${positiveMapColour.g},${positiveMapColour.b}), rgba(${positiveMapColour.r},${positiveMapColour.g},${positiveMapColour.b}) 49%, white 49%, white 51%, rgba(${negativeMapColour.r},${negativeMapColour.g},${negativeMapColour.b}) 51% )`
                    }}/>
                    <Popover 
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        open={showColourPicker}
                        onClose={() => setShowColourPicker(false)}
                        anchorEl={colourSwatchRef.current}
                        sx={{
                            '& .MuiPaper-root': {
                                overflowY: 'hidden', borderRadius: '8px', padding: '0.5rem', background: isDark ? 'grey' : 'white'
                            }
                        }}
                    >
                <Stack gap={3} direction='horizontal'>
                    <div style={{width: '100%', textAlign: 'center'}}>
                        <span>Positive</span>
                        <RgbColorPicker color={positiveMapColour} onChange={handlePositiveMapColorChange} />
                    </div>
                    <div style={{width: '100%', textAlign: 'center'}}>
                        <span>Negative</span>
                        <RgbColorPicker color={negativeMapColour} onChange={handleNegativeMapColorChange} />
                    </div>
                    
                </Stack>
                    </Popover>
            </>
        } else {
            dropdown = <>
                    <div ref={colourSwatchRef} onClick={() => setShowColourPicker(true)}
                        style={{
                            marginLeft: '0.5rem',
                            width: '25px',
                            height: '25px',
                            borderRadius: '8px',
                            border: '3px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
                            cursor: 'pointer',
                            backgroundColor: `rgb(${mapColour.r},${mapColour.g},${mapColour.b})` 
                    }}/>
                    <Popover 
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        open={showColourPicker}
                        onClose={() => setShowColourPicker(false)}
                        anchorEl={colourSwatchRef.current}
                        sx={{
                            '& .MuiPaper-root': {
                                overflowY: 'hidden', borderRadius: '8px'
                            }
                        }}
                    >
                        <RgbColorPicker color={mapColour} onChange={handleColorChange} />
                    </Popover>
            </>
        } 

        return <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip 
                        id="map-colour-label-tooltip" 
                        title=""
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

    return <Card ref={cardRef} className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.map.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black' }}>
                    {getNameLabel(props.map)}
                    {getMapColourSelector()}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    {getButtonBar(props.sideBarWidth)}
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.5rem' }}>
            <Stack direction="vertical" gap={1}>
            <Stack direction='horizontal' gap={4}>
                <ToggleButton
                    id={`active-map-toggle-${props.map.molNo}`}
                    type="checkbox"
                    variant={isDark ? "outline-light" : "outline-primary"}
                    checked={props.map === activeMap}
                    style={{ marginLeft: '0.1rem', marginRight: '0.5rem', justifyContent: 'space-betweeen', display: 'flex' }}
                    onClick={() => dispatch( setActiveMap(props.map) )}
                    value={""}                >
                    {props.map === activeMap ? <RadioButtonCheckedOutlined/> : <RadioButtonUncheckedOutlined/>}
                    <span style={{marginLeft: '0.5rem'}}>Active</span>
                </ToggleButton>
                <Col>
                    <Form.Group controlId="contouringLevel" className="mb-3">
                        <span>{`Lvl: ${mapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (mapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}</span>
                        <MoorhenSlider
                            minVal={0.001}
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
            <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={histogramBusy ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                    Histogram
                </AccordionSummary>
                <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                    <MoorhenMapHistogram ref={histogramRef} setMapContourLevel={setMapContourLevel} setBusy={setHistogramBusy} showHistogram={true} map={props.map}/>
                </AccordionDetails>
            </Accordion>
        </Stack>
        </Card.Body>
    </Card >
})
