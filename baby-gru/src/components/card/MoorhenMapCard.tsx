import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react"
import { Card, Form, Button, Col, DropdownButton, Stack, OverlayTrigger, ToggleButton, Spinner } from "react-bootstrap"
import { convertRemToPx, doDownload, rgbToHex } from '../../utils/utils'
import { getNameLabel } from "./cardUtils"
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined, Settings, FileCopyOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined, AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { MoorhenMapSettingsMenuItem } from "../menu-item/MoorhenMapSettingsMenuItem";
import { MoorhenRenameDisplayObjectMenuItem } from "../menu-item/MoorhenRenameDisplayObjectMenuItem"
import { MoorhenDeleteDisplayObjectMenuItem } from "../menu-item/MoorhenDeleteDisplayObjectMenuItem"
import { MoorhenSetMapWeight } from "../menu-item/MoorhenSetMapWeight"
import { MoorhenScaleMap } from "../menu-item/MoorhenScaleMap"
import { MoorhenMapInfoCard } from "../card/MoorhenMapInfoCard"
import { MoorhenMapHistogram } from "../misc/MoorhenMapHistogram"
import { MoorhenSlider } from "../misc/MoorhenSlider-new";
import { Accordion, AccordionDetails, AccordionSummary, IconButton, MenuItem, Popover, Tooltip } from "@mui/material"
import { HexColorInput, RgbColorPicker } from "react-colorful"
import { moorhen } from "../../types/moorhen"
import { useSelector, useDispatch, batch } from 'react-redux';
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";
import { hideMap, setContourLevel, changeContourLevel, setMapAlpha, setMapColours, setMapRadius, setMapStyle, setNegativeMapColours, setPositiveMapColours, showMap, changeMapRadius } from "../../store/mapContourSettingsSlice";
import { useSnackbar } from "notistack";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { MoorhenPreciseInput } from "../select/MoorhenPreciseInput";
import Box from '@mui/material/Box';

type ActionButtonType = {
    label: string;
    compressed: () => JSX.Element;
    expanded: null | ( () => JSX.Element );
}

