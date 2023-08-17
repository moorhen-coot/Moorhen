import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { Spinner, Form, Overlay, Popover, Stack } from 'react-bootstrap';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenDevMenu } from './MoorhenDevMenu';
import { MoorhenCryoMenu } from './MoorhenCryoMenu';
import { MoorhenCalculateMenu } from './MoorhenCalculateMenu';
import { ClickAwayListener, Fab, MenuItem, IconButton, MenuList, Popper, Grow } from "@mui/material";
import { convertRemToPx, convertViewtoPx } from '../../utils/MoorhenUtils';
import { MoorhenModelsModal } from '../modal/MoorhenModelsModal';
import { MoorhenCreateAcedrgLinkModal } from '../modal/MoorhenCreateAcedrgLinkModal';
import { MoorhenMapsModal } from '../modal/MoorhenMapsModal';
import { MoorhenValidationToolsModal } from '../modal/MoorhenValidationToolsModal';
import { 
    AcUnitOutlined, CalculateOutlined, DescriptionOutlined, EditOutlined, VisibilityOutlined,
    FactCheckOutlined, HelpOutlineOutlined, MenuOutlined, SaveOutlined, ScienceOutlined, SettingsSuggestOutlined, CloseOutlined,
 } from '@mui/icons-material';
import { MoorhenQuerySequenceModal } from '../modal/MoorhenQuerySequenceModal';
import { MoorhenScriptModal } from '../modal/MoorhenScriptModal';
import { moorhen } from '../../types/moorhen';

interface MoorhenNavBarPropsInterface extends moorhen.Controls {
    busy: boolean;
}

