import { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";
import { MoorhenCarbohydrateCard } from "../card/MoorhenCarbohydrateCard";
import { privateer } from "../../types/privateer";
import { LinearProgress } from "@mui/material";
import { modalKeys } from "../../utils/enums";

export const MoorhenCarbohydrateList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
    height?: number | string;
}) => {

    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const showModelsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MODELS))
    
    const [carbohydrateList, setCarbohydrateList] = useState<privateer.ResultsEntry[] | null>(null)

    const validate = async () => {
        props.setBusy(true)
        const result = await props.molecule.getPrivateerValidation(true)
        setCarbohydrateList(result)
        props.setBusy(false)
    }
   
    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo && showModelsModal) {
            validate()
        }
    }, [updateSwitch])

    useEffect(() => {
        if (showModelsModal) {
            validate()
        } else {
            setCarbohydrateList(null)
        }
    }, [showModelsModal])

    return <>
            {carbohydrateList === null ?
                <LinearProgress variant="indeterminate"/>
            : carbohydrateList.length > 0 ?
                <>
                    <Row style={{ maxHeight: props.height, overflowY: 'auto' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {carbohydrateList.map((carbohydrate, index) => {
                                return <MoorhenCarbohydrateCard key={carbohydrate.id} carbohydrate={carbohydrate} molecule={props.molecule}/>
                            })}
                        </Col>
                    </Row>
                </>
                :
                <div>
                    <b>No Carbohydrates</b>
                </div>
            }
        </>
}

MoorhenCarbohydrateList.defaultProps = { setBusy: () => {}, height: '30vh'}