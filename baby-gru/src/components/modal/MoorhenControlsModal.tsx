import { Card, Col, Row } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { convertViewtoPx } from "../../utils/utils";
import parse from 'html-react-parser'
import { modalKeys } from "../../utils/enums";
import { Autocomplete, createFilterOptions, MenuItem, TextField } from "@mui/material";

const shortCutMouseActions = {
    open_context_menu: ['circle-right-mouse-click', 'two-finger-tap'],
    residue_camera_wiggle: ['mouse-move', 'circle-left-mouse-click', 'one-finger-move'],
    residue_selection: ['circle-left-mouse-click', 'one-finger-tap'],
    measure_distances: ['circle-left-mouse-click', 'one-finger-tap'],
    measure_angles: ['circle-left-mouse-click', 'one-finger-tap'],
    label_atom: ['circle-left-mouse-click', 'one-finger-tap'],
    dist_ang_2d: ['circle-left-mouse-click', 'one-finger-tap'],
    center_atom: ['middle-right-mouse-click', 'one-finger-tap'],
    set_map_contour: ['middle-right-mouse-click', 'mouse-scroll-arrows', 'two-finger-scroll'],
    pan_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    rotate_view: ['circle-left-mouse-click', 'mouse-move', 'one-finger-move'],
    contour_lvl: ['mouse-scroll-arrows', 'two-finger-scroll']
}