export interface MoorhenNavBarExtendedControlsInterface extends MoorhenNavBarPropsInterface {
    dropdownId: string;
    currentDropdownId: string;
    setCurrentDropdownId: React.Dispatch<React.SetStateAction<string>>;
    setShowQuerySequence: React.Dispatch<React.SetStateAction<boolean>>;
    setShowScripting: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCreateAcedrgLinkModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenNavBar = forwardRef<HTMLElement, MoorhenNavBarPropsInterface>((props, ref) => {
    const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false)
    const [currentDropdownId, setCurrentDropdownId] = useState<string>('-1')
    const [showSaveIcon, setShowSaveIcon] = useState<boolean>(false)
    const [showCreateAcedrgLinkModal, setShowCreateAcedrgLinkModal] = useState<boolean>(false)
    const [showValidation, setShowValidation] = useState<boolean>(false)
    const [showModels, setShowModels] = useState<boolean>(false)
    const [showMaps, setShowMaps] = useState<boolean>(false)
    const [showQuerySequence, setShowQuerySequence] = useState<boolean>(false)
    const [showScripting, setShowScripting] = useState<boolean>(false)
    const [popoverTargetRef, setPopoverTargetRef] = useState()
    const speedDialRef = useRef()
    const fileSpeedDialActionRef = useRef()
    const editSpeedDialActionRef = useRef()
    const calcualteSpeedDialActionRef = useRef()
    const ligandSpeedDialActionRef = useRef()
    const validationSpeedDialActionRef = useRef()
    const modelsSpeedDialActionRef = useRef()
    const mapsSpeedDialActionRef = useRef()
    const viewDialActionRef = useRef()
    const preferencesDialActionRef = useRef()
    const cryoDialActionRef = useRef()
    const helpDialActionRef = useRef()
    const devDialActionRef = useRef()

    useEffect(() => {
        if (props.timeCapsuleRef.current) {
            setShowSaveIcon(props.timeCapsuleRef.current.busy)
        }
    }, [props.timeCapsuleRef.current?.busy])

    const collectedProps = {
        currentDropdownId, setCurrentDropdownId, setShowQuerySequence, setShowScripting, setShowCreateAcedrgLinkModal, ...props
    }

    const actions = {
        'File': { icon: <DescriptionOutlined />, name: 'File', ref: fileSpeedDialActionRef},
        'Edit': { icon: <EditOutlined />, name: 'Edit', ref: editSpeedDialActionRef},
        'Calculate': { icon: <CalculateOutlined/>, name: 'Calculate', ref: calcualteSpeedDialActionRef},
        'View': { icon: <VisibilityOutlined/>, name: 'View', ref: viewDialActionRef},
        'Validation': { icon: <FactCheckOutlined />, name: 'Validation', ref: validationSpeedDialActionRef},
        'Ligand': { icon:  <img src={`${props.urlPrefix}/baby-gru/pixmaps/moorhen-ligand.svg`} alt='Ligand' style={{height: '1.6rem', marginRight: '0.3rem', marginLeft: '0.3rem'}} />, name: 'Ligand', ref: ligandSpeedDialActionRef},
        'Cryo': { icon: <AcUnitOutlined/>, name: 'Cryo', ref: cryoDialActionRef},
        'Models': { icon: <img src={`${props.urlPrefix}/baby-gru/pixmaps/secondary-structure-grey.svg`} alt='Model' style={{height: '1.6rem', marginRight: '0.3rem', marginLeft: '0.3rem'}} />, name: 'Models', ref: modelsSpeedDialActionRef},
        'Maps': { icon: <img src={`${props.urlPrefix}/baby-gru/pixmaps/map-grey.svg`} alt='Map' style={{height: '1.6rem', marginRight: '0.3rem', marginLeft: '0.3rem'}} />, name: 'Maps', ref: mapsSpeedDialActionRef},
        'Preferences': { icon: <SettingsSuggestOutlined/>, name: 'Preferences', ref: preferencesDialActionRef},
        'Help': { icon: <HelpOutlineOutlined/>, name: 'Help', ref: helpDialActionRef},
    }

    if (props.devMode) {
        actions['Dev'] = { icon: <ScienceOutlined/>, name: 'Dev', ref: devDialActionRef}
    }

    if (props.extraNavBarMenus) {
        props.extraNavBarMenus.forEach(menu => {
            actions[menu.name] = menu
        })
    }

    useEffect(() => {
        switch(currentDropdownId) {
            case "-1":
                break
            case "Models":
                setShowModels(true)
                setCurrentDropdownId('-1')
                break
            case "Maps":
                setShowMaps(true)
                setCurrentDropdownId('-1')
                break
            case "Validation":
                setShowValidation(true)
                setCurrentDropdownId('-1')
                break
            default:
                setPopoverTargetRef(actions[currentDropdownId].ref.current)
                break
        }
    }, [currentDropdownId])

    const handleDialActionClick = useCallback((actionName) => {
        if (actionName === currentDropdownId) {
            setCurrentDropdownId('-1')
        } else {
            setCurrentDropdownId(actionName)
        }
        
    }, [currentDropdownId])

    const canvasElement = document.getElementById('moorhen-canvas-background')
    let canvasTop: number
    let canvasLeft: number
    if (canvasElement !== null) {
        const rect = canvasElement.getBoundingClientRect()
        canvasLeft = rect.left
        canvasTop = rect.top
    } else {
        canvasLeft = 0
        canvasTop = 0
    } 

    return <>
        <Fab
            ref={speedDialRef}
            variant={'extended'}
            size={"large"}
            onClick={() => {
                setCurrentDropdownId('-1')
                setSpeedDialOpen(!speedDialOpen)        
            }}
            sx={{
                display: props.viewOnly ? 'none' : 'flex',
                position: 'absolute',
                top: canvasTop + convertRemToPx(0.5),
                left: canvasLeft + convertRemToPx(0.5),
                color: props.isDark ? 'white' : 'black' ,
                bgcolor: props.isDark ? 'grey' : 'white',
                '&:hover': {
                    bgcolor: props.isDark ? 'grey' : 'white',
                },
            }}
        >
            { (speedDialOpen) ? <CloseOutlined style={{color: 'black'}}/> : <MenuOutlined style={{color: 'black'}}/> }
            <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt='Moorhen' style={{height: '1.6rem', marginRight: '0.3rem', marginLeft: '0.3rem'}} /> 
        </Fab>
        <ClickAwayListener onClickAway={() => { setCurrentDropdownId('-1') }}>
        <Popper open={speedDialOpen} anchorEl={speedDialRef.current} placement='bottom-start'>
            <Grow in={speedDialOpen} style={{ transformOrigin: '0 0 0' }}>
            <MenuList style={{height: props.windowHeight - convertRemToPx(5), width: '100%', overflowY: 'auto', direction: 'rtl'}}>
                {Object.keys(actions).map((key) => {
                const action = actions[key]
                return <MenuItem
                    ref={action.ref}
                    key={action.name}
                    onClick={() => handleDialActionClick(action.name)}
                    style={{
                        marginBottom: '0.5rem',
                        marginRight: '0.5rem',
                        marginLeft: '0.5rem',
                        backgroundColor: props.isDark ? (currentDropdownId === action.name ? '#a8a8a8' : 'grey') : (currentDropdownId === action.name ? '#d4d4d4' : 'white') ,
                        justifyContent: 'left',
                        display: 'flex',
                        borderRadius: '2rem',
                        boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)'
                    }}>
                        <Stack gap={2} direction='horizontal' style={{display: 'flex', verticalAlign: 'middle'}}>
                            {action.name}
                            <IconButton>
                                {action.icon}
                            </IconButton>
                        </Stack>
                </MenuItem>
                })}
            </MenuList>
            </Grow>
            <Overlay placement='right' show={currentDropdownId !== '-1'} target={currentDropdownId !== '-1' ? popoverTargetRef : null}>
                <Popover style={{
                    borderWidth: 0,
                    marginLeft: '1.5rem',
                    maxWidth: convertViewtoPx(35, props.windowWidth),
                    overflowX: 'auto',
                    borderRadius: '1.5rem',
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)'
                }}>
                    <Popover.Body>
                        { currentDropdownId === 'File' && <MoorhenFileMenu dropdownId="File" {...collectedProps} /> }
                        { currentDropdownId === 'Edit' && <MoorhenEditMenu dropdownId="Edit" {...collectedProps} /> }
                        { currentDropdownId === 'Calculate' && <MoorhenCalculateMenu dropdownId="Calculate" {...collectedProps} /> }
                        { currentDropdownId === 'Ligand' && <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} /> }
                        { currentDropdownId === 'View' && <MoorhenViewMenu dropdownId="View" {...collectedProps} /> }
                        { currentDropdownId === 'Preferences' && <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} /> }
                        { currentDropdownId === 'Cryo' && <MoorhenCryoMenu dropdownId="Cryo" {...collectedProps} /> }
                        { currentDropdownId === 'Help' &&  <MoorhenHelpMenu dropdownId="Help" {...collectedProps} /> }
                        { currentDropdownId === 'Dev' &&  <MoorhenDevMenu dropdownId="Dev" {...collectedProps} /> }
                        { props.extraNavBarMenus && props.extraNavBarMenus.find(menu => currentDropdownId === menu.name)?.JSXElement}
                    </Popover.Body>
                </Popover>
            </Overlay>
        </Popper>
        </ClickAwayListener>
    <MoorhenModelsModal
            show={showModels}
            setShow={setShowModels}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
    />
    <MoorhenMapsModal
            show={showMaps}
            setShow={setShowMaps}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
    />
    {showCreateAcedrgLinkModal && 
        <MoorhenCreateAcedrgLinkModal
            width={45}
            show={showCreateAcedrgLinkModal}
            setShow={setShowCreateAcedrgLinkModal}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
        />
    }
    {showValidation && 
        <MoorhenValidationToolsModal 
            show={showValidation}
            setShow={setShowValidation}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
        />
    }
    {showQuerySequence &&
        <MoorhenQuerySequenceModal
            show={showQuerySequence}
            setShow={setShowQuerySequence}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props} />
    }
    {showScripting &&
        <MoorhenScriptModal show={showScripting} setShow={setShowScripting} {...props} />
    }
    <Fab
        variant='extended'
        size="large"
        sx={{
            position: 'absolute',
            top: canvasTop + convertRemToPx(0.5),
            right: canvasLeft + convertRemToPx(0.5),
            display: props.hoveredAtom.cid || props.busy || showSaveIcon ? 'flex' : 'none',
            color: props.isDark ? 'grey' : 'white' ,
            bgcolor: props.isDark ? 'grey' : 'white',
            '&:hover': {
                bgcolor: props.isDark ? 'grey' : 'white',
            }
        }}
    >
        {props.hoveredAtom.cid && <Form.Control style={{ height: '2rem', width: "20rem", borderRadius: '1.5rem', borderColor: 'black'}} type="text" readOnly={true} value={`${props.hoveredAtom.molecule.name}:${props.hoveredAtom.cid}`} />}
        {props.busy && <Spinner animation="border" variant={props.isDark ? 'light' : 'dark'} style={{ height: '2rem', marginRight: '0.5rem', marginLeft: '0.5rem' }} />}
        {showSaveIcon && <SaveOutlined style={{padding: 0, margin: 0, color: 'black'}}/>}
    </Fab>
    </>
})
