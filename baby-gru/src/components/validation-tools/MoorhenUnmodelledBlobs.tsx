import { Col, Row, Card, Button } from 'react-bootstrap';
import { MoorhenSideBarAccordionPropsInterface } from "../list/MoorhenSideBar";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenUnmodelledBlobs = (props: MoorhenSideBarAccordionPropsInterface) => {

    async function fetchCardData(selectedModel: number, selectedMap: number) {
        const inputData = {
            message:'coot_command',
            command: "unmodelled_blobs", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap]
        }
        let response = await props.commandCentre.current.cootCommand(inputData)
        let blobs = response.data.result.result
        return blobs
    }

    const getCards = (selectedModel: number, selectedMap: number, blobs: CootInterestingPlaceDataType[]) => {

        return blobs.map((blob, index) => {
            return <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {`${blob.buttonLabel} ( size: ${blob.featureValue.toFixed(2)} )`}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            props.glRef.current.setOriginAnimated([-blob.coordX, -blob.coordY, -blob.coordZ])
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
                molecules={props.molecules}
                maps={props.maps}
                backgroundColor={props.backgroundColor}
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                fetchData={fetchCardData}
                getCards={getCards}
            />
}
