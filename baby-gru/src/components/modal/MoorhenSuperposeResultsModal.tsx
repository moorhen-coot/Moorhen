import { useState } from "react";
import Draggable from "react-draggable";
import { IconButton } from '@mui/material';
import { CloseOutlined } from "@mui/icons-material";
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import { Card } from "react-bootstrap";
import { MoorhenSequenceAlignment } from "../sequence-viewer/MoorhenSequenceAlignment"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from "../../types/libcoot";


export const MoorhenSuperposeResultsModal = (props: {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    isDark: boolean;
    windowHeight: number;
    windowWidth: number;
    superposeResults: false | libcootApi.SuperposeResultsJS;
    setSuperposeResults: React.Dispatch<React.SetStateAction<false | libcootApi.SuperposeResultsJS>>;
}) => {

    const [opacity, setOpacity] = useState(0.5)


    
    return <Draggable handle=".handle">
        <Card
            style={{position: 'absolute', top: '5rem', left: '5rem', opacity: opacity, width: props.windowWidth ? convertViewtoPx(50, props.windowWidth) : '50wh', display: props.superposeResults ? '' : 'none'}}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <Card.Header className="handle" style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                Superpose results
                <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setSuperposeResults(false)}>
                    <CloseOutlined/>
                </IconButton>
            </Card.Header>
            <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(60, props.windowHeight) : '60vh', overflowY: 'scroll'}}>
                {props.superposeResults && <MoorhenSequenceAlignment alignedPairsData={props.superposeResults.alignedPairsData} movingSequence={props.superposeResults.movingSequence} referenceSequence={props.superposeResults.referenceSequence} />}
            </Card.Body>
        </Card>
    </Draggable>
}