interface MoorhenMapCardPropsInterface extends moorhen.CollectedProps {
    map: moorhen.Map;
    initialContour?: number;
    initialRadius?: number;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

export const MoorhenMapCard = forwardRef<any, MoorhenMapCardPropsInterface>((props, cardRef) => {
    const defaultProps = {
        initialContour: 0.8, initialRadius: 13
    }

    const { initialContour, initialRadius } = {...defaultProps, ...props}

    const mapRadius = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapRadii.find(item => item.molNo === props.map.molNo)
        if (map) {
            return map.radius
        } else {
            return initialRadius
        }
    })
    const mapContourLevel = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.contourLevels.find(item => item.molNo === props.map.molNo)
        if (map) {
            return map.contourLevel
        } else {
            return initialContour
        }
    })
    const mapStyle = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapStyles.find(item => item.molNo === props.map.molNo)
        if (map) {
            return map.style
        } else {
            return state.mapContourSettings.defaultMapSurface ? "solid" : state.mapContourSettings.defaultMapLitLines ? "lit-lines" : "lines"
        }
    })
    const mapOpacity = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapAlpha.find(item => item.molNo === props.map.molNo)
        if (map) {
            return map.alpha
        } else {
            return 1.0
        }
    })
    
    // Need to stringify to ensure the selector is stable... (dont want to return a new obj reference)
    const mapColourString = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapColours.find(item => item.molNo === props.map.molNo)
        return map ? JSON.stringify(map.rgb) : ""
    })
    
    const negativeMapColourString = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.negativeMapColours.find(item => item.molNo === props.map.molNo)
        return map ? JSON.stringify(map.rgb) : ""
    })

    const positiveMapColourString = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.positiveMapColours.find(item => item.molNo === props.map.molNo)
        return map ? JSON.stringify(map.rgb) : ""
    })

    const mapColour: {r: number; g: number; b: number;} = useMemo(() => {
        if (mapColourString) {
            return JSON.parse(mapColourString)
        } else {
            return {r: props.map.defaultMapColour.r * 255., g: props.map.defaultMapColour.g * 255., b: props.map.defaultMapColour.b * 255.}
        }
    }, [mapColourString])
    
    const mapColourHex: string  = useMemo(() => {
        if (mapColourString) {
            const rgb = JSON.parse(mapColourString)
            return rgbToHex(rgb.r, rgb.g, rgb.b)
        } else {
            return rgbToHex(props.map.defaultMapColour.r, props.map.defaultMapColour.g, props.map.defaultMapColour.b)
        }
    }, [mapColourString])

    const negativeMapColour: {r: number; g: number; b: number;} = useMemo(() => {
        if (negativeMapColourString) {
            return JSON.parse(negativeMapColourString)
        } else {
            return {r: props.map.defaultNegativeMapColour.r * 255., g: props.map.defaultNegativeMapColour.g * 255., b: props.map.defaultNegativeMapColour.b * 255.}
        }
    }, [negativeMapColourString])

    const negativeMapColourHex: string  = useMemo(() => {
        if (negativeMapColourString) {
            const rgb = JSON.parse(negativeMapColourString)
            return rgbToHex(rgb.r, rgb.g, rgb.b)
        } else {
            return rgbToHex(props.map.defaultNegativeMapColour.r, props.map.defaultNegativeMapColour.g, props.map.defaultNegativeMapColour.b)
        }
    }, [negativeMapColourString])

    const positiveMapColour: {r: number; g: number; b: number;} = useMemo(() => {
        if (positiveMapColourString) {
            return JSON.parse(positiveMapColourString)
        } else {
            return {r: props.map.defaultPositiveMapColour.r * 255., g: props.map.defaultPositiveMapColour.g * 255., b: props.map.defaultPositiveMapColour.b * 255.}
        }
    }, [positiveMapColourString])

    const positiveMapColourHex: string  = useMemo(() => {
        if (positiveMapColourString) {
            const rgb = JSON.parse(positiveMapColourString)
            return rgbToHex(rgb.r, rgb.g, rgb.b)
        } else {
            return rgbToHex(props.map.defaultPositiveMapColour.r, props.map.defaultPositiveMapColour.g, props.map.defaultPositiveMapColour.b)
        }
    }, [positiveMapColourString])

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor)
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.generalStates.defaultExpandDisplayCards)
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(props.map.molNo))

    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards);
    const [currentName, setCurrentName] = useState<string>(props.map.name);
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)
    const [histogramBusy, setHistogramBusy] = useState<boolean>(false)
    
    const colourSwatchRef = useRef<HTMLDivElement | null>(null)
    const nextOrigin = useRef<number[]>([])
    const busyContouring = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const histogramRef = useRef(null)
    const intervalRef = useRef(null)

    const dispatch = useDispatch()

    const anchorEl = useRef(null)

    const { enqueueSnackbar } = useSnackbar()

    useImperativeHandle(cardRef, () => ({
        forceIsCollapsed: (value: boolean) => { 
            setIsCollapsed(value)
         }
    }), 
    [setIsCollapsed])

    const handlePositiveMapColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            dispatch( setPositiveMapColours({ molNo: props.map.molNo, rgb: color}) )
            props.map.fetchDiffMapColourAndRedraw('positiveDiffColour')
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleNegativeMapColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            dispatch( setNegativeMapColours({ molNo: props.map.molNo, rgb: color}) )
            props.map.fetchDiffMapColourAndRedraw('negativeDiffColour')
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            dispatch( setMapColours({ molNo: props.map.molNo, rgb: color}) )
            props.map.fetchColourAndRedraw()
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const mapSettingsProps = {
        setPopoverIsShown, mapOpacity, mapStyle, glRef: props.glRef, map: props.map
    }

    const handleDownload = async () => {
        let response = await props.map.getMap()
        doDownload([response.data.result.mapData], `${props.map.name.replace('.mtz', '.map')}`)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleVisibility = useCallback(() => {
        dispatch( mapIsVisible ? hideMap(props.map) : showMap(props.map) )
        props.setCurrentDropdownMolNo(-1)
    }, [mapIsVisible])

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap()
        dispatch( addMap(newMap) )
    }

    const actionButtons: { [key: number] : ActionButtonType } = {
        1: {
            label: mapIsVisible ? "Hide map" : "Show map",
            compressed: () => { return (<MenuItem key='hide-show-map' onClick={handleVisibility}>{mapIsVisible ? "Hide map" : "Show map"}</MenuItem>) },
            expanded: () => {
                return (<Button key='hide-show-map' size="sm" variant="outlined" onClick={handleVisibility}>
                    {mapIsVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
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
            compressed: () => { return (<MoorhenMapSettingsMenuItem key='map-draw-settings' disabled={!mapIsVisible} {...mapSettingsProps} />) },
            expanded: null
        },
        5: {
            label: "Copy map",
            compressed: () => { return (<MenuItem key='copy-map' onClick={handleCopyMap}>Copy map</MenuItem>) },
            expanded: () => {
                return (<Button key='copy-map' size="sm" variant="outlined" onClick={handleCopyMap}>
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
            compressed: () => { return (<MoorhenSetMapWeight key='set-map-weight' disabled={!mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />) },
            expanded: null
        },
        8: {
            label: "Set map scale...",
            compressed: () => { return (<MoorhenScaleMap key='scale-map' disabled={!mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />) },
            expanded: null
        },
        9: {
            label: "Map information...",
            compressed: () => { return (<MoorhenMapInfoCard key='info-map' disabled={!mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />) },
            expanded: null
        },
    }

    const getButtonBar = () => {
        const minWidth = convertRemToPx(28)
        const maximumAllowedWidth = minWidth * 0.55
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

    const doContourIfDirty = useCallback(() => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            props.map.drawMapContour().then(() => {
                busyContouring.current = false
                doContourIfDirty()
            })
        }
    }, [mapRadius, mapContourLevel, mapIsVisible, mapStyle])

    const handleOriginUpdate = useCallback((evt: moorhen.OriginUpdateEvent) => {
        nextOrigin.current = [...evt.detail.origin.map((coord: number) => -coord)]
        isDirty.current = true
        if (mapIsVisible && !busyContouring.current) {
                doContourIfDirty()
        }
    }, [doContourIfDirty])

    const handleWheelContourLevelCallback = useCallback((evt: moorhen.WheelContourLevelEvent) => {
        let newMapContourLevel: number
        if (props.map.molNo === activeMap.molNo) {
            if (!mapIsVisible) {
                enqueueSnackbar("Active map not displayed, cannot change contour lvl.", { variant: "warning"})
                return
            }

            let emScaling = props.map.isEM ? 0.001 : 0.01
            if (evt.detail.factor > 1) {
                newMapContourLevel = mapContourLevel + contourWheelSensitivityFactor * emScaling 
            } else {
                newMapContourLevel = mapContourLevel - contourWheelSensitivityFactor * emScaling
            }

        }
        if (newMapContourLevel) {
            batch(() => {
                dispatch( setContourLevel({ molNo: props.map.molNo, contourLevel: newMapContourLevel }) )
                enqueueSnackbar(`map-${props.map.molNo}-contour-lvl-change`, {
                    variant: "mapContourLevel",
                    persist: true,
                    mapMolNo: props.map.molNo
                })
            })
        }
    }, [mapContourLevel, mapRadius, activeMap?.molNo, props.map.molNo, mapIsVisible])

    useMemo(() => {
        if (currentName === "") {
            return
        }
        props.map.name = currentName

    }, [currentName]);

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        }
    }, [handleOriginUpdate])

    useEffect(() => {
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        return () => {
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        }
    }, [handleWheelContourLevelCallback])

    useEffect(() => {
        props.map.fetchMapAlphaAndRedraw()
    }, [mapOpacity])

    useEffect(() => {
        // This looks stupid but it is important otherwise the map is first drawn with the default contour and radius. Probably there's a problem somewhere...
        dispatch(setMapAlpha({molNo: props.map.molNo, alpha: mapOpacity}))
        dispatch(setMapStyle({molNo: props.map.molNo, style: mapStyle}))
        dispatch(setMapRadius({molNo: props.map.molNo, radius: mapRadius}))
        dispatch(setContourLevel({molNo: props.map.molNo, contourLevel: mapContourLevel}))
        dispatch(setMapColours({molNo: props.map.molNo, rgb: mapColour}))
        dispatch(setNegativeMapColours({molNo: props.map.molNo, rgb: negativeMapColour}))
        dispatch(setPositiveMapColours({molNo: props.map.molNo, rgb: positiveMapColour}))
        // Show map only if specified
        if (props.map.showOnLoad) {
            dispatch(showMap(props.map))
        }
    }, [])

    useEffect(() => {
        if (mapIsVisible) {
            nextOrigin.current = props.glRef.current.origin.map(coord => -coord)
            isDirty.current = true
            if (!busyContouring.current) {
                doContourIfDirty()
            }
        } else {
            props.map.hideMapContour()
        }

    }, [doContourIfDirty])

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
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                            <div className="moorhen-hex-input-decorator">#</div>
                            <HexColorInput className="moorhen-hex-input" color={positiveMapColourHex} onChange={(hex) => {
                                const [r, g, b] = MoorhenColourRule.parseHexToRgba(hex)
                                handlePositiveMapColorChange({r, g, b})
                            }}/>
                        </div>
                    </div>
                    <div style={{width: '100%', textAlign: 'center'}}>
                        <span>Negative</span>
                        <RgbColorPicker color={negativeMapColour} onChange={handleNegativeMapColorChange} />
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                            <div className="moorhen-hex-input-decorator">#</div>
                            <HexColorInput className="moorhen-hex-input" color={negativeMapColourHex} onChange={(hex) => {
                                const [r, g, b] = MoorhenColourRule.parseHexToRgba(hex)
                                handleNegativeMapColorChange({r, g, b})
                            }}/>
                        </div>
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
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '0.1rem'}}>
                            <div className="moorhen-hex-input-decorator">#</div>
                            <HexColorInput className="moorhen-hex-input" color={mapColourHex} onChange={(hex) => {
                                const [r, g, b, a] = MoorhenColourRule.parseHexToRgba(hex)
                                handleColorChange({r, g, b})
                            }}/>
                        </div>
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

    return <Card ref={cardRef} className="px-0" style={{ display: 'flex', minWidth: convertRemToPx(28), marginBottom: '0.5rem', padding: '0' }} key={props.map.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black' }}>
                    {getNameLabel(props.map)}
                    {getMapColourSelector()}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    {getButtonBar()}
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
                <Col style={{justifyContent: 'center'}}>
                    <Form.Group controlId="contouringLevel" className="mb-3">
                    <Stack 
                        direction='horizontal'
                        gap={4}
                        style={{
                        justifyContent: "center",
                        alignItems: "center", 
                        width: "100%",
                        }}>

                        <MoorhenPreciseInput 
                            onEnter = {(newVal) => dispatch( setContourLevel({molNo: props.map.molNo, contourLevel: +newVal}) )}
                            label = {"Level:"} 
                            setValue={mapContourLevel}
                            decimalDigits={props.map.isEM ? 4 : 2}
                            allowNegativeValues={true}
                            width= {60}
                        />
                        
                        {props.map.mapRmsd && (
                        <MoorhenPreciseInput 
                            allowNegativeValues={true}
                            onEnter = {(newVal) => dispatch( setContourLevel({molNo: props.map.molNo, contourLevel : +newVal * props.map.mapRmsd}) )}
                            label = {"RMSD:"} 
                            setValue={mapContourLevel / props.map.mapRmsd}
                            decimalDigits={2}
                            width= {50}
                        /> 
                        )}

                </Stack>
                    <MoorhenSlider
                        minVal={0.001}
                        maxVal={props.map.isEM ? 2 : 5}
                        showMinMaxVal={false}
                        factorButtons={props.map.isEM ? 0.001 : 0.01}
                        showButtons={true}
                        allowExternalFeedback={true}
                        logScale={true}
                        showSliderTitle={false}
                        isDisabled={!mapIsVisible}
                        initialValue={initialContour}
                        externalValue={mapContourLevel}
                        setExternalValue={(newVal) => dispatch( setContourLevel({molNo: props.map.molNo, contourLevel: newVal}) )}
                    />
                        
                    </Form.Group>
                    <Form.Group controlId="contouringRadius" className="mb-3">
                        <MoorhenSlider
                            minVal={2}
                            maxVal={100}
                            showMinMaxVal={false}
                            showButtons={true}
                            factorButtons={2}
                            allowExternalFeedback={true} 
                            logScale={false} 
                            sliderTitle="Radius" 
                            decimalPlaces={2} 
                            isDisabled={!mapIsVisible} 
                            initialValue={initialRadius} 
                            externalValue={mapRadius} 
                            setExternalValue={(newVal) => dispatch( setMapRadius({molNo: props.map.molNo, radius: newVal}) )}
                            usePreciseInput={true}
                        />
                    </Form.Group>
                </Col>
            </Stack>
            <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={histogramBusy ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                    Histogram
                </AccordionSummary>
                <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                    <MoorhenMapHistogram
                        ref={histogramRef}
                        setBusy={setHistogramBusy}
                        showHistogram={true}
                        setMapContourLevel={(newVal) => dispatch( setContourLevel({molNo: props.map.molNo, contourLevel: newVal}) )} 
                        currentContourLevel={mapContourLevel}
                        map={props.map}/>
                </AccordionDetails>
            </Accordion>
        </Stack>
        </Card.Body>
    </Card >
})
