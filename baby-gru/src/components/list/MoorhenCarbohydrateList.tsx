import { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";
import { MoorhenCarbohydrateCard } from "../card/MoorhenCarbohydrateCard";
import { privateer } from "../../types/privateer";

export const MoorhenCarbohydrateList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
    height?: number | string;
}) => {

    const newCootCommandAlert = useSelector((state: moorhen.State) => state.generalStates.newCootCommandAlert)
    
    const [carbohydrateList, setCarbohydrateList] = useState<privateer.ResultsEntry[]>([])

    useEffect(() => {
        const validate = async () => {
            if (props.molecule) {
                props.setBusy(true)
                const result = await props.commandCentre.current.cootCommand({
                    command: 'privateer_validate',
                    commandArgs: [props.molecule.molNo],
                    returnType: 'privateer_results'
                }, false) as moorhen.WorkerResponse<privateer.ResultsEntry[]>
                setCarbohydrateList(result.data.result.result)
                props.setBusy(false)
            }
        }
        validate()
    }, [newCootCommandAlert])

    return <>
            {carbohydrateList.length > 0 ?
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