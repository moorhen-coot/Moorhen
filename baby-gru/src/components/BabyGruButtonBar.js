import { useState } from "react";
import { ButtonGroup, Carousel } from "react-bootstrap"
import { BabyGruAutofitRotamerButton, BabyGruFlipPeptideButton, BabyGruSideChain180Button, BabyGruAddTerminalResidueDirectlyUsingCidButton,
        BabyGruEigenFlipLigandButton, BabyGruJedFlipFalseButton, BabyGruJedFlipTrueButton, BabyGruConvertCisTransButton, BabyGruAddSimpleButton,
        BabyGruRefineResiduesUsingAtomCidButton, BabyGruDeleteUsingCidButton, BabyGruMutateButton, BabyGruRotateTranslateZoneButton } from "./BabyGruSimpleEditButton"

export const BabyGruButtonBar = (props) => {
    const [selectedButtonIndex, setSelectedButtonIndex] = useState(null);

    const editButtons = [
        (<BabyGruAutofitRotamerButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="0" />),

        (<BabyGruFlipPeptideButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="1" />),

        (<BabyGruSideChain180Button {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="2" />),

        (<BabyGruRefineResiduesUsingAtomCidButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="3" />),

        (<BabyGruDeleteUsingCidButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="4" />),

        (<BabyGruMutateButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="5" />),

        (<BabyGruAddTerminalResidueDirectlyUsingCidButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="6" />),

        (<BabyGruEigenFlipLigandButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="7" />),

        (<BabyGruJedFlipFalseButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="8" />),

        (<BabyGruJedFlipTrueButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="9" />),

        (<BabyGruRotateTranslateZoneButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="10" />),

        (<BabyGruAddSimpleButton {...props} selectedButtonIndex={selectedButtonIndex}
            setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="11" />),
        
        (<BabyGruConvertCisTransButton {...props} selectedButtonIndex={selectedButtonIndex}
                setSelectedButtonIndex={setSelectedButtonIndex} buttonIndex="12" />),

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
                    {carouselItems.map(item => {
                        return (
                            <Carousel.Item>
                            <ButtonGroup>
                                {item}
                            </ButtonGroup>
                            </Carousel.Item>
                        )
                    })}
            </Carousel>   
        </div>
}
