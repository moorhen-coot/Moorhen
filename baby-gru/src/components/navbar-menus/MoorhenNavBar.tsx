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
import { MoorhenMapToolsMenu } from './MoorhenMapToolsMenu';
import { MoorhenValidationMenu } from './MoorhenValidationMenu'
import { MoorhenCalculateMenu } from './MoorhenCalculateMenu';
import { ClickAwayListener, Fab, MenuItem, IconButton, MenuList, Popper, Grow } from "@mui/material";
import { convertRemToPx, convertViewtoPx } from '../../utils/utils';
import {
    CalculateOutlined, DescriptionOutlined, EditOutlined, VisibilityOutlined,
    FactCheckOutlined, HelpOutlineOutlined, MenuOutlined, SaveOutlined, ScienceOutlined,
    SettingsSuggestOutlined, CloseOutlined, HistoryOutlined, ConstructionOutlined,
 } from '@mui/icons-material';
import { moorhen } from '../../types/moorhen';
import { useDispatch, useSelector } from 'react-redux';
import { showModal } from '../../store/modalsSlice';
import { modalKeys } from '../../utils/enums';

export interface MoorhenNavBarExtendedControlsInterface extends moorhen.CollectedProps {
    dropdownId: string;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenNavBar = forwardRef<HTMLElement, moorhen.CollectedProps>((props, ref) => {

    const [timeCapsuleBusy, setTimeCapsuleBusy] = useState<boolean>(false)
    const [busy, setBusy] = useState<boolean>(false)
    const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false)
    const [navBarActiveMenu, setNavBarActiveMenu] = useState<string>('-1')
    const [popoverTargetRef, setPopoverTargetRef] = useState()

    const speedDialRef = useRef(null)
    const fileSpeedDialActionRef = useRef(null)
    const editSpeedDialActionRef = useRef(null)
    const calcualteSpeedDialActionRef = useRef(null)
    const ligandSpeedDialActionRef = useRef(null)
    const validationSpeedDialActionRef = useRef(null)
    const modelsSpeedDialActionRef = useRef(null)
    const mapsSpeedDialActionRef = useRef(null)
    const historyDialRef = useRef(null)
    const viewDialActionRef = useRef(null)
    const preferencesDialActionRef = useRef(null)
    const mapToolsDialActionRef = useRef(null)
    const helpDialActionRef = useRef(null)
    const devDialActionRef = useRef(null)

    const dispatch = useDispatch()
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const showHoverInfo = useSelector((state: moorhen.State) => state.generalStates.showHoverInfo)

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

    const collectedProps = { setBusy, ...props }

    const navBarMenus = {
        'File': { icon: <DescriptionOutlined />, name: 'File', ref: fileSpeedDialActionRef},
        'Edit': { icon: <EditOutlined />, name: 'Edit', ref: editSpeedDialActionRef},
        'Calculate': { icon: <CalculateOutlined/>, name: 'Calculate', ref: calcualteSpeedDialActionRef},
        'View': { icon: <VisibilityOutlined/>, name: 'View', ref: viewDialActionRef},
        'Validation': { icon: <FactCheckOutlined />, name: 'Validation', ref: validationSpeedDialActionRef},
        'Ligand': { icon:  <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/pixmaps/moorhen-ligand.svg`} alt='Ligand'/>, name: 'Ligand', ref: ligandSpeedDialActionRef},
        'Map Tools': { icon: <ConstructionOutlined/>, name: 'Map Tools', ref: mapToolsDialActionRef},
        'Models': { icon: <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/pixmaps/secondary-structure-grey.svg`} alt='Model' />, name: 'Models', ref: modelsSpeedDialActionRef},
        'Maps': { icon: <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/pixmaps/map-grey.svg`} alt='Map'/>, name: 'Maps', ref: mapsSpeedDialActionRef},
        'History': {icon: <HistoryOutlined/>, name: 'History', ref: historyDialRef},
        'Preferences': { icon: <SettingsSuggestOutlined/>, name: 'Preferences', ref: preferencesDialActionRef},
        'Help': { icon: <HelpOutlineOutlined/>, name: 'Help', ref: helpDialActionRef},
    }

    if (props.extraNavBarMenus) {
        props.extraNavBarMenus.forEach(menu => {
            navBarMenus[menu.name] = menu
        })
    }

    if (props.extraNavBarModals) {
        props.extraNavBarModals.forEach(modal => {
            navBarMenus[modal.name] = modal
        })
    }

    if (devMode) {
        navBarMenus['Dev'] = { icon: <ScienceOutlined/>, name: 'Dev', ref: devDialActionRef }
    }

    let navBarMenuNames: string[] = []
    if (props.includeNavBarMenuNames.length === 0) {
        navBarMenuNames = Object.keys(navBarMenus)
    } else {
        navBarMenuNames = props.includeNavBarMenuNames
    }

    useEffect(() => {
        switch(navBarActiveMenu) {
            case "-1":
                break
            case "Models":
                dispatch(showModal(modalKeys.MODELS))
                setNavBarActiveMenu('-1')
                break
            case "Maps":
                dispatch(showModal(modalKeys.MAPS))
                setNavBarActiveMenu('-1')
                break
            default:
                const selectedExtraNavBarModal = props.extraNavBarModals.find(modal => modal.name === navBarActiveMenu)
                if (selectedExtraNavBarModal) {
                    selectedExtraNavBarModal.setShow(true)
                    setNavBarActiveMenu('-1')
                } else {
                    setPopoverTargetRef(navBarMenus[navBarActiveMenu]?.ref.current)
                }
                break
        }
    }, [navBarActiveMenu])

    const handleDialActionClick = useCallback((actionName) => {
        if (actionName === navBarActiveMenu) {
            setNavBarActiveMenu('-1')
        } else {
            setNavBarActiveMenu(actionName)
        }
    }, [navBarActiveMenu])

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
                setNavBarActiveMenu('-1')
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
            <img className='moorhen-navbar-menu-item-icon' src={`${props.urlPrefix}/pixmaps/MoorhenLogo.png`} alt='Moorhen' />
        </Fab>
        <ClickAwayListener onClickAway={() => { setNavBarActiveMenu('-1') }}>
        <Popper open={speedDialOpen} anchorEl={speedDialRef.current} placement='bottom-start'>
            <Grow in={speedDialOpen} style={{ transformOrigin: '0 0 0' }}>
            <MenuList style={{height: height - convertRemToPx(5), width: '100%', overflowY: 'auto', direction: 'rtl'}}>
                {navBarMenuNames.filter(menuName => menuName in navBarMenus).map(menuName => {
                const menu = navBarMenus[menuName]
                return <MenuItem
                    ref={menu.ref}
                    key={menu.name}
                    className='moorhen-navbar-menu-item'
                    onClick={() => handleDialActionClick(menu.name)}
                    style={{
                        backgroundColor: isDark ? (navBarActiveMenu === menu.name ? '#a8a8a8' : 'grey') : (navBarActiveMenu === menu.name ? '#d4d4d4' : 'white') ,
                    }}>
                        <Stack gap={2} direction='horizontal' style={{display: 'flex', verticalAlign: 'middle', paddingRight: '0.5rem'}}>
                            {menu.name}
                            <IconButton>
                                {menu.icon}
                            </IconButton>
                        </Stack>
                </MenuItem>
                })}
            </MenuList>
            </Grow>
            <Overlay placement='right' show={navBarActiveMenu !== '-1'} target={navBarActiveMenu !== '-1' ? popoverTargetRef : null}>
                <Popover className='moorhen-nav-popover' style={{maxWidth: convertViewtoPx(35, width)}}>
                    <Popover.Body>
                        { navBarActiveMenu === 'File' && <MoorhenFileMenu dropdownId="File" {...collectedProps} /> }
                        { navBarActiveMenu === 'Edit' && <MoorhenEditMenu dropdownId="Edit" {...collectedProps} /> }
                        { navBarActiveMenu === 'Calculate' && <MoorhenCalculateMenu dropdownId="Calculate" {...collectedProps} /> }
                        { navBarActiveMenu === 'Ligand' && <MoorhenLigandMenu dropdownId="Ligand" {...collectedProps} /> }
                        { navBarActiveMenu === 'Validation' && <MoorhenValidationMenu dropdownId="Validation" {...collectedProps} /> }
                        { navBarActiveMenu === 'View' && <MoorhenViewMenu dropdownId="View" {...collectedProps} /> }
                        { navBarActiveMenu === 'Preferences' && <MoorhenPreferencesMenu dropdownId="Preferences" {...collectedProps} /> }
                        { navBarActiveMenu === 'History' && <MoorhenHistoryMenu dropdownId="History" {...collectedProps} /> }
                        { navBarActiveMenu === 'Map Tools' && <MoorhenMapToolsMenu dropdownId="Map Tools" {...collectedProps} /> }
                        { navBarActiveMenu === 'Help' &&  <MoorhenHelpMenu dropdownId="Help" {...collectedProps} /> }
                        { navBarActiveMenu === 'Dev' &&  <MoorhenDevMenu dropdownId="Dev" {...collectedProps} /> }
                        { props.extraNavBarMenus && props.extraNavBarMenus.find(menu => navBarActiveMenu === menu.name)?.JSXElement }
                    </Popover.Body>
                </Popover>
            </Overlay>
        </Popper>
        </ClickAwayListener>

        { props.extraNavBarModals && props.extraNavBarModals.filter(modal => modal.show).map(modal => modal.JSXElement) }

        {showHoverInfo && <Fab
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
            {hoveredAtom.cid &&
            <Form.Control
                className='moorhen-hovered-atom-form'
                type="text"
                readOnly={true}
                value={`${hoveredAtom.molecule.name.length > 10 ? `${hoveredAtom.molecule.name.substring(0, 7)}...` : `${hoveredAtom.molecule.name}:`}${hoveredAtom.cid}`}
            />}
            {busy &&
            <Spinner
                className='moorhen-spinner'
                animation="border"
                variant={isDark ? 'light' : 'dark'}
            />}
            {timeCapsuleBusy &&
            <SaveOutlined
                style={{ padding: 0, margin: 0, color: 'black' }}
            />}
        </Fab>
        }
    </>
})