export const MoorhenControlsModal = (props: { urlPrefix: string }) => {

    const _shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false)
    const [svgString, setSvgString] = useState<string | null>(null)
    const [autoCompleteValue, setAutoCompleteValue] = useState<string>("")

    const previouslySearchedRef = useRef<string | null>(null)
    const autoCompleteRef = useRef<string | null>(null)
    const shortCuts = useMemo(() => {
        const shortCuts: {[key: string]: {modifiers: string[]; keyPress: string; label: string}} = _shortCuts ? JSON.parse(_shortCuts as string) : null
        if (shortCuts) {
            shortCuts['pan_view'] = {modifiers: ['shiftKey', 'altKey'], keyPress: '', label: 'Pan view'}
            shortCuts['rotate_view'] = {modifiers: ['shiftKey'], keyPress: '', label: 'Rotate view'} 
            shortCuts['open_context_menu'] = {modifiers: [], keyPress: '', label: 'Open context menu'} 
            shortCuts['contour_lvl'] = {modifiers: ['ctrlKey'], keyPress: '', label: 'Change active map contour'}
        }
        return shortCuts
    }, [_shortCuts])

    useEffect(() => {
        const fetchSVG = async () => {
            const response = await fetch(`${props.urlPrefix}/pixmaps/keyboard-blank.svg`)
            if (response.ok) {
                const text = await response.text()
                setSvgString(text)
            }
        }
        fetchSVG()
    }, [])

    const filterOptions = useMemo(() => createFilterOptions({
        ignoreCase: true,
        limit: 5
    }), [])

    const handleMouseHover = (key: string, modifiers: string[], isMouseEnter: boolean = true) => {
        const cardElement = document.getElementById(`show-controls-card-${key}`)
        cardElement.style.borderWidth = isMouseEnter ? '0.2rem' : '0.1rem'
        cardElement.style.borderColor = isMouseEnter ? 'black' : 'grey'
        const svg: any = document.querySelector("#moorhen-keyboard-blank-svg")
        if (!svg) {
            return
        }
        
        const elementsToHighlight: string[] = [...modifiers, shortCuts[key].keyPress]
        elementsToHighlight.forEach(elementId => {
            const svgElement: SVGElement = svg.getElementById(elementId)
            if(svgElement) {
                 svgElement.style.fill = isMouseEnter ? '#f55142' : '#ffffffff'
            }
        })

        if (Object.hasOwn(shortCutMouseActions, key)) {
            shortCutMouseActions[key].forEach((svgId: string) => {
                const svgElement: SVGElement = svg.getElementById(svgId)
                if(svgElement)  {
                    svgElement.style.display = isMouseEnter ? 'block' : 'none'
                }
            })
        }
    }

    return <MoorhenDraggableModalBase
                modalId={modalKeys.SHOW_CONTROLS}
                left={width / 5}
                top={height / 5}
                minHeight={convertViewtoPx(65, height)}
                minWidth={convertViewtoPx(60, width)}
                maxHeight={convertViewtoPx(65, height)}
                maxWidth={convertViewtoPx(60, width)}
                headerTitle='Moorhen Controls'
                enableResize={false}
                footer={null}
                body={
                    <Row style={{display: 'flex'}}>
                    <Col className="col-4" style={{overflowY: 'scroll', height: convertViewtoPx(65, height)}}>
                    {shortCuts && Object.keys(shortCuts).map(key => {
                            let modifiers = []
                            if (shortCuts[key].modifiers.includes('shiftKey')) modifiers.push("Shift")
                            if (shortCuts[key].modifiers.includes('ctrlKey')) modifiers.push("Ctrl")
                            if (shortCuts[key].modifiers.includes('metaKey')) modifiers.push("Meta")
                            if (shortCuts[key].modifiers.includes('altKey')) modifiers.push("Alt")
                            if (shortCuts[key].keyPress === " ") modifiers.push("Space")
                            return <Card id={`show-controls-card-${key}`} key={key} style={{margin:'0.5rem', borderColor: 'grey'}}
                                         onMouseEnter={() => {
                                            if (previouslySearchedRef.current) {
                                                handleMouseHover(previouslySearchedRef.current, shortCuts[previouslySearchedRef.current].modifiers, false)
                                            }        
                                            handleMouseHover(key, modifiers)
                                        }}
                                         onMouseLeave={() => handleMouseHover(key, modifiers, false)}>
                                        <Card.Body style={{padding:'0.5rem'}}>
                                            <span style={{fontWeight:'bold'}}>
                                                {`${shortCuts[key].label}`} 
                                            </span>
                                        </Card.Body>
                                    </Card>
                            })}
                    </Col>
                    <Col className="col-8" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Autocomplete
                            style={{ paddingTop: '0.5rem' }}
                            disablePortal
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            freeSolo
                            includeInputInList
                            filterSelectedOptions
                            size='small'
                            value={autoCompleteValue}
                            open={autocompleteOpen}
                            onClose={() => setAutocompleteOpen(false)}
                            onOpen={() => setAutocompleteOpen(true)}
                            renderInput={(params) => <TextField {...params} label="Search" InputProps={{
                                ...params.InputProps
                            }} />}
                            renderOption={(props, key: string) => {
                                return <MenuItem key={key} onClick={(_evt) => {
                                    autoCompleteRef.current = key
                                    setAutoCompleteValue(shortCuts[key].label)
                                    setAutocompleteOpen(false)
                                    if (previouslySearchedRef.current) {
                                        handleMouseHover(previouslySearchedRef.current, shortCuts[previouslySearchedRef.current].modifiers, false)
                                    }
                                    previouslySearchedRef.current = key
                                    handleMouseHover(key, shortCuts[key].modifiers)
                                }}>{shortCuts[key].label}</MenuItem>
                            }}
                            options={Object.keys(shortCuts)}
                            filterOptions={filterOptions}
                            onChange={(evt, newSelection: string) => {
                                autoCompleteRef.current = newSelection
                                if (newSelection === null) {
                                    setAutoCompleteValue(newSelection)
                                }
                                setAutocompleteOpen(false)
                            }}
                            sx={{
                                '& .MuiInputBase-root': {
                                    backgroundColor: isDark ? '#222' : 'white',
                                    color: isDark ? 'white' : '#222',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isDark ? 'white' : 'grey',
                                },
                                '& .MuiButtonBase-root': {
                                    color: isDark ? 'white' : 'grey',
                                },
                                '& .MuiFormLabel-root': {
                                    color: isDark ? 'white' : '#222',
                                },
                            }}/>
                            <div style={{display: 'flex'}}>
                                {svgString ? parse(svgString) : null}
                            </div>
                    </Col>
                    </Row>
                }
                {...props}
            />
}
