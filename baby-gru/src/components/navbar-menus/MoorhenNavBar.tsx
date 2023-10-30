import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { Spinner, Form, Overlay, Popover, Stack } from 'react-bootstrap';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenHistoryMenu } from './MoorhenHistoryMenu';
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
    FactCheckOutlined, HelpOutlineOutlined, MenuOutlined, SaveOutlined, ScienceOutlined, SettingsSuggestOutlined, CloseOutlined, HistoryOutlined,
 } from '@mui/icons-material';
import { MoorhenQuerySequenceModal } from '../modal/MoorhenQuerySequenceModal';
import { MoorhenScriptModal } from '../modal/MoorhenScriptModal';
import { moorhen } from '../../types/moorhen';
import { useSelector } from 'react-redux';

export interface MoorhenNavBarExtendedControlsInterface extends moorhen.CollectedProps {
    dropdownId: string;
    currentDropdownId: string;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentDropdownId: React.Dispatch<React.SetStateAction<string>>;
    setShowQuerySequence: React.Dispatch<React.SetStateAction<boolean>>;
    setShowScripting: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCreateAcedrgLinkModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenNavBar = forwardRef<HTMLElement, moorhen.CollectedProps>((props, ref) => {
    
    const [timeCapsuleBusy, setTimeCapsuleBusy] = useState<boolean>(false)
    const [busy, setBusy] = useState<boolean>(false)
    const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false)
    const [currentDropdownId, setCurrentDropdownId] = useState<string>('-1')
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
    const historyDialRef = useRef()
    const viewDialActionRef = useRef()
    const preferencesDialActionRef = useRef()
    const cryoDialActionRef = useRef()
    const helpDialActionRef = useRef()
    const devDialActionRef = useRef()
    
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)

    useEffect(() => {
        if (props.commandCentre.current) {
            props.commandCentre.current.onActiveMessagesChanged = (newActiveMessages) => setBusy(newActiveMessages.length !== 0)
        }         
    }, [cootInitialized])

    useEffect(() => {
        if (props.timeCapsuleRef.current) {
            props.timeCapsuleRef.current.onIsBusyChange = (newValue: boolean) => {
                if (newValue) {
                    setTimeCapsuleBusy(true)
                } else {
                    setTimeout(() => setTimeCapsuleBusy(false), 1000)
                }
            }
        }
    }, [props.timeCapsuleRef.current])

    const collectedProps = {
        currentDropdownId, setCurrentDropdownId, setShowQuerySequence, setShowScripting, 
        setShowCreateAcedrgLinkModal, setBusy, ...props
    }

