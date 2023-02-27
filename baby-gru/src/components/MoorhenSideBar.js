import { useState, useEffect, forwardRef } from "react";
import { IconButton, Drawer, Divider, List } from "@mui/material";
import { MoorhenToolsAccordion } from './MoorhenToolsAccordion'
import { MoorhenDisplayObjects } from './MoorhenDisplayObjects';
import { MoorhenConsole } from"./MoorhenConsole";
import { convertViewtoPx} from '../utils/MoorhenUtils';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL';
import { ArrowBackOutlined, ArrowForwardOutlined } from '@mui/icons-material';

export const MoorhenSideBar = forwardRef((props, ref) => {
    const [showSideBar, setShowSideBar] = useState(false);
    const [opacity, setOpacity] = useState(0.5);
    const [consoleBodyHeight, setConsoleBodyHeight] = useState(convertViewtoPx(0, props.windowHeight))
    const [selectedToolKey, setSelectedToolKey] = useState(null)
    const [accordionDropdownId, setAccordionDropdownId] = useState(-1)

    const sideBarWidth = convertViewtoPx(30, props.windowWidth)

    useEffect(() => {
        consoleBodyHeight !== 0 ? setConsoleBodyHeight(convertViewtoPx(30, props.windowHeight)) : setConsoleBodyHeight(convertViewtoPx(0, props.windowHeight))
        ref.current.scrollTop = ref.current.scrollHeight;
    }, [showSideBar, props.windowHeight, props.windowWidth])

    return <>
        <Drawer anchor='right' open={true} variant='persistent'
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
                sx={{
                    opacity: showSideBar ? '0.0' : opacity,
                    height: '100%',
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        height: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: isDarkBackground(...props.backgroundColor) ? 'grey' : 'white'
                    },
            }}>
            <IconButton onClick={() => {setShowSideBar(true)}} sx={{opacity: showSideBar ? '0.0' : opacity}}>
                <ArrowBackOutlined style={{color: isDarkBackground(...props.backgroundColor) ? 'white' : 'black'}}/>
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
                    backgroundColor: isDarkBackground(...props.backgroundColor) ? 'grey' : 'white'
                },
            }}
            variant="persistent"
            anchor="right"
            open={showSideBar}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <IconButton onClick={() => {setShowSideBar(false)}} sx={{opacity: opacity}}>
                <ArrowForwardOutlined style={{color: isDarkBackground(...props.backgroundColor) ? 'white' : 'black'}}/>
            </IconButton>
            <Divider/>
            <List>
                <MoorhenDisplayObjects dropdownId={1} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} {...props} />
                <MoorhenToolsAccordion dropdownId={2} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
                <MoorhenConsole ref={ref} dropdownId={3} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
            </List>
        </Drawer>
    </>
})