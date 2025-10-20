import { TextField } from "@mui/material";
import { Button, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenScaleMap = (props: { map: moorhen.Map; disabled: boolean }) => {
    const mapScaleRef = useRef<null | string>(null);
    const [mapScale, ScaleMap] = useState<string>("1.0");
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);

    const onCompleted = useCallback(async () => {
        if (isNaN(parseInt(mapScaleRef.current)) || parseInt(mapScaleRef.current) < 0 || parseInt(mapScaleRef.current) === Infinity) {
            return;
        }
        if (props.map.molNo === activeMap.molNo) {
            console.log("mapScaleRef", mapScaleRef.current, props.map);
            props.map.scaleMap(parseFloat(mapScaleRef.current));
        }
        document.body.click();
    }, [props.map]);

    const panelContent = (
        <>
            <Form.Group>
                <TextField
                    style={{ margin: "0.5rem" }}
                    id="conformer-count"
                    label="Map scale"
                    type="number"
                    variant="standard"
                    error={isNaN(parseInt(mapScale)) || parseInt(mapScale) < 0 || parseInt(mapScale) === Infinity}
                    value={mapScale}
                    onChange={evt => {
                        mapScaleRef.current = evt.target.value;
                        ScaleMap(evt.target.value);
                    }}
                />
            </Form.Group>
            <Button variant="primary" style={{ marginLeft: "0.1rem" }} onClick={onCompleted}>
                Scale Map
            </Button>
        </>
    );

    return (
        <MoorhenBaseMenuItem
            popoverPlacement="left"
            popoverContent={panelContent}
            menuItemText="Scale Map..."
            showOkButton={false}
            onCompleted={() => {}}
        />
    );
};
