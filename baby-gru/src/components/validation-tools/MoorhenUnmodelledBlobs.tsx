import { Col, Row, Card, Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { useCommandCentre } from '../../InstanceManager';
import { libcootApi } from '../../types/libcoot';
import { moorhen } from '../../types/moorhen';
import { setOrigin } from "../../store/glRefSlice"
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";


export const MoorhenUnmodelledBlobs = () => {

    const dispatch = useDispatch()
    const commandCentre = useCommandCentre();

    //FIXME - RMSD cutoff should be user settable.
    async function fetchCardData(selectedModel: number, selectedMap: number): Promise<libcootApi.InterestingPlaceDataJS[]> {
        const inputData = {
            message:'coot_command',
            command: "unmodelled_blobs", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap, 1.4]
        }
        const response = await commandCentre.current.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.InterestingPlaceDataJS[]>
        const blobs = response.data.result.result
        return blobs
    }

    const getCards = (selectedModel: number, selectedMap: number, blobs: libcootApi.InterestingPlaceDataJS[]) => {

        return blobs.map((blob, index) => {
            return <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {`${blob.buttonLabel} ( size: ${blob.featureValue.toFixed(2)} )`}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            dispatch(setOrigin([-blob.coordX, -blob.coordY, -blob.coordZ]))
                                }}>
                                    View
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
        })        
    }

    return <MoorhenValidationListWidgetBase 
                fetchData={fetchCardData}
                getCards={getCards}
                menuId='unmodelled-blobs-validation'
            />
}
