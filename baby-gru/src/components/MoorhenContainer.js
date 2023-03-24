import { useEffect, useCallback } from 'react';
import { Container, Col, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { MoorhenWebMG } from './MoorhenWebMG';
import { MoorhenCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/MoorhenUtils';
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { MoorhenButtonBar } from './MoorhenButtonBar';
import { Backdrop } from "@mui/material";
import { babyGruKeyPress } from '../utils/MoorhenKeyboardAccelerators';
import { MoorhenSideBar } from './MoorhenSideBar';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenNavBar } from "./MoorhenNavBar"
import './MoorhenContainer.css'

export const MoorhenContainer = (props) => {
    const {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        consoleDivRef, lastHoveredAtom, prevActiveMoleculeRef, preferences, activeMap, 
        setActiveMap, activeMolecule, setActiveMolecule, hoveredAtom, setHoveredAtom,
        consoleMessage, setConsoleMessage, cursorStyle, setCursorStyle, busy, setBusy,
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, commandHistory, 
        dispatchHistoryReducer, molecules, changeMolecules, maps, changeMaps, exportCallback,
        backgroundColor, setBackgroundColor, currentDropdownId, setCurrentDropdownId,
        appTitle, setAppTitle, cootInitialized, setCootInitialized, theme, setTheme,
        showToast, setShowToast, toastContent, setToastContent, showColourRulesToast,
        setShowColourRulesToast, disableFileUploads, urlPrefix, viewOnly, extraNavBarMenus,
        monomerLibraryPath, forwardControls, extraFileMenus
    } = props
    
    const innerWindowMarginWidth = convertRemToPx(1)

    const setWindowDimensions = () => {
        setWindowWidth(window.innerWidth)
        setWindowHeight(window.innerHeight)
    }

    //The purpose here is to return the functions that define and control MoorhenContainer state to a 
    //containing React component
    useEffect(() => {
        if (cootInitialized && forwardControls) {
            forwardControls(collectedProps)
            timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, preferences)
            timeCapsuleRef.current.maxBackupCount = preferences.maxBackupCount
            timeCapsuleRef.current.modificationCountBackupThreshold = preferences.modificationCountBackupThreshold
        }
    }, [cootInitialized, forwardControls])
    
    useEffect(() => {
        if (preferences.isMounted && preferences.defaultBackgroundColor !== backgroundColor) {
            setBackgroundColor(preferences.defaultBackgroundColor)
        }
        
    }, [preferences.isMounted])

    useEffect(() => {
        if (!preferences.isMounted) {
            return
        }
        
        let head = document.head;
        let style = document.createElement("link");
        const isDark = isDarkBackground(...backgroundColor)

        if (isDark) {
            style.href = `${urlPrefix}/baby-gru/darkly.css`
            setTheme("darkly")
        } else {
            style.href = `${urlPrefix}/baby-gru/flatly.css`
            setTheme("flatly")
        }
        
        if (preferences.defaultBackgroundColor !== backgroundColor) {
            preferences.setDefaultBackgroundColor(backgroundColor)
        }

        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }


    }, [backgroundColor])

    useEffect(() => {
        async function setMakeBackupsAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_make_backups',
                commandArgs: [preferences.makeBackups],
                returnType: "status"
            })
        }

        if (commandCentre.current && preferences.makeBackups !== null && cootInitialized) {
            setMakeBackupsAPI()
        }

    }, [preferences.makeBackups, cootInitialized])

    useEffect(() => {
        async function setDrawMissingLoopAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_draw_missing_residue_loops',
                commandArgs: [preferences.drawMissingLoops],
                returnType: "status"
            })
        }

        if (commandCentre.current && preferences.drawMissingLoops !== null && cootInitialized) {
            setDrawMissingLoopAPI()
        }

    }, [preferences.drawMissingLoops, cootInitialized])

    useEffect(() => {
        commandCentre.current = new MoorhenCommandCentre({
            onConsoleChanged: (newMessage) => {
                setConsoleMessage(newMessage)
            },
            onActiveMessagesChanged: (newActiveMessages) => {
                setBusy(newActiveMessages.length !== 0)
            },
            onNewCommand: (newCommand) => {
                dispatchHistoryReducer({ action: "add", command: newCommand })
            },
            onCootInitialized: () => {
                setCootInitialized(true)
            },
            urlPrefix: urlPrefix
        })
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
            commandCentre.current.unhook()
        }
    }, [])

    useEffect(() => {
        if(consoleDivRef.current !== null) {
            consoleDivRef.current.scrollTop = consoleDivRef.current.scrollHeight;
        }
    }, [consoleMessage])

    const onAtomHovered = useCallback(identifier => {
        if (identifier == null) {
            if (lastHoveredAtom.current !== null && lastHoveredAtom.current.molecule !== null) {
                setHoveredAtom({ molecule: null, cid: null })
            }
        }
        else {
            molecules.forEach(molecule => {
                if (molecule.buffersInclude(identifier.buffer)) {
                    if (molecule !== hoveredAtom.molecule || identifier.atom.label !== hoveredAtom.cid) {
                        setHoveredAtom({ molecule: molecule, cid: identifier.atom.label })
                    }
                }
            })
        }
    }, [molecules])

    useEffect(() => {
        if (toastContent) setShowToast(true)
    }, [toastContent])

    //Make this so that the keyPress returns true or false, depending on whether mgWebGL is to continue processing event
    const onKeyPress = useCallback(event => {
        return babyGruKeyPress(event, collectedProps, JSON.parse(preferences.shortCuts))
    }, [molecules, activeMolecule, activeMap, hoveredAtom, viewOnly, preferences])

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (lastHoveredAtom.current == null ||
                hoveredAtom.molecule !== lastHoveredAtom.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtom.current.cid
            ) {
                hoveredAtom.molecule.drawHover(glRef, hoveredAtom.cid)
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (lastHoveredAtom.current !== null &&
            lastHoveredAtom.current.molecule !== null &&
            lastHoveredAtom.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtom.current.molecule.clearBuffersOfStyle("hover", glRef)
        }

        lastHoveredAtom.current = hoveredAtom
    }, [hoveredAtom])

    useEffect(() => {
        glResize()
    }, [windowHeight, windowWidth])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            commandCentre.current.cootCommand({
                returnType: "status",
                command: "set_imol_refinement_map",
                commandArgs: [activeMap.molNo]
            })
        }
    }, [activeMap])

    useEffect(() => {
        function resetActiveGL() {
            prevActiveMoleculeRef.current = activeMolecule;
            if (activeMolecule)
                glRef.current.setActiveMolecule(activeMolecule)
            else
                glRef.current.setActiveMolecule(null)
        }
        if (prevActiveMoleculeRef.current) {
            prevActiveMoleculeRef.current.applyTransform(glRef)
                .then(response => {
                    resetActiveGL()
                })
        } else {
            resetActiveGL()
        }
    }, [activeMolecule])

    const glResize = () => {
        glRef.current.resize(webGLWidth(), webGLHeight())
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        return windowWidth
    }

    const webGLHeight = () => {
        return windowHeight - (viewOnly ? 0: convertRemToPx(2.2))
    }

    const isDark = isDarkBackground(...backgroundColor)

    const collectedProps = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandHistory, commandCentre, backgroundColor, setBackgroundColor, toastContent, 
        setToastContent, currentDropdownId, setCurrentDropdownId, hoveredAtom, setHoveredAtom, showToast, setShowToast,
        windowWidth, windowHeight, innerWindowMarginWidth, showColourRulesToast, timeCapsuleRef, setShowColourRulesToast, 
        isDark, exportCallback, disableFileUploads, urlPrefix, viewOnly, extraNavBarMenus, monomerLibraryPath, moleculesRef, 
        extraFileMenus, mapsRef, ...preferences
    }

    return <> 
    <div>
        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        {!viewOnly && <MoorhenNavBar {...collectedProps} busy={busy}/>}
        
    </div>
    
    <Container fluid className={`baby-gru ${theme}`}>
        <Row>
            <Col style={{ paddingLeft: '0', paddingRight: '0' }}>
                <div
                    style={{
                        backgroundColor: `rgba(
                            ${255 * backgroundColor[0]},
                            ${255 * backgroundColor[1]},
                            ${255 * backgroundColor[2]}, 
                            ${backgroundColor[3]})`,
                        cursor: cursorStyle, margin: 0, padding: 0, height: Math.floor(webGLHeight()),
                    }}>
                    <MoorhenWebMG
                        ref={glRef}
                        timeCapsuleRef={timeCapsuleRef}
                        commandCentre={commandCentre}
                        molecules={molecules}
                        changeMolecules={changeMolecules}
                        maps={maps}
                        changeMaps={changeMaps}
                        width={webGLWidth}
                        height={webGLHeight}
                        backgroundColor={backgroundColor}
                        setBackgroundColor={setBackgroundColor}
                        isDark={isDark}
                        atomLabelDepthMode={preferences.atomLabelDepthMode}
                        clipCap={preferences.clipCap}
                        onAtomHovered={onAtomHovered}
                        onKeyPress={onKeyPress}
                        hoveredAtom={hoveredAtom}
                        preferences={preferences}
                        setShowColourRulesToast={setShowColourRulesToast}
                        showColourRulesToast={showColourRulesToast}
                        windowHeight={windowHeight}
                        windowWidth={windowWidth}
                        urlPrefix={urlPrefix}
                        activeMap={activeMap}
                        viewOnly={viewOnly}
                        drawInteractions={preferences.drawInteractions}
                    />
                </div>
                {!viewOnly && <MoorhenButtonBar {...collectedProps} />}
            </Col>
            {!viewOnly && <MoorhenSideBar {...collectedProps} busy={busy} consoleMessage={consoleMessage} ref={consoleDivRef} />}
        </Row>
        <ToastContainer style={{ marginTop: "5rem" }} position='top-center' >
            <Toast bg='light' onClose={() => setShowToast(false)} autohide={true} delay={4000} show={showToast} style={{overflowY: 'scroll', maxHeight: convertViewtoPx(80, webGLHeight())}}>
                <Toast.Header closeButton={false} style={{justifyContent:'center'}}>
                    {toastContent}
                </Toast.Header>
            </Toast>
        </ToastContainer>
    </Container>
    </>
}

MoorhenContainer.defaultProps = {
    urlPrefix: '.',
    monomerLibraryPath: './baby-gru/monomers',
    exportCallback: null,
    disableFileUploads: false,
    extraNavBarMenus: [],
    extraFileMenus: [],
    viewOnly: false
}
