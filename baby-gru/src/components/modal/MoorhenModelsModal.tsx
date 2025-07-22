import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "react-bootstrap";
import { UnfoldLessOutlined } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { MoorhenMoleculeCard } from "../card/MoorhenMoleculeCard";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenModelsModal = (props: moorhen.CollectedProps) => {
    const cardListRef = useRef([])
    
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1)
    
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    useEffect(() => {
        cardListRef.current = cardListRef.current.slice(0, molecules.length);
    }, [molecules])
 
    const handleCollapseAll = useCallback(() => {
        cardListRef.current.forEach(card => {
            card.forceIsCollapsed(true)
        })
    }, [cardListRef.current, cardListRef])

    const displayData = molecules.map((molecule, index) => {
        return <MoorhenMoleculeCard
            ref={el => cardListRef.current[index] = el}
            showSideBar={true}
            busy={false}
            dropdownId={1}
            accordionDropdownId={1}
            setAccordionDropdownId={(arg0) => {}}
            sideBarWidth={convertRemToPx(37)}
            key={molecule.molNo}
            index={molecule.molNo}
            molecule={molecule}
            currentDropdownMolNo={currentDropdownMolNo}
            setCurrentDropdownMolNo={setCurrentDropdownMolNo}
            {...props} />
    })
    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <MoorhenDraggableModalBase
                modalId={modalKeys.MODELS}
                left={width - (convertRemToPx(55) + 100)}
                top={height / 4}
                initialHeight={convertViewtoPx(40, height)}
                initialWidth={convertRemToPx(55)}
                minHeight={convertViewtoPx(10, height)}
                minWidth={convertRemToPx(20)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertRemToPx(55)}
                headerTitle={'Models'}
                additionalHeaderButtons={[
                    <Button variant="white" key='collapse-all-maps' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={handleCollapseAll}>
                        <UnfoldLessOutlined/>
                    </Button>
                ]}
                body={
                    molecules.length === 0 ? <span>No models loaded</span> : displayData
                }
                footer={null}
            />
}

