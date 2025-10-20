import { TextField } from "@mui/material";
import { Button, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenSetMapWeight = (props: {
    map: moorhen.Map;
    disabled: boolean;
    setPopoverIsShown?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const mapWeightRef = useRef<null | string>(null);
    const [mapWeight, setMapWeight] = useState<string>(null);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);

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

    const panelContent = (
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
            <Button variant="secondary" style={{ marginLeft: "0.1rem" }} onClick={estimateMapWeight}>
                Estimate
            </Button>
            <Button variant="primary" style={{ marginLeft: "0.1rem" }} onClick={onCompleted}>
                Set
            </Button>
        </>
    );

    return (
        <MoorhenBaseMenuItem
            popoverPlacement="left"
            popoverContent={panelContent}
            menuItemText="Set map weight..."
            showOkButton={false}
            onCompleted={() => {}}
            setPopoverIsShown={props.setPopoverIsShown}
        />
    );
};
