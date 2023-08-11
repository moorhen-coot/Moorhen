import { useState, useRef } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { FormGroup, Tooltip } from "@mui/material";
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
import { moorhen } from "../../types/moorhen";

interface MoorhenToolkitModalProps extends moorhen.Controls {
    windowWidth: number;
    windowHeight: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenToolkitModal = (props: MoorhenToolkitModalProps) => {    

    const [selectedButtonIndex, setSelectedButtonIndex] = useState<null | string>(null);
    const [toolTip, setToolTip] = useState<string>('');
    const [overlayContents, setOverlayContents] = useState<JSX.Element | null>(null);
    const formGroupRef = useRef<HTMLFormElement | null>(null)
    
    const collectedProps = {
        selectedButtonIndex, setSelectedButtonIndex, toolTip, setToolTip, setOverlayContents, ...props
    }

    return <MoorhenDraggableModalBase
                transparentOnMouseOut={props.transparentModalsOnMouseOut}
                left={`${props.windowWidth / 2}px`}
                show={props.show}
                setShow={props.setShow}
                windowHeight={props.windowHeight}
                windowWidth={props.windowWidth}
                headerTitle={'Model building toolkit'}
                footer={null}
                body={<>
                <Tooltip ref={formGroupRef} title={toolTip}>
                    <FormGroup style={{ justifyContent: 'center', margin: "0px", padding: "0px", width: '100%' }} row>
                        <MoorhenAutofitRotamerButton {...collectedProps} key='auto-fit-rotamer' buttonIndex="0" />
                        <MoorhenFlipPeptideButton {...collectedProps} key='flip-peptide' buttonIndex="1" />
                        <MoorhenSideChain180Button {...collectedProps} key='side-chain-180' buttonIndex="2" />
                        <MoorhenRefineResiduesButton {...collectedProps} key='refine-cid' buttonIndex="3" />
                        <MoorhenDeleteButton {...collectedProps} key='delete-cid' buttonIndex="4" />
                        <MoorhenMutateButton {...collectedProps} key='mutate' buttonIndex="5" />
                        <MoorhenAddTerminalResidueButton {...collectedProps} key='add-terminal-residue' buttonIndex="6" />
                        <MoorhenAddSimpleButton {...collectedProps} key='add-simple' buttonIndex="7" />
                        <MoorhenRigidBodyFitButton {...collectedProps} key='rigid-body-fit' buttonIndex="8" />
                        <MoorhenRotamerChangeButton  {...collectedProps} key='next-rotamer' buttonIndex="9" />
                        <MoorhenEigenFlipLigandButton {...collectedProps} key='eigen-flip' buttonIndex="10" />
                        <MoorhenJedFlipFalseButton {...collectedProps} key='jed-flip-false' buttonIndex="11" />
                        <MoorhenJedFlipTrueButton {...collectedProps} key='jed-flip-true' buttonIndex="12" />
                        <MoorhenRotateTranslateZoneButton {...collectedProps} key='rotate-translate-zone' buttonIndex="13" />
                        <MoorhenAddAltConfButton {...collectedProps} key='add-alt-conf' buttonIndex="14" />
                        <MoorhenConvertCisTransButton {...collectedProps} key='cis-trans' buttonIndex="15" />
                        <MoorhenDragAtomsButton {...collectedProps} key='drag-atoms' buttonIndex="16" />
                    </FormGroup>
                </Tooltip>
                {overlayContents && 
                    <>
                    <hr></hr>
                    <div style={{marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', alignContent: 'center', textAlign: 'center'}}>
                        {overlayContents}
                    </div>
                    </>
                }
                </>}
            />
}

