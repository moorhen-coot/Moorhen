import { TextField } from "@mui/material";
import { Button, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";

export const SetMapWeight = (props: { map: moorhen.Map }) => {
    const mapWeightRef = useRef<null | string>(null);
    const [mapWeight, setMapWeight] = useState<string>(null);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);

    const menuItemText = "Set map weight...";

    useEffect(() => {
        props.map.estimateMapWeight().then(_ => {
            mapWeightRef.current = props.map.suggestedMapWeight.toFixed(2).toString();
            setMapWeight(props.map.suggestedMapWeight.toFixed(2).toString());
        });
    }, []);

    const estimateMapWeight = useCallback(async () => {
        await props.map.estimateMapWeight();
        mapWeightRef.current = props.map.suggestedMapWeight.toFixed(2).toString();
        setMapWeight(props.map.suggestedMapWeight.toFixed(2).toString());
    }, [props.map]);

    const onCompleted = useCallback(async () => {
        if (isNaN(parseInt(mapWeightRef.current)) || parseInt(mapWeightRef.current) < 0 || parseInt(mapWeightRef.current) === Infinity) {
            return;
        }
        props.map.suggestedMapWeight = parseInt(mapWeightRef.current);
        if (props.map.molNo === activeMap.molNo) {
            props.map.setMapWeight();
        }
        document.body.click();
    }, [props.map]);

    return (
        <>
            <Form.Group>
                <TextField
                    style={{ margin: "0.5rem" }}
                    id="conformer-count"
                    label="Map weight"
                    type="number"
                    variant="standard"
                    error={isNaN(parseInt(mapWeight)) || parseInt(mapWeight) < 0 || parseInt(mapWeight) === Infinity}
                    value={mapWeight}
                    onChange={evt => {
                        mapWeightRef.current = evt.target.value;
                        setMapWeight(evt.target.value);
                    }}
                />
            </Form.Group>
            <MoorhenButton variant="secondary" style={{ marginLeft: "0.1rem" }} onClick={estimateMapWeight}>
                Estimate
            </MoorhenButton>
            <MoorhenButton variant="primary" style={{ marginLeft: "0.1rem" }} onClick={onCompleted}>
                Set
            </MoorhenButton>
        </>
    );
};
