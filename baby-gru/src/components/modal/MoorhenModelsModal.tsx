import { useState, useEffect, useRef, useCallback } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMoleculeCard } from "../card/MoorhenMoleculeCard";
import { convertRemToPx } from "../../utils/MoorhenUtils";
import { moorhen } from "../../types/moorhen";
import { Button } from "react-bootstrap";
import { UnfoldLessOutlined } from "@mui/icons-material";

interface MoorhenModelsModalProps extends moorhen.Controls {
    windowWidth: number;
    windowHeight: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenModelsModal = (props: MoorhenModelsModalProps) => {
    const cardListRef = useRef([]);
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1);

    useEffect(() => {
        cardListRef.current = cardListRef.current.slice(0, props.molecules.length);
    }, [props.molecules]); 
 
    const handleCollapseAll = useCallback(() => {
        cardListRef.current.forEach(card => {
            card.forceIsCollapsed(true)
        })
    }, [cardListRef.current, cardListRef])

    let displayData = props.molecules.map((molecule, index) => {
        return <MoorhenMoleculeCard
            ref={el => cardListRef.current[index] = el}
            showSideBar={true}
            busy={false}
            consoleMessage="A"
            dropdownId={1}
            accordionDropdownId={1}
            setAccordionDropdownId={(arg0) => {}}
            sideBarWidth={convertRemToPx(26)}
            key={molecule.molNo}
            index={molecule.molNo}
            molecule={molecule}
            currentDropdownMolNo={currentDropdownMolNo}
            setCurrentDropdownMolNo={setCurrentDropdownMolNo}
            {...props} />
    })
    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <MoorhenDraggableModalBase
                transparentOnMouseOut={props.transparentModalsOnMouseOut}
                left={`${props.windowWidth / 2}px`}
                show={props.show}
                setShow={props.setShow}
                windowHeight={props.windowHeight}
                windowWidth={props.windowWidth}
                height={70}
                width={37}
                headerTitle={'Models'}
                additionalHeaderButtons={[
                    <Button variant="white" key='collapse-all-maps' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={handleCollapseAll}>
                        <UnfoldLessOutlined/>
                    </Button>
                ]}
                body={
                    props.molecules.length === 0 && props.maps.length === 0 ? <span>No models loaded</span> : displayData
                }
                footer={null}
            />
}

