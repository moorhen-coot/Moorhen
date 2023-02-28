import { useState, useEffect, useRef } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenAutofitRotamerButton, MoorhenFlipPeptideButton, MoorhenSideChain180Button, MoorhenAddTerminalResidueDirectlyUsingCidButton,
        MoorhenEigenFlipLigandButton, MoorhenJedFlipFalseButton, MoorhenJedFlipTrueButton, MoorhenConvertCisTransButton, MoorhenAddSimpleButton,
        MoorhenRefineResiduesUsingAtomCidButton, MoorhenDeleteUsingCidButton, MoorhenMutateButton, MoorhenRotateTranslateZoneButton,
        MoorhenAddAltConfButton, MoorhenRigidBodyFitButton } from "./MoorhenSimpleEditButton"
import { IconButton, Drawer, Divider } from "@mui/material";
import { ArrowDownwardOutlined, ArrowUpwardOutlined } from "@mui/icons-material";
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { convertViewtoPx} from '../utils/MoorhenUtils';

export const MoorhenButtonBar = (props) => {
    const [selectedButtonIndex, setSelectedButtonIndex] = useState(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [opacity, setOpacity] = useState(0.5);
    const popoverIsShownRef = useRef(null)

    const editButtons = [
        (<MoorhenAutofitRotamerButton {...props} key='auto-fit-rotamer' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="0" />),

        (<MoorhenFlipPeptideButton {...props} key='flip-peptide' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="1" />),

        (<MoorhenSideChain180Button {...props} key='side-chain-180' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="2" />),

        (<MoorhenRefineResiduesUsingAtomCidButton {...props} key='refine-cid' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="3" />),

        (<MoorhenDeleteUsingCidButton {...props} key='delete-cid' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="4" />),

        (<MoorhenMutateButton {...props} key='mutate' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="5" />),

        (<MoorhenAddTerminalResidueDirectlyUsingCidButton {...props} key='add-terminal-residue' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="6" />),
        
        (<MoorhenAddSimpleButton {...props} key='add-simple' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="7" />),

        (<MoorhenRigidBodyFitButton {...props} key='rigid-body-fit' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="8" />),

        (<MoorhenEigenFlipLigandButton {...props} key='eigen-flip' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="9" />),

        (<MoorhenJedFlipFalseButton {...props} key='jed-flip-false' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="10" />),

        (<MoorhenJedFlipTrueButton {...props} key='jed-flip-true' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="11" />),

        (<MoorhenRotateTranslateZoneButton {...props} key='rotate-translate-zone' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="12" />),
        
        (<MoorhenAddAltConfButton {...props} key='add-alt-conf' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="13" />),
    
        (<MoorhenConvertCisTransButton {...props} key='cis-trans' selectedButtonIndex={selectedButtonIndex}
                setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="14" />),

    ]

    useEffect(() => {
        if (!showDrawer && selectedButtonIndex !== null) {
            setSelectedButtonIndex(null)
            popoverIsShownRef.current = false
        }

    }, [showDrawer])

    useEffect(() => {
        if (showDrawer && selectedButtonIndex !== null) {
            popoverIsShownRef.current = true
        } else {
            popoverIsShownRef.current = false
        }

    }, [selectedButtonIndex])

    const getCarouselItems = () => {
        const maximumAllowedWidth = props.windowWidth - (props.innerWindowMarginWidth + (props.showSideBar ? props.sideBarWidth : 0))

        let currentlyUsedWidth = 0
        let carouselItems = []
        let currentItem = []

        editButtons.forEach(button => {
            currentItem.push(button)
            currentlyUsedWidth += 90
            if (currentlyUsedWidth >= maximumAllowedWidth) {
                carouselItems.push(currentItem)
                currentItem = []
                currentlyUsedWidth = 0
            }
        })
        
        if (currentItem.length > 0) {
            carouselItems.push(currentItem)
        }

        return carouselItems
    }

    const carouselItems = getCarouselItems()
    const isDark = isDarkBackground(...props.backgroundColor)
    return  <> 
    <Drawer anchor='bottom' open={true} variant='persistent' elevation={2000}
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5) }}
                sx={{
                    opacity: showDrawer ? '0.0' : opacity,
                    width: '100%',
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: '10%',
                        boxSizing: 'border-box',
                        backgroundColor: isDark ? 'grey' : 'white',
                        alignItems:'center', justifyContent:'center', alignContent:'center', verticalAlign:'center',
                        borderTop: 0, 
                        marginLeft: convertViewtoPx(5.6, props.windowWidth),
                    },
            }}>
            <IconButton onClick={() => {setShowDrawer(true)}} sx={{ width:'100%', borderColor:'black', borderTop: 1, borderLeft: 1, borderRight: 1,opacity: showDrawer ? '0.0' : opacity, borderRadius: 0 }}>
                <ArrowUpwardOutlined style={{color: isDark ? 'white' : 'black'}}/>
            </IconButton>
    </Drawer>
    <Drawer
        sx={{
            backgroundColor: 'rgba(0, 0, 0, 0)',
            width: '100%',
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: '10%',
                boxSizing: 'border-box',
                borderTop: 0, 
                alignItems:'center', justifyContent:'center', alignContent:'center', verticalAlign:'center',
                marginLeft: convertViewtoPx(5.6, props.windowWidth),
                backgroundColor: 'rgba(0, 0, 0, 0)'
            },
        }}
        variant="persistent"
        anchor="bottom"
        open={showDrawer}
        onMouseOver={() => setOpacity(1)}
        onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5) }}
        >
        <IconButton onClick={() => {setShowDrawer(false)}} sx={{
             width:'100%', 
             borderColor:'black', 
             borderTop: 1, 
             borderLeft: 1, 
             borderRight: 1, 
             opacity: opacity, 
             borderRadius: 0,
             //padding: '0rem',
             backgroundColor: isDark ? 'grey' : 'white',
             ':hover': {
                backgroundColor: isDark ? 'grey' : 'white',
            }
        }}>
            <ArrowDownwardOutlined style={{color: isDark ? 'white' : 'black'}}/>
        </IconButton>
        <Divider/>
        <div style={{height:'4.1rem'}}></div>
    </Drawer>
    <Drawer
            sx={{
                opacity: opacity,
                width: '100%',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: isDark ? 'grey' : 'white'
                },
            }}
            variant="persistent"
            anchor="bottom"
            open={showDrawer}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5) }}
            >
        <Carousel 
                style={{marginBottom: '0.5rem'}}
                key={carouselItems.length}
                variant={props.darkMode ? "light" : "dark"} 
                interval={null} 
                keyboard={false} 
                indicators={false} 
                onSlide={() => setSelectedButtonIndex(-1)}
                controls={carouselItems.length > 1}>
                    {carouselItems.map((item, index) => {
                        return (
                            <Carousel.Item key={index}>
                                <ButtonGroup>
                                    {item}
                                </ButtonGroup>
                            </Carousel.Item>
                        )
                    })}
            </Carousel>   
    </Drawer>   

    </>
}
