import { useState, useEffect, forwardRef } from "react";
import { IconButton, Drawer, List, Divider } from "@mui/material";
import { MoorhenToolsAccordion } from './MoorhenToolsAccordion'
import { MoorhenDisplayObjects } from './MoorhenDisplayObjects';
import { MoorhenConsole } from"./MoorhenConsole";
import { convertRemToPx, convertViewtoPx} from '../utils/MoorhenUtils';
import { ArrowBackOutlined, ArrowForwardOutlined } from '@mui/icons-material';
import { Spinner, Form } from 'react-bootstrap';

export const MoorhenSideBar = forwardRef((props, ref) => {
    const [showSideBar, setShowSideBar] = useState(false);
    const [opacity, setOpacity] = useState(0.5);
    const [consoleBodyHeight, setConsoleBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [selectedToolKey, setSelectedToolKey] = useState(null)
    const [accordionDropdownId, setAccordionDropdownId] = useState(-1)

    const sideBarWidth = Math.max(convertViewtoPx(30, props.windowWidth), convertRemToPx(24))
    const toggleDrowerButtonWidth = sideBarWidth * 0.07

    useEffect(() => {
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(30, props.windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, props.windowHeight))
        ref.current.scrollTop = ref.current.scrollHeight;
    }, [showSideBar, props.windowHeight, props.windowWidth])

    return <>
        <Drawer anchor='right' open={true} variant='persistent'
                sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    height: '100%',
                    flexShrink: 0,
                    margin: 0,
                    padding: 0,
                    '& .MuiDrawer-paper': {
                        height: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        borderTop: 0,
                        borderBottom: 0,
                        borderLeft: 0,
                        margin: 0,
                        padding: 0,
                        border: 0,
                        justifyContent:'center',
                    },
            }}>
            <IconButton onMouseOver={() => setOpacity(1)} onMouseOut={() => setOpacity(0.5)} onClick={() => {setShowSideBar(true)}} sx={{
                opacity: showSideBar ? '0.0' : opacity,
                backgroundColor: props.isDark ? 'grey' : 'white',
                height:'10%',
                width: toggleDrowerButtonWidth - 1,
                borderRadius: 0,
                borderTop: 1,
                borderBottom: 1,
                borderLeft: 1,
                margin: 0,
                padding: 0,
                ':hover': {
                    backgroundColor: props.isDark ? 'grey' : 'white',
                }
                }}>
                <ArrowBackOutlined style={{color: props.isDark ? 'white' : 'black', width: '100%'}}/>
            </IconButton>
        </Drawer>
        <Drawer
            sx={{
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                flexShrink: 0,
                margin: 0,
                padding: 0,
                '& .MuiDrawer-paper': {
                    height: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    borderTop: 0,
                    borderBottom: 0,
                    borderLeft: 0,
                    margin: 0,
                    padding: 0,
                    border: 0,
                    justifyContent:'center',
                    width: sideBarWidth + toggleDrowerButtonWidth,
                },
            }}
            variant="persistent"
            anchor="right"
            open={showSideBar}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <IconButton onClick={() => {setShowSideBar(false)}} sx={{
                opacity: opacity,
                width: toggleDrowerButtonWidth - 1,
                padding: 0,
                height:'10%',
                borderRadius: 0,
                borderTop: 1,
                borderBottom: 1,
                borderLeft: 1,
                margin: 0,
                backgroundColor: props.isDark ? 'grey' : 'white',
                ':hover': {
                    backgroundColor: props.isDark ? 'grey' : 'white',
                }
                }}>
                <ArrowForwardOutlined style={{color: props.isDark ? 'white' : 'black', width: '100%'}}/>
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
                    backgroundColor: props.isDark ? 'grey' : 'white',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                },
            }}
            variant="persistent"
            anchor="right"
            open={showSideBar}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <div style={{padding: 0, maring: 0, height: '2rem', justifyContent: 'right', display:'flex', alignContent:'center', verticalAlign:'center'}}>
                {opacity === 1 && props.hoveredAtom.cid && <Form.Control style={{ height: '2rem', width: "20rem" }} type="text" readOnly={true} value={`${props.hoveredAtom.molecule.name}:${props.hoveredAtom.cid}`} />}
                {opacity === 1 && props.busy && <Spinner animation="border" style={{ height: '2rem', marginRight: '0.5rem', marginLeft: '0.5rem' }} />}
            </div>
            <Divider></Divider>
            <List>
                <MoorhenDisplayObjects dropdownId={1} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} {...props} />
                <MoorhenToolsAccordion dropdownId={2} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
                <MoorhenConsole ref={ref} dropdownId={3} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
            </List>
        </Drawer>
    </>
})