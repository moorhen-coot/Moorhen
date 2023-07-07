import { useState, useEffect, useRef } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenRigidBodyFitButton } from "../button/MoorhenRigidBodyFitButton"
import { MoorhenDragAtomsButton } from "../button/MoorhenDragAtomsButton"
import { MoorhenRotateTranslateZoneButton } from "../button/MoorhenRotateTranslateZoneButton"
import { MoorhenRotamerChangeButton } from "../button/MoorhenRotamerChangeButton"
import { MoorhenAddSimpleButton } from "../button/MoorhenAddSimpleButton"
import { MoorhenMutateButton } from "../button/MoorhenMutateButton"
import { MoorhenJedFlipTrueButton } from "../button/MoorhenJedFlipTrueButton"
import { MoorhenJedFlipFalseButton } from "../button/MoorhenJedFlipFalseButton"
import { MoorhenEigenFlipLigandButton } from "../button/MoorhenEigenFlipLigandButton"
import { MoorhenDeleteButton } from "../button/MoorhenDeleteButton"
import { MoorhenAddAltConfButton } from "../button/MoorhenAddAltConfButton"
import { MoorhenRefineResiduesButton } from "../button/MoorhenRefineResiduesButton"
import { MoorhenSideChain180Button } from "../button/MoorhenSideChain180Button"
import { MoorhenAddTerminalResidueButton } from "../button/MoorhenAddTerminalResidueButton"
import { MoorhenFlipPeptideButton } from "../button/MoorhenFlipPeptideButton"
import { MoorhenAutofitRotamerButton } from "../button/MoorhenAutofitRotamerButton"
import { MoorhenConvertCisTransButton } from "../button/MoorhenConvertCisTransButton"
import { IconButton, Drawer } from "@mui/material";
import { ArrowDownwardOutlined, ArrowUpwardOutlined } from "@mui/icons-material";
import { convertRemToPx, convertViewtoPx} from '../../utils/MoorhenUtils';
import { MoorhenControlsInterface } from "../MoorhenContainer";

export const MoorhenButtonBar = (props: MoorhenControlsInterface) => {
    const [selectedButtonIndex, setSelectedButtonIndex] = useState<null | string>(null);
    const [showDrawer, setShowDrawer] = useState<boolean>(false);
    const [opacity, setOpacity] = useState<number>(0.5);
    const popoverIsShownRef = useRef<boolean | null>(null)

    const collectedProps = {
        monomerLibraryPath: props.monomerLibraryPath, backgroundColor: props.backgroundColor, defaultBondSmoothness: props.defaultBondSmoothness, urlPrefix: props.urlPrefix,
        shortCuts: props.shortCuts, glRef: props.glRef, commandCentre: props.commandCentre, activeMap: props.activeMap, molecules: props.molecules, timeCapsuleRef: props.timeCapsuleRef, 
        windowHeight: props.windowHeight, changeMolecules: props.changeMolecules, enableRefineAfterMod: props.enableRefineAfterMod, selectedButtonIndex, setSelectedButtonIndex
    }

    const editButtons: JSX.Element[] = [
        (<MoorhenAutofitRotamerButton {...collectedProps} key='auto-fit-rotamer' buttonIndex="0" />),

        (<MoorhenFlipPeptideButton {...collectedProps} key='flip-peptide' buttonIndex="1" />),

        (<MoorhenSideChain180Button {...collectedProps} key='side-chain-180' buttonIndex="2" />),

        (<MoorhenRefineResiduesButton {...collectedProps} key='refine-cid' buttonIndex="3" />),

        (<MoorhenDeleteButton {...collectedProps} key='delete-cid' buttonIndex="4" />),

        (<MoorhenMutateButton {...collectedProps} key='mutate' buttonIndex="5" />),

        (<MoorhenAddTerminalResidueButton {...collectedProps} key='add-terminal-residue' buttonIndex="6" />),
        
        (<MoorhenAddSimpleButton {...collectedProps} key='add-simple' buttonIndex="7" />),

        (<MoorhenRigidBodyFitButton {...collectedProps} key='rigid-body-fit' buttonIndex="8" />),

        (<MoorhenRotamerChangeButton  {...collectedProps} key='next-rotamer' buttonIndex="9" />),

        (<MoorhenEigenFlipLigandButton {...collectedProps} key='eigen-flip' buttonIndex="10" />),

        (<MoorhenJedFlipFalseButton {...collectedProps} key='jed-flip-false' buttonIndex="11" />),

        (<MoorhenJedFlipTrueButton {...collectedProps} key='jed-flip-true' buttonIndex="12" />),

        (<MoorhenRotateTranslateZoneButton {...collectedProps} key='rotate-translate-zone' buttonIndex="13" />),
        
        (<MoorhenAddAltConfButton {...collectedProps} key='add-alt-conf' buttonIndex="14" />),
    
        (<MoorhenConvertCisTransButton {...collectedProps} key='cis-trans' buttonIndex="15" />),

        (<MoorhenDragAtomsButton {...collectedProps} key='drag-atoms' buttonIndex="16" />)        
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
        let carouselItems: JSX.Element[][] = []
        let currentItem: JSX.Element[] = []

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
                onSlide={() => setSelectedButtonIndex('-1')}
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
