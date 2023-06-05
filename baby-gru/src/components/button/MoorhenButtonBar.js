import { useState, useEffect, useRef } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenAutofitRotamerButton, MoorhenFlipPeptideButton, MoorhenSideChain180Button, MoorhenAddTerminalResidueDirectlyUsingCidButton,
        MoorhenEigenFlipLigandButton, MoorhenJedFlipFalseButton, MoorhenJedFlipTrueButton, MoorhenConvertCisTransButton, MoorhenAddSimpleButton,
        MoorhenRefineResiduesUsingAtomCidButton, MoorhenDeleteUsingCidButton, MoorhenMutateButton, MoorhenRotateTranslateZoneButton,
        MoorhenAddAltConfButton, MoorhenRigidBodyFitButton, MoorhenRotamerChangeButton, MoorhenDragAtomsButton } from "./MoorhenSimpleEditButton"
import { IconButton, Drawer } from "@mui/material";
import { ArrowDownwardOutlined, ArrowUpwardOutlined } from "@mui/icons-material";
import { convertRemToPx, convertViewtoPx} from '../../utils/MoorhenUtils';

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

        (<MoorhenRotamerChangeButton  {...props} key='next-rotamer' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="9" />),

        (<MoorhenEigenFlipLigandButton {...props} key='eigen-flip' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="10" />),

        (<MoorhenJedFlipFalseButton {...props} key='jed-flip-false' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="11" />),

        (<MoorhenJedFlipTrueButton {...props} key='jed-flip-true' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="12" />),

        (<MoorhenRotateTranslateZoneButton {...props} key='rotate-translate-zone' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="13" />),
        
        (<MoorhenAddAltConfButton {...props} key='add-alt-conf' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="14" />),
    
        (<MoorhenConvertCisTransButton {...props} key='cis-trans' selectedButtonIndex={selectedButtonIndex}
                setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="15" />),

        (props.devMode && <MoorhenDragAtomsButton {...props} key='drag-atoms-A' selectedButtonIndex={selectedButtonIndex}
                setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="16" />)        
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
        const buttonWidth = Math.max(convertViewtoPx(5, props.windowHeight), 40)
        const maximumAllowedWidth = props.windowWidth - buttonWidth * 4

        let currentlyUsedWidth = 0
        let carouselItems = []
        let currentItem = []

        editButtons.forEach(button => {
            currentlyUsedWidth += buttonWidth
            if (currentlyUsedWidth >= maximumAllowedWidth) {
                carouselItems.push(currentItem)
                currentItem = []
                currentlyUsedWidth = 0
            }
            currentItem.push(button)
        })
        
        if (currentItem.length > 0) {
            carouselItems.push(currentItem)
        }

        return carouselItems
    }

    const carouselItems = getCarouselItems()
    const toggleDrowerButtonHeight = convertViewtoPx(3, props.windowHeight)
    // Add 0.1 rem for the bottom margin of carousel
    const simpleEditButtonHeight = Math.max(convertViewtoPx(5, props.windowHeight), 40) + convertRemToPx(0.1)
    
    return  <> 
    <Drawer anchor='bottom' open={true} variant='persistent'
                sx={{
                    width: '100%',
                    flexShrink: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    '& .MuiDrawer-paper': {
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        alignItems:'center',
                        borderTop: 0, 
                        margin: 0,
                        padding: 0
                    },
            }}>
            <IconButton id='open-carousel-drawer' onClick={() => {setShowDrawer(true)}} onMouseOver={() => setOpacity(1)} onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5) }} sx={{
                 width:'10%', 
                 height: toggleDrowerButtonHeight,
                 borderColor:'black', 
                 borderTop: 1, 
                 borderLeft: 1, 
                 borderRight: 1,
                 margin: 0,
                 padding: 0,
                 opacity: showDrawer ? '0.0' : opacity,
                 borderRadius: 0,
                 backgroundColor: props.isDark ? 'grey' : 'white',
                 ':hover': {
                    backgroundColor: props.isDark ? 'grey' : 'white',
                }
            }}>
                <ArrowUpwardOutlined style={{color: props.isDark ? 'white' : 'black', height: '100%'}}/>
            </IconButton>
    </Drawer>
    <Drawer variant="persistent" anchor="bottom" open={showDrawer}
        onMouseOver={() => setOpacity(1)} 
        onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5)}}
        sx={{
            width: '100%',
            flexShrink: 0,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            '& .MuiDrawer-paper': {
                width: '100%',
                height: simpleEditButtonHeight + toggleDrowerButtonHeight,
                boxSizing: 'border-box',
                alignItems:'center',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderTop: 0,
                borderBottom: 0,
                borderLeft: 0,
                margin: 0,
                padding: 0,
                border: 0,
        },
        }}>
        <IconButton onClick={() => {setShowDrawer(false)}} sx={{
             width:'10%', 
             height: toggleDrowerButtonHeight,
             borderColor:'black', 
             borderTop: 1, 
             borderLeft: 1, 
             borderRight: 1, 
             opacity: opacity, 
             borderRadius: 0,
             padding: 0,
             margin: 0,
             backgroundColor: props.isDark ? 'grey' : 'white',
             ':hover': {
                backgroundColor: props.isDark ? 'grey' : 'white',
            }
        }}>
            <ArrowDownwardOutlined style={{height: '100%', color: props.isDark ? 'white' : 'black'}}/>
        </IconButton>
    </Drawer>
    <Drawer variant="persistent" anchor="bottom" open={showDrawer}
            sx={{
                opacity: opacity,
                width: '100%',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    zIndex: 9999,
                    width: '100%',
                    height: simpleEditButtonHeight,
                    boxSizing: 'border-box',
                    backgroundColor: props.isDark ? 'grey' : 'white',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                },
            }}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => {if(!popoverIsShownRef.current) setOpacity(0.5) }}
            >
        <Carousel 
                className="stop-scrolling"
                style={{marginBottom: '0.1rem'}}
                key={carouselItems.length}
                variant={props.isDark ? "light" : "dark"} 
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
