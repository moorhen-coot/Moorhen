import { useState } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMoleculeCard } from "../card/MoorhenMoleculeCard";
import { convertRemToPx } from "../../utils/MoorhenUtils";
import { moorhen } from "../../types/moorhen";

interface MoorhenModelsModalProps extends moorhen.Controls {
    windowWidth: number;
    windowHeight: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenModelsModal = (props: MoorhenModelsModalProps) => {    
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1)

    let displayData: JSX.Element[] = [];
    props.molecules.forEach(molecule => displayData.push(
        <MoorhenMoleculeCard
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
    ))
    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <MoorhenDraggableModalBase
                left={`${props.windowWidth / 2}px`}
                show={props.show}
                setShow={props.setShow}
                windowHeight={props.windowHeight}
                windowWidth={props.windowWidth}
                height={70}
                width={37}
                headerTitle={'Models'}
                body={
                    props.molecules.length === 0 && props.maps.length === 0 ? <span>No models loaded</span> : displayData
                }
                footer={null}
            />
}

