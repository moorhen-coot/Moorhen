import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from '../../types/moorhen';
import { webGL } from '../../types/mgWebGL';
import { MoorhenNotification } from './MoorhenNotification';
import { Stack } from 'react-bootstrap';
import { CloseOutlined, PeopleAltOutlined, ShareLocationOutlined, ShareOutlined, SwapVertOutlined } from '@mui/icons-material';
import { Box, Fade, IconButton, Popper, Badge, Slide, Avatar } from '@mui/material';
import { guid } from '../../utils/MoorhenUtils';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenFetchOnlineSourcesForm, setNotificationContent } from '../../moorhen';
import { MoorhenFleetManager } from '../../utils/MoorhenFleetManager'

export const MoorhenSharedSessionManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    sessionId?: string;
}) => {

    const dispatch = useDispatch()

    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)

    const [userCount, setUserCount] = useState<number>(0)
    const [showPopper, setShowPopper] = useState<boolean>(false)
    const [showUserPopper, setShowUserPopper] = useState<boolean>(false)
    const [followClient, setFollowClient] = useState<string>('')

    const connectedUsersDivRef = useRef<null | HTMLDivElement>(null)
    const notificationDivRef = useRef(null)
    const moorhenFleetManagerRef = useRef(
        new MoorhenFleetManager(props.moleculesRef, props.mapsRef, props.commandCentre, props.glRef)
    )

    const pushViewUpdate = useCallback(() => {
        if (moorhenFleetManagerRef.current.isConnected) {
            moorhenFleetManagerRef.current.pushViewUpdate()
        } 
    }, [])

    useEffect(() => {
        document.addEventListener("originUpdate", pushViewUpdate);
        return () => {
            document.removeEventListener("originUpdate", pushViewUpdate);
        }
    }, [pushViewUpdate])

    useEffect(() => {
        if (moorhenFleetManagerRef.current.isConnected && hoveredAtom.molecule && hoveredAtom.cid) {
            moorhenFleetManagerRef.current.pushHoveredAtomUpdate(hoveredAtom)
        }
    }, [hoveredAtom])

    useEffect(() => {
        const pushMoleculeUpdate = async (molNo: number) => {
            const molecule = molecules.find(item => item.molNo === molNo)
            if (molecule) {
                moorhenFleetManagerRef.current.pushMoleculeUpdate(molecule)
            }
        }
        pushMoleculeUpdate(updateMolNo)
    }, [updateSwitch])

    useEffect(() => {
        if (!moorhenFleetManagerRef.current?.isConnected) {

            moorhenFleetManagerRef.current.joinSession(props.sessionId ? props.sessionId : guid())

            // Create event listeners
            moorhenFleetManagerRef.current.molecules.observe(moorhenFleetManagerRef.current.handleMoleculeUpdates.bind(moorhenFleetManagerRef.current))
            moorhenFleetManagerRef.current.hoveredAtoms.observe(moorhenFleetManagerRef.current.handleAtomHovering.bind(moorhenFleetManagerRef.current))
            moorhenFleetManagerRef.current.view.observe(moorhenFleetManagerRef.current.handleViewUpdate.bind(moorhenFleetManagerRef.current))
            moorhenFleetManagerRef.current.connectedClients.observe((evt) => {
                const userCount = moorhenFleetManagerRef.current.handleUserUpdate(evt)
                setUserCount(userCount)
            })
            setUserCount(moorhenFleetManagerRef.current.connectedClients.size)
        } else {
            console.warn('Doing nothing as you are already connected...')
        }

    }, [])

    const handleDisconnect = useCallback(() => {
        if (moorhenFleetManagerRef.current.isConnected) {
            moorhenFleetManagerRef.current.handleDisconect()
            document.removeEventListener("originUpdate", pushViewUpdate)
            dispatch(setNotificationContent(null))
        } else {
            console.warn(`Cannot disconnect if currently not in a shared session. Doing nothing...`)
        }
    }, [pushViewUpdate])

    const handleCopySessionId = () => {
        navigator.clipboard.writeText(moorhenFleetManagerRef.current.sessionToken)
        setShowPopper(true)
        setTimeout(() => setShowPopper(false), 2000)
    }

    return  <MoorhenNotification width={18}>
            <Stack ref={notificationDivRef} gap={1} direction="vertical">
                <Stack gap={1} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'space-between'}}>
                    <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center'}}>
                        <SwapVertOutlined style={{color: 'red', borderRadius: '30px', borderWidth: 0, borderStyle: 'hidden'}} className="moorhen-recording-icon"/>
                    </div>
                        <IconButton onClick={() => setShowUserPopper((prev) => !prev)}>
                            <Badge color="info" badgeContent={userCount - 1}>
                                <PeopleAltOutlined/>
                            </Badge>
                        </IconButton>
                        <IconButton onClick={handleCopySessionId}>
                            <ShareOutlined/>
                        </IconButton>
                        <IconButton onClick={handleDisconnect}>
                            <CloseOutlined/>
                        </IconButton>
                        <Popper id="transition-popper" open={showPopper} anchorEl={notificationDivRef.current} placement='bottom' transition>
                            {({ TransitionProps }) => (
                            <Fade {...TransitionProps} timeout={350}>
                                <Box sx={{ borderStyle: 'hidden', width: '17rem', color: 'grey', margin: '1rem', display: 'flex', justifyContent: 'center'}}>
                                    Session token copied to clipboard
                                </Box>
                            </Fade>
                            )}
                        </Popper>
                </Stack>
                <div ref={connectedUsersDivRef} style={{display: showUserPopper ? 'flex' : 'none', justifyContent: 'center'}}>
                    <Slide in={showUserPopper} timeout={350} container={connectedUsersDivRef.current}>
                        <Box style={{ width: '100%' }}>
                            {moorhenFleetManagerRef.current?.connectedClients?.size > 0 &&
                            moorhenFleetManagerRef.current.getClientList().map(item => {
                                return  <Stack gap={1} direction='horizontal' style={{ justifyContent: 'space-evenly', width: '100%' }}>
                                            <Avatar sx={{ bgcolor: item.hexColor, height: '35px', width: '35px'}} key={item.id}>
                                                <img style={{width: '25px', height: '20px'}} className='moorhen-navbar-menu-item-icon' src={`./baby-gru/pixmaps/MoorhenLogo.png`} alt='user' /> 
                                            </Avatar>
                                            <span>{item.name}</span>
                                            <IconButton onClick={() => {
                                                followClient === item.id ? moorhenFleetManagerRef.current.setFollowViewClient(null) : moorhenFleetManagerRef.current.setFollowViewClient(item.id)
                                                setFollowClient(followClient === item.id ? null : item.id)
                                            }}>
                                                <ShareLocationOutlined
                                                    className={followClient === item.id ? "moorhen-blinking-icon" : ""}
                                                    style={{ borderWidth: 0, borderRadius: '30px', borderStyle: 'hidden', color: followClient === item.id ? 'black': 'grey'}}/>
                                            </IconButton>
                                        </Stack>
                            })
                            }
                        </Box>
                    </Slide>
                </div>
            </Stack>
            </MoorhenNotification>
}