import { useState, useEffect, forwardRef } from "react";
import { IconButton, Drawer, List } from "@mui/material";
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

    const isDark = isDarkBackground(...props.backgroundColor)
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
                        height: '10%',
                        boxSizing: 'border-box',
                        alignItems:'center', justifyContent:'center', alignContent:'center', verticalAlign:'center',
                        backgroundColor: isDark ? 'grey' : 'white',
                        borderTop: 0,
                        borderBottom: 0,
                        borderLeft: 0,
                        marginTop: convertViewtoPx(5.6, props.windowHeight),
                    },
            }}>
            <IconButton onClick={() => {setShowSideBar(true)}} sx={{
                opacity: showSideBar ? '0.0' : opacity,
                height:'100%',
                borderRadius: 0,
                borderTop: 1,
                borderBottom: 1,
                borderLeft: 1,
                }}>
                <ArrowBackOutlined style={{color: isDark ? 'white' : 'black'}}/>
            </IconButton>
        </Drawer>
        <Drawer
            sx={{
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    width: sideBarWidth + sideBarWidth * 0.05,
                    height: '10%',
                    boxSizing: 'border-box',
                    alignItems:'left', justifyContent: 'left', alignContent:'center', verticalAlign:'center',
                    borderTop: 0,
                    borderBottom: 0,
                    borderLeft: 0,
                    marginTop: convertViewtoPx(5.6, props.windowHeight),
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
                width: sideBarWidth * 0.05 - 1,
                padding: '0rem',
                height:'100%',
                borderRadius: 0,
                borderTop: 1,
                borderBottom: 1,
                borderLeft: 1,
                backgroundColor: isDark ? 'grey' : 'white',
                ':hover': {
                    backgroundColor: isDark ? 'grey' : 'white',
                }
                }}>
                <ArrowForwardOutlined style={{color: isDark ? 'white' : 'black'}}/>
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
                    backgroundColor: isDark ? 'grey' : 'white'
                },
            }}
            variant="persistent"
            anchor="right"
            open={showSideBar}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <List>
                <MoorhenDisplayObjects dropdownId={1} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} {...props} />
                <MoorhenToolsAccordion dropdownId={2} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
                <MoorhenConsole ref={ref} dropdownId={3} accordionDropdownId={accordionDropdownId} setAccordionDropdownId={setAccordionDropdownId} sideBarWidth={sideBarWidth} showSideBar={showSideBar} selectedToolKey={selectedToolKey} setSelectedToolKey={setSelectedToolKey} {...props}/>
            </List>
        </Drawer>
    </>
})