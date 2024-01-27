import { useEffect, useRef, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";
import { getLigandSVG } from "../../utils/MoorhenUtils";
import { MoorhenCarbohydrateCard } from "../card/MoorhenCarbohydrateCard";
import {PrivateerResultsEntry} from "../../types/privateer";

export const MoorhenCarbohydrateList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
    height?: number | string;
}) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const [carbohydrateList, setCarbohydrateList] = useState<PrivateerResultsEntry[] | null>(null)

    const validate = async () => {
        if (props.molecule) {
            console.log(props.molecule)
            const privateerResult = await props.commandCentre.current.cootCommand({
                command: 'privateer_validate',
                commandArgs: [props.molecule.molNo],
                returnType: 'privateer_results'
            }, false)

            const privateerData: PrivateerResultsEntry[] = privateerResult.data.result.result;
            console.log(privateerResult)
            setCarbohydrateList(privateerData)
        }
    }

    useEffect(() => {
        validate()
    }, [props.molecule])

    return <>
            {carbohydrateList === null ?
            null
            : carbohydrateList.length > 0 ?
                <>
                    <Row style={{ maxHeight: props.height, overflowY: 'auto' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {carbohydrateList.map((carbohydrate, index) => {
                                return <MoorhenCarbohydrateCard key={`${carbohydrate.id}`} carbohydrate={carbohydrate} molecule={props.molecule}/>
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