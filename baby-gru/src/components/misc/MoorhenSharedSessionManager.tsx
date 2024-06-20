import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from '../../types/moorhen';
import { webGL } from '../../types/mgWebGL';
import { MoorhenNotification } from './MoorhenNotification';
import { Stack } from 'react-bootstrap';
import { CloseOutlined, LocationOffOutlined, LocationOnOutlined, PeopleAltOutlined, ShareLocationOutlined, ShareOutlined, SwapVertOutlined } from '@mui/icons-material';
import { Box, Fade, IconButton, Popper, Badge, Slide, Avatar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenMolecule } from '../../utils/MoorhenMolecule';
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenFleetManager } from '../../utils/MoorhenFleetManager'
import { setSharedSessionToken, setShowSharedSessionManager } from "../../store/sharedSessionSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { addMap, emptyMaps } from '../../store/mapsSlice';
import { emptyMolecules } from '../../store/moleculesSlice';
import { setActiveMap } from "../../store/generalStatesSlice";

export const MoorhenSharedSessionManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    moleculesRef: React.RefObject<moorhen.Molecule[]>;
    mapsRef: React.RefObject<moorhen.Map[]>;
    activeMapRef: React.RefObject<moorhen.Map>;
    monomerLibrary: string;
}) => {

    const dispatch = useDispatch()

    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const sessionToken = useSelector((state: moorhen.State) => state.sharedSession.sharedSessionToken)
    const showSharedSessionManager = useSelector((state: moorhen.State) => state.sharedSession.showSharedSessionManager)

    const [userCount, setUserCount] = useState<number>(0)
    const [showPopper, setShowPopper] = useState<boolean>(false)
    const [showUserPopper, setShowUserPopper] = useState<boolean>(false)
    const [viewFollowers, setViewFollowers] = useState<string[]>([])
    const [followClient, setFollowClient] = useState<string>('')

    const connectedUsersDivRef = useRef<null | HTMLDivElement>(null)
    const notificationDivRef = useRef(null)
    const moorhenFleetManagerRef = useRef(
        new MoorhenFleetManager(props.moleculesRef, props.mapsRef, props.activeMapRef, props.commandCentre, props.glRef)
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
        if (moorhenFleetManagerRef.current?.isConnected) {
            pushMoleculeUpdate(updateMolNo)
        }
    }, [updateSwitch])

    const syncInitialData = useCallback(async () => {
        if (moorhenFleetManagerRef.current.connectedClients.size > 1) {
            // If we are not the first in this session, then lets's sync our data to the current state...
            dispatch( emptyMaps() )
            dispatch( emptyMolecules() )
            await Promise.all([
                ...molecules.map(molecule => molecule.delete()),
                ...maps.map(map => map.delete())
            ])
            await props.commandCentre.current?.cootCommand({
                command: 'clear',
                commandArgs: [ ],
                returnType: 'status'
            }, false)
            try {
                const moleculeMolNos = Array.from(moorhenFleetManagerRef.current.molecules.keys())
                const mapMolNos = Array.from(moorhenFleetManagerRef.current.maps.keys())
                const sortedMolNos = [...moleculeMolNos.map(item => parseInt(item)), ...mapMolNos.map(item => parseInt(item))].sort((a, b) => a - b)
                // TODO: Before this loop we need a function to increase the imol to the desired current value...
                for (let molNo of sortedMolNos) {
                    if (moleculeMolNos.includes(molNo.toString())) {
                        const molecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibrary)
                        const moleculeData = moorhenFleetManagerRef.current.molecules.get(molNo.toString())
                        await molecule.loadToCootFromString(moleculeData.coordData, `${moleculeData.molName}.${moleculeData.format}`)
                        molecule.name = moleculeData.molName
                        if (molecule.molNo === molNo) {
                            await molecule.fetchIfDirtyAndDraw(molecule.atomCount >= 50000 ? 'CRs' : 'CBs')
                            await molecule.centreOn('/*/*/*/*', true)
                            dispatch(addMolecule(molecule))
                        } else {
                            molecule.delete()
                            throw new Error(`Failed to create molecule with desired imol ${molNo} when joining session...`)
                        }
                    } else {
                        const map = new MoorhenMap(props.commandCentre, props.glRef)
                        const mapData = moorhenFleetManagerRef.current.maps.get(molNo.toString())
                        await map.loadToCootFromMapData(mapData.mapData, `${mapData.mapName}.map`, mapData.isDiff)
                        map.name = mapData.mapName
                        if (map.molNo === molNo) {
                            dispatch(addMap(map))
                            if (mapData.isActiveMap) {
                                dispatch(setActiveMap(map))
                            }
                        } else {
                            map.delete()
                            throw new Error(`Failed to create map with desired imol ${molNo} when joining session...`)
                        }
                    }
                }    
            } catch (err) {
                console.warn(err)
                dispatch(setShowSharedSessionManager(false))
                moorhenFleetManagerRef.current.setIsConnected(false)
            }
        } else {
            // If we are the first in this session then we need to push the current state of molecules and maps
            await Promise.all(
                molecules.map(molecule => moorhenFleetManagerRef.current.pushMoleculeUpdate(molecule))
            )
            await Promise.all(
                maps.map(map => moorhenFleetManagerRef.current.pushMapUpdate(map))
            )
        }
    }, [maps, molecules])

    const joinSession = useCallback(() => {
        moorhenFleetManagerRef.current.joinSession(sessionToken)

        // Create event listeners
        moorhenFleetManagerRef.current.locks.observe(moorhenFleetManagerRef.current.handleLockUpdate.bind(moorhenFleetManagerRef.current))
        moorhenFleetManagerRef.current.molecules.observe(moorhenFleetManagerRef.current.handleMoleculeUpdates.bind(moorhenFleetManagerRef.current))
        moorhenFleetManagerRef.current.hoveredAtoms.observe(moorhenFleetManagerRef.current.handleAtomHovering.bind(moorhenFleetManagerRef.current))
        moorhenFleetManagerRef.current.view.observe(moorhenFleetManagerRef.current.handleViewUpdate.bind(moorhenFleetManagerRef.current))
        moorhenFleetManagerRef.current.viewFollowers.observe((evt) =>{
            const viewFollowers = moorhenFleetManagerRef.current.viewFollowers.toArray()
            setViewFollowers(viewFollowers)
        })
        moorhenFleetManagerRef.current.connectedClients.observe((evt) => {
            const userCount = moorhenFleetManagerRef.current.handleUserUpdate(evt)
            setUserCount(userCount)
        })
        
        // Set states
        setUserCount(moorhenFleetManagerRef.current.connectedClients.size)
        dispatch(setShowSharedSessionManager(true))
        
        // Need to do this after a timeout because otherwise data is not up to date
        setTimeout(syncInitialData, 500)
    
    }, [sessionToken, syncInitialData])

    useEffect(() => {
        if (!sessionToken) {
            // pass
        } else if (!moorhenFleetManagerRef.current?.isConnected) {
            joinSession()
        } else {
            console.warn('Doing nothing as you are already connected...')
        }
    }, [sessionToken])

    const handleDisconnect = useCallback(() => {
        if (moorhenFleetManagerRef.current?.isConnected) {
            moorhenFleetManagerRef.current.handleDisconect()
            document.removeEventListener("originUpdate", pushViewUpdate)
            dispatch(setShowSharedSessionManager(false))
            dispatch(setSharedSessionToken(null))
        } else {
            console.warn(`Cannot disconnect if currently not in a shared session. Doing nothing...`)
        }
    }, [pushViewUpdate])

    const handleCopySessionId = () => {
        navigator.clipboard.writeText(moorhenFleetManagerRef.current.sessionToken)
        setShowPopper(true)
        setTimeout(() => setShowPopper(false), 2000)
    }

    return !showSharedSessionManager ? <></> :
        <MoorhenNotification width={20} maxHeight={20}>
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
                            {moorhenFleetManagerRef.current?.connectedClients?.size > 1 ?
                            moorhenFleetManagerRef.current.getClientList().map(item => {
                                return  <Stack key={item.id} gap={1} direction='horizontal' style={{ justifyContent: 'space-between', width: '100%' }}>
                                            <Stack gap={1} direction='horizontal' style={{display: 'flex'}}>
                                                <Avatar sx={{ bgcolor: item.hexColor, height: '35px', width: '35px'}} key={item.id}>
                                                    <img style={{width: '25px', height: '20px'}} className='moorhen-navbar-menu-item-icon' src={`./pixmaps/MoorhenLogo.png`} alt='user' /> 
                                                </Avatar>
                                                <span>{item.name}</span>
                                            </Stack>
                                            {viewFollowers.includes(item.id) ?
                                                <ShareLocationOutlined
                                                    className="moorhen-blinking-icon"
                                                    style={{ 
                                                        marginRight: '0.5rem',
                                                        borderWidth: 0,
                                                        borderRadius: '30px',
                                                        borderStyle: 'hidden',
                                                        color: 'black'
                                                }}/>
                                                :
                                                <IconButton onClick={() => {
                                                    setFollowClient((prev) => {
                                                        if (prev === item.id) {
                                                            moorhenFleetManagerRef.current.setFollowViewClient(null)
                                                            return null
                                                        } else {
                                                            moorhenFleetManagerRef.current.setFollowViewClient(item.id)
                                                            return item.id
                                                        }
                                                    })
                                                }}>
                                                    {followClient !== item.id ? 
                                                    <LocationOnOutlined style={{ 
                                                        borderWidth: 0,
                                                        borderRadius: '30px',
                                                        borderStyle: 'hidden',
                                                        color: 'grey'
                                                    }}/>
                                                    :
                                                    <LocationOffOutlined style={{ 
                                                        borderWidth: 0,
                                                        borderRadius: '30px',
                                                        borderStyle: 'hidden',
                                                        color: 'black'
                                                    }}/>
                                                    }
                                                </IconButton>    
                                            }
                                        </Stack>
                            })
                            :
                            <div><span>It's only you here...</span></div>}
                        </Box>
                    </Slide>
                </div>
            </Stack>
        </MoorhenNotification>
}