    const actions = {
        'File': { icon: <DescriptionOutlined />, name: 'File', ref: fileSpeedDialActionRef},
        'Edit': { icon: <EditOutlined />, name: 'Edit', ref: editSpeedDialActionRef},
        'Calculate': { icon: <CalculateOutlined/>, name: 'Calculate', ref: calcualteSpeedDialActionRef},
        'View': { icon: <VisibilityOutlined/>, name: 'View', ref: viewDialActionRef},
        'Validation': { icon: <FactCheckOutlined />, name: 'Validation', ref: validationSpeedDialActionRef},
        'Ligand': { icon:  <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/baby-gru/pixmaps/moorhen-ligand.svg`} alt='Ligand'/>, name: 'Ligand', ref: ligandSpeedDialActionRef},
        'Cryo': { icon: <AcUnitOutlined/>, name: 'Cryo', ref: cryoDialActionRef},
        'Models': { icon: <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/baby-gru/pixmaps/secondary-structure-grey.svg`} alt='Model' />, name: 'Models', ref: modelsSpeedDialActionRef},
        'Maps': { icon: <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/baby-gru/pixmaps/map-grey.svg`} alt='Map'/>, name: 'Maps', ref: mapsSpeedDialActionRef},
        'History': {icon: <HistoryOutlined/>, name: 'History', ref: historyDialRef},
        'Preferences': { icon: <SettingsSuggestOutlined/>, name: 'Preferences', ref: preferencesDialActionRef},
        'Help': { icon: <HelpOutlineOutlined/>, name: 'Help', ref: helpDialActionRef},
    }

    if (devMode) {
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
                color: isDark ? 'white' : 'black' ,
                bgcolor: isDark ? 'grey' : 'white',
                '&:hover': {
                    bgcolor: isDark ? 'grey' : 'white',
                },
            }}
        >
            { (speedDialOpen) ? <CloseOutlined style={{color: 'black'}}/> : <MenuOutlined style={{color: 'black'}}/> }
            <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt='Moorhen' /> 
        </Fab>
        <ClickAwayListener onClickAway={() => { setCurrentDropdownId('-1') }}>
        <Popper open={speedDialOpen} anchorEl={speedDialRef.current} placement='bottom-start'>
            <Grow in={speedDialOpen} style={{ transformOrigin: '0 0 0' }}>
            <MenuList style={{height: height - convertRemToPx(5), width: '100%', overflowY: 'auto', direction: 'rtl'}}>
                {Object.keys(actions).map((key) => {
                const action = actions[key]
                return <MenuItem
                    ref={action.ref}
                    key={action.name}
                    className='moorhen-navbar-menu-item'
                    onClick={() => handleDialActionClick(action.name)}
                    style={{
                        backgroundColor: isDark ? (currentDropdownId === action.name ? '#a8a8a8' : 'grey') : (currentDropdownId === action.name ? '#d4d4d4' : 'white') ,
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
                <Popover className='moorhen-nav-popover' style={{maxWidth: convertViewtoPx(35, width)}}>
                    <Popover.Body>
                        { currentDropdownId === 'File' && <MoorhenFileMenu dropdownId="File" {...collectedProps} /> }
                        { currentDropdownId === 'Edit' && <MoorhenEditMenu dropdownId="Edit" {...collectedProps} /> }
                        { currentDropdownId === 'Calculate' && <MoorhenCalculateMenu dropdownId="Calculate" {...collectedProps} /> }
                        { currentDropdownId === 'Ligand' && <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} /> }
                        { currentDropdownId === 'View' && <MoorhenViewMenu dropdownId="View" {...collectedProps} /> }
                        { currentDropdownId === 'Preferences' && <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} /> }
                        { currentDropdownId === 'History' && <MoorhenHistoryMenu dropdownId="History" {...collectedProps} /> }
                        { currentDropdownId === 'Cryo' && <MoorhenCryoMenu dropdownId="Cryo" {...collectedProps} /> }
                        { currentDropdownId === 'Help' &&  <MoorhenHelpMenu dropdownId="Help" {...collectedProps} /> }
                        { currentDropdownId === 'Dev' &&  <MoorhenDevMenu dropdownId="Dev" {...collectedProps} /> }
                        { props.extraNavBarMenus && props.extraNavBarMenus.find(menu => currentDropdownId === menu.name)?.JSXElement }
                    </Popover.Body>
                </Popover>
            </Overlay>
        </Popper>
        </ClickAwayListener>
    <MoorhenModelsModal
            show={showModels}
            setShow={setShowModels}
            {...props}
    />
    <MoorhenMapsModal
            show={showMaps}
            setShow={setShowMaps}
            {...props}
    />
    {showCreateAcedrgLinkModal && 
        <MoorhenCreateAcedrgLinkModal
            width={45}
            show={showCreateAcedrgLinkModal}
            setShow={setShowCreateAcedrgLinkModal}
            {...props}
        />
    }
    {showValidation && 
        <MoorhenValidationToolsModal 
            show={showValidation}
            setShow={setShowValidation}
            {...props}
        />
    }
    {showQuerySequence &&
        <MoorhenQuerySequenceModal
            show={showQuerySequence}
            setShow={setShowQuerySequence}
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
            display: hoveredAtom.cid || busy || timeCapsuleBusy ? 'flex' : 'none',
            color: isDark ? 'grey' : 'white' ,
            bgcolor: isDark ? 'grey' : 'white',
            '&:hover': {
                bgcolor: isDark ? 'grey' : 'white',
            }
        }}
    >
        {hoveredAtom.cid && <Form.Control className='moorhen-hovered-atom-form' type="text" readOnly={true} value={`${hoveredAtom.molecule.name}:${hoveredAtom.cid}`} />}
        {busy && <Spinner className='moorhen-spinner' animation="border" variant={isDark ? 'light' : 'dark'} />}
        {timeCapsuleBusy && <SaveOutlined style={{ padding: 0, margin: 0, color: 'black' }}/>}
    </Fab>
    </>
})
