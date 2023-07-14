import { forwardRef, useEffect, useState, useRef } from 'react';
import { Spinner, Form, Overlay, Popover } from 'react-bootstrap';
import { MoorhenFileMenu } from './MoorhenFileMenu';
import { MoorhenPreferencesMenu } from './MoorhenPreferencesMenu';
import { MoorhenHelpMenu } from './MoorhenHelpMenu';
import { MoorhenViewMenu } from './MoorhenViewMenu';
import { MoorhenLigandMenu } from './MoorhenLigandMenu';
import { MoorhenEditMenu } from './MoorhenEditMenu';
import { MoorhenDevMenu } from './MoorhenDevMenu';
import { MoorhenCryoMenu } from './MoorhenCryoMenu';
import { MoorhenCalculateMenu } from './MoorhenCalculateMenu';
import { MoorhenControlsInterface } from "../MoorhenContainer"
import { ClickAwayListener, Fab, SpeedDial, SpeedDialAction } from "@mui/material";
import { convertRemToPx, convertViewtoPx } from '../../utils/MoorhenUtils';
import { MoorhenModelsAndMapsModal } from '../modal/MoorhenModelsAndMapsModal';
import { MoorhenValidationToolsModal } from '../modal/MoorhenValidationToolsModal';
import { MoorhenToolkitModal } from '../modal/MoorhenToolkitModal';
import { 
    AcUnitOutlined, BiotechOutlined, CalculateOutlined, ConstructionOutlined, DescriptionOutlined, EditOutlined,
    FactCheckOutlined, HelpOutlineOutlined, MenuOutlined, SaveOutlined, ScienceOutlined, SettingsSuggestOutlined,
    ViewInArOutlined, VisibilityOutlined
 } from '@mui/icons-material';

interface MoorhenNavBarPropsInterface extends MoorhenControlsInterface {
    busy: boolean;
}

export interface MoorhenNavBarExtendedControlsInterface extends MoorhenNavBarPropsInterface {
    dropdownId: string;
    currentDropdownId: string;
    setCurrentDropdownId: React.Dispatch<React.SetStateAction<string>>;
}

