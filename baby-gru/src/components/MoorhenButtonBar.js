import { useState } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { MoorhenAutofitRotamerButton, MoorhenFlipPeptideButton, MoorhenSideChain180Button, MoorhenAddTerminalResidueDirectlyUsingCidButton,
        MoorhenEigenFlipLigandButton, MoorhenJedFlipFalseButton, MoorhenJedFlipTrueButton, MoorhenConvertCisTransButton, MoorhenAddSimpleButton,
        MoorhenRefineResiduesUsingAtomCidButton, MoorhenDeleteUsingCidButton, MoorhenMutateButton, MoorhenRotateTranslateZoneButton,
        MoorhenAddAltConfButton } from "./MoorhenSimpleEditButton"

export const MoorhenButtonBar = (props) => {
    const [selectedButtonIndex, setSelectedButtonIndex] = useState(null);

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
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="11" />),

        (<MoorhenEigenFlipLigandButton {...props} key='eigen-flip' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="7" />),

        (<MoorhenJedFlipFalseButton {...props} key='jed-flip-false' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="8" />),

        (<MoorhenJedFlipTrueButton {...props} key='jed-flip-true' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="9" />),

        (<MoorhenRotateTranslateZoneButton {...props} key='rotate-translate-zone' selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="10" />),
        
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

    return <div
        style={{
            overflow: "auto",
            backgroundColor: `rgba(
                ${255 * props.backgroundColor[0]},
                ${255 * props.backgroundColor[1]},
                ${255 * props.backgroundColor[2]}, 
                ${props.backgroundColor[3]})`,
        }}>
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
        </div>
}
