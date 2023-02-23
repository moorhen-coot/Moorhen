import { useState } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenAutofitRotamerButton, MoorhenFlipPeptideButton, MoorhenSideChain180Button, MoorhenAddTerminalResidueDirectlyUsingCidButton,
        MoorhenEigenFlipLigandButton, MoorhenJedFlipFalseButton, MoorhenJedFlipTrueButton, MoorhenConvertCisTransButton, MoorhenAddSimpleButton,
        MoorhenRefineResiduesUsingAtomCidButton, MoorhenDeleteUsingCidButton, MoorhenMutateButton, MoorhenRotateTranslateZoneButton,
        MoorhenAddAltConfButton, MoorhenRigidBodyFitButton } from "./MoorhenSimpleEditButton"
import { IconButton, Drawer, Divider } from "@mui/material";
import { ArrowDownwardOutlined, ArrowUpwardOutlined } from "@mui/icons-material";

export const MoorhenButtonBar = (props) => {
    const [selectedButtonIndex, setSelectedButtonIndex] = useState(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [opacity, setOpacity] = useState(0.5);

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

    return  <> 

    <Drawer anchor='bottom' open={true} variant='persistent'
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
                sx={{
                opacity: showDrawer ? '0.0' : opacity,
                width: '100%',
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: '100%',
                    boxSizing: 'border-box',
                },
            }}>
            <IconButton onClick={() => {setShowDrawer(true)}} sx={{opacity: showDrawer ? '0.0' : opacity}}>
                <ArrowUpwardOutlined />
            </IconButton>
    </Drawer>
    <Drawer
        sx={{
            opacity: opacity,
            width: '100%',
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: '100%',
                boxSizing: 'border-box',
            },
        }}
        variant="persistent"
        anchor="bottom"
        open={showDrawer}
        onMouseOver={() => setOpacity(1)}
        onMouseOut={() => setOpacity(0.5)}
    >
        <IconButton onClick={() => {setShowDrawer(false)}}>
            <ArrowDownwardOutlined />
        </IconButton>
        <Divider/>
        <Carousel 
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