export const MoorhenNavBar = forwardRef<HTMLElement, MoorhenNavBarPropsInterface>((props, ref) => {
    const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false)
    const [currentDropdownId, setCurrentDropdownId] = useState<string>('-1')
    const [showSaveIcon, setShowSaveIcon] = useState<boolean>(false)
    const [showToolkit, setShowToolkit] = useState<boolean>(false)
    const [showValidation, setShowValidation] = useState<boolean>(false)
    const [showModelsAndMaps, setShowModelsAndMaps] = useState<boolean>(false)
    const [popoverTargetRef, setPopoverTargetRef] = useState()
    const speedDialRef = useRef()
    const fileSpeedDialActionRef = useRef()
    const editSpeedDialActionRef = useRef()
    const calcualteSpeedDialActionRef = useRef()
    const ligandSpeedDialActionRef = useRef()
    const validationSpeedDialActionRef = useRef()
    const modelsAndMapsSpeedDialActionRef = useRef()
    const toolkitDialActionRef = useRef()
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

    const collectedProps = {currentDropdownId, setCurrentDropdownId, ...props}

    const actions = {
        'File': { icon: <DescriptionOutlined />, name: 'File', ref: fileSpeedDialActionRef},
        'Edit': { icon: <EditOutlined />, name: 'Edit', ref: editSpeedDialActionRef},
        'Calculate': { icon: <CalculateOutlined/>, name: 'Calculate', ref: calcualteSpeedDialActionRef},
        'Ligand': { icon: <BiotechOutlined/>, name: 'Ligand', ref: ligandSpeedDialActionRef},
        'Validation': { icon: <FactCheckOutlined />, name: 'Validation', ref: validationSpeedDialActionRef},
        'Models_&_Maps': { icon: <ViewInArOutlined />, name: 'Models_&_Maps', ref: modelsAndMapsSpeedDialActionRef},
        'Toolkit': { icon: <ConstructionOutlined/>, name: 'Toolkit', ref: toolkitDialActionRef},
        'View': { icon: <VisibilityOutlined/>, name: 'View', ref: viewDialActionRef},
        'Preferences': { icon: <SettingsSuggestOutlined/>, name: 'Preferences', ref: preferencesDialActionRef},
        'Cryo': { icon: <AcUnitOutlined/>, name: 'Cryo', ref: cryoDialActionRef},
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
            case "Toolkit":
                setShowToolkit(true)
                setCurrentDropdownId('-1')
                break
            case "Models_&_Maps":
                setShowModelsAndMaps(true)
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

    const handleSpeedDialClose = (evt, reason) => {
        if (reason === 'mouseLeave' && currentDropdownId !== '-1') {
            // pass
        } else if (reason === 'blur') { 
            // pass
        } else {
            setSpeedDialOpen(false)
            setCurrentDropdownId('-1')
        }
    }

    const handleMouseEnter = () => {
        setSpeedDialOpen(true)
    }

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
    <ClickAwayListener onClickAway={() => {
        setSpeedDialOpen(false)
        setCurrentDropdownId('-1')
    }}>
    <SpeedDial
        open={speedDialOpen}
        ariaLabel="Moorhen Navbar Speed Dial"
        direction='down'
        sx={{
            position: 'absolute', top: canvasTop + convertRemToPx(0.5), left: canvasLeft + convertRemToPx(0.5), color: props.isDark ? 'white' : 'black' ,
            "& .MuiSpeedDial-actions": {
                width: '5.5rem'
            }
        }}
        onClose={handleSpeedDialClose}
        onMouseEnter={handleMouseEnter}
        FabProps={{
            ref: speedDialRef,
            variant: 'extended',
            size: "large",
            sx: {
                bgcolor: props.isDark ? 'white' : 'grey',
                '&:hover': {
                    bgcolor: props.isDark ? 'white' : 'grey',
                }
            }
        }}
        icon={<>  <MenuOutlined/> <img src={`${props.urlPrefix}/baby-gru/pixmaps/MoorhenLogo.png`} alt='Moorhen' style={{height: '1.6rem', marginRight: '0.3rem', marginLeft: '0.3rem'}} /> </>}
    >
        {Object.keys(actions).map((key) => {
            const action = actions[key]
            return <SpeedDialAction
                ref={action.ref}
                key={action.name}
                tooltipOpen={currentDropdownId === '-1'}
                tooltipPlacement='right'
                icon={action.icon}
                FabProps={{
                    sx: {
                        backgroundColor: currentDropdownId === action.name ? '#d4d4d4' : 'white' 
                    }
                }}
                tooltipTitle={currentDropdownId === '-1' ? action.name : ''}
                onClick={() => setCurrentDropdownId(action.name)}
            />
        })}
        <Overlay placement='right' show={currentDropdownId !== '-1'} target={currentDropdownId !== '-1' ? popoverTargetRef : null}>
            <Popover style={{marginLeft: '3rem', maxWidth: convertViewtoPx(35, props.windowWidth), overflowX: 'auto', borderRadius: '1.5rem'}}>
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
    </SpeedDial>
    </ClickAwayListener>
    <MoorhenModelsAndMapsModal
            show={showModelsAndMaps}
            setShow={setShowModelsAndMaps}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
        />
    {showValidation && 
        <MoorhenValidationToolsModal 
            show={showValidation}
            setShow={setShowValidation}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
        />
    }
    {showToolkit &&
        <MoorhenToolkitModal
            show={showToolkit}
            setShow={setShowToolkit}
            windowHeight={props.windowHeight}
            windowWidth={props.windowWidth}
            {...props}
        />
    }
    <Fab
        variant='extended'
        size="large"
        sx={{
            position: 'absolute',
            top: canvasTop + convertRemToPx(0.5),
            right: canvasLeft + convertRemToPx(0.5),
            display: props.hoveredAtom.cid || props.busy || showSaveIcon ? 'flex' : 'none',
            color: props.isDark ? 'white' : 'grey' ,
            bgcolor: props.isDark ? 'white' : 'grey',
            '&:hover': {
                bgcolor: props.isDark ? 'white' : 'grey',
            }
        }}
    >
        {props.hoveredAtom.cid && <Form.Control style={{ height: '2rem', width: "20rem" }} type="text" readOnly={true} value={`${props.hoveredAtom.molecule.name}:${props.hoveredAtom.cid}`} />}
        {props.busy && <Spinner animation="border" variant={props.isDark ? 'dark' : 'light'} style={{ height: '2rem', marginRight: '0.5rem', marginLeft: '0.5rem' }} />}
        {showSaveIcon && <SaveOutlined style={{padding: 0, margin: 0}}/>}
    </Fab>
    </>
})
