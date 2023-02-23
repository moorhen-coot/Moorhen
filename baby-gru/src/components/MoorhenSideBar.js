import { useState, useEffect, forwardRef } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenAutofitRotamerButton, MoorhenFlipPeptideButton, MoorhenSideChain180Button, MoorhenAddTerminalResidueDirectlyUsingCidButton,
        MoorhenEigenFlipLigandButton, MoorhenJedFlipFalseButton, MoorhenJedFlipTrueButton, MoorhenConvertCisTransButton, MoorhenAddSimpleButton,
        MoorhenRefineResiduesUsingAtomCidButton, MoorhenDeleteUsingCidButton, MoorhenMutateButton, MoorhenRotateTranslateZoneButton,
        MoorhenAddAltConfButton, MoorhenRigidBodyFitButton } from "./MoorhenSimpleEditButton"
import { IconButton, Drawer, Divider } from "@mui/material";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@mui/icons-material";
import { MoorhenToolsAccordion } from './MoorhenToolsAccordion'
import { Container, Accordion, Col, Row, Spinner, Form, Toast, ToastContainer, Stack } from 'react-bootstrap';
import { MoorhenDisplayObjects } from './MoorhenDisplayObjects';
import { MoorhenCommandCentre, convertRemToPx, convertViewtoPx } from '../utils/MoorhenUtils';
import { ArrowBackOutlined, ArrowForwardOutlined } from '@mui/icons-material';
import { MoorhenHistoryMenu, historyReducer, initialHistoryState } from './MoorhenHistoryMenu';


export const MoorhenSideBar = forwardRef((props, ref) => {
    const [showDrawer, setShowDrawer] = useState(false);
    const [opacity, setOpacity] = useState(0.5);
    const [displayObjectsAccordionBodyHeight, setDisplayObjectsAccordionBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [toolAccordionBodyHeight, setToolAccordionBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [sequenceViewerBodyHeight, setSequenceViewerBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [consoleBodyHeight, setConsoleBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [accordionHeight, setAccordionHeight] = useState(convertViewtoPx(90, props.windowHeight))
    const [selectedToolKey, setSelectedToolKey] = useState(null)
    const sideBarWidth = convertViewtoPx(30, props.windowWidth)

    const innerWindowMarginHeight = convertRemToPx(0)
    const innerWindowMarginWidth = convertRemToPx(1)

    const getAccordionHeight = () => {
        return props.windowHeight - innerWindowMarginHeight
    }

    useEffect(() => {
        setAccordionHeight(getAccordionHeight())
        displayObjectsAccordionBodyHeight !== 0 ? setDisplayObjectsAccordionBodyHeight(convertViewtoPx(60, props.windowHeight)) : setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, props.windowHeight))
        toolAccordionBodyHeight !== 0 ? setToolAccordionBodyHeight(convertViewtoPx(70, props.windowHeight)) : setToolAccordionBodyHeight(convertViewtoPx(0, props.windowHeight))
        sequenceViewerBodyHeight !== 0 ? setSequenceViewerBodyHeight(convertViewtoPx(30, props.windowHeight)) : setSequenceViewerBodyHeight(convertViewtoPx(0, props.windowHeight))
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(30, props.windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, props.windowHeight))
        ref.current.scrollTop = ref.current.scrollHeight;
    }, [showDrawer, props.windowHeight, props.windowWidth])

    return <>
        <Drawer anchor='right' open={true} variant='persistent'
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
                sx={{
                opacity: showDrawer ? '0.0' : opacity,
                height: '100%',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    height: '100%',
                    boxSizing: 'border-box',
                },
            }}>
            <IconButton onClick={() => {setShowDrawer(true)}} sx={{opacity: showDrawer ? '0.0' : opacity}}>
                <ArrowBackOutlined />
            </IconButton>
        </Drawer>
        <Drawer
            sx={{
                opacity: opacity,
                height: '100%',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    height: '100%',
                    boxSizing: 'border-box',
                },
            }}
            variant="persistent"
            anchor="right"
            open={showDrawer}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <IconButton onClick={() => {setShowDrawer(false)}} sx={{opacity: opacity}}>
                <ArrowForwardOutlined />
            </IconButton>
            <Accordion className='side-bar-accordion scroller' style={{ height: props.accordionHeight, overflowY: 'scroll' }}
                        alwaysOpen={true}
                        defaultActiveKey={''}
                        onSelect={(openPanels) => {
                            setDisplayObjectsAccordionBodyHeight(convertViewtoPx(0, props.windowHeight))
                            setToolAccordionBodyHeight(convertViewtoPx(0, props.windowHeight))
                            setSequenceViewerBodyHeight(convertViewtoPx(0, props.windowHeight))
                            setConsoleBodyHeight(convertViewtoPx(0, props.windowHeight))
                            if (!openPanels) {
                                return
                            }
                            if (openPanels.includes('showDisplayObjects')) {
                                setDisplayObjectsAccordionBodyHeight(convertViewtoPx(60, props.windowHeight))
                            }
                            if (openPanels.includes('showTools')) {
                                setToolAccordionBodyHeight(convertViewtoPx(70, props.windowHeight))
                            }
                            if (openPanels.includes('showSequenceViewer')) {
                                setSequenceViewerBodyHeight(convertViewtoPx(30, props.windowHeight))
                            }
                            if (openPanels.includes('showConsole')) {
                                setConsoleBodyHeight(convertViewtoPx(30, props.windowHeight))
                            }
                        }}>
                        <Accordion.Item eventKey="showDisplayObjects" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Header style={{ padding: '0', margin: '0', height: '4rem' }}>Models and maps</Accordion.Header>
                            <Accordion.Body className='side-bar-accordion-body scroller' style={{ overflowY: 'auto', height: displayObjectsAccordionBodyHeight, padding: '0.5rem' }}>
                                {props.molecules.length === 0 && props.maps.length === 0 ? "No data files loaded" : <MoorhenDisplayObjects {...props} />}
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showTools" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                                <Accordion.Button id='tools-accordion-button'>
                                    Tools
                                </Accordion.Button>
                            <Accordion.Body style={{ height: toolAccordionBodyHeight, padding: '0', margin: '0', }}>
                                <MoorhenToolsAccordion {...props} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey}/>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="showConsole" style={{ width: sideBarWidth, padding: '0', margin: '0' }} >
                            <Accordion.Button id='console-accordion-button'>
                                Console
                            </Accordion.Button>
                            <Accordion.Body style={{ height: consoleBodyHeight }}>
                                <div ref={ref} style={{
                                    overflowY: "scroll",
                                    height: '100%',
                                    textAlign: "left"
                                }}>
                                    <pre>{props.consoleMessage}
                                    </pre>
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
        </Drawer>
    </>
})