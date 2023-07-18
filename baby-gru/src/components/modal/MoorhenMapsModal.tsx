import { useState } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMapCard } from "../card/MoorhenMapCard";
import { convertRemToPx } from "../../utils/MoorhenUtils";
import { MoorhenControlsInterface } from "../MoorhenContainer";

interface MoorhenMapsModalProps extends MoorhenControlsInterface {
    windowWidth: number;
    windowHeight: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenMapsModal = (props: MoorhenMapsModalProps) => {    
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1)

    let displayData: JSX.Element[] = [];
        props.maps.forEach(map => displayData.push(
            <MoorhenMapCard
                showSideBar={true}
                busy={false}
                consoleMessage="A"
                dropdownId={1}
                accordionDropdownId={1}
                setAccordionDropdownId={(arg0) => {}}
                sideBarWidth={convertRemToPx(26)}
                key={map.molNo}
                index={map.molNo}
                map={map}
                initialContour={0.8}
                initialRadius={13}
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
                headerTitle={'Maps'}
                body={
                    props.molecules.length === 0 && props.maps.length === 0 ? <span>No maps loaded</span> : displayData
                }
                footer={null}
            />
}

