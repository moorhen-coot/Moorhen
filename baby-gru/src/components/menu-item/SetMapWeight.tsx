import { useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import { MoorhenButton, MoorhenNumberInput } from "../inputs";
import { RootState } from "@/store";
import { MoorhenMap } from "@/utils/MoorhenMap";

export const SetMapWeight = (props: { map: MoorhenMap }) => {
    const [mapWeight, setMapWeight] = useState<number>(props.map.mapWeight ?? props.map.suggestedMapWeight);
    const activeMap = useSelector((state: RootState) => state.generalStates.activeMap);

    const estimateMapWeight = () => {
        const weight = props.map.estimateMapWeight();
        console.log(`Estimated map weight is ${weight}`);
        setMapWeight(weight);
    };

    const onCompleted = async () => {

        props.map.setMapWeight(mapWeight);
        document.body.click();
    };

    return (
        <>
            <MoorhenNumberInput
                label="Map weight"
                type="number"
                // error={isNaN(parseInt(mapWeight)) || parseInt(mapWeight) < 0 || parseInt(mapWeight) === Infinity}
                value={mapWeight}
                setValue={setMapWeight}
                width="6rem"
                integer
                // onChange={evt => {
                //     mapWeightRef.current = evt.target.value;
                //     setMapWeight(evt.target.value);
                // }}
            />
            <MoorhenButton variant="secondary" style={{ marginLeft: "0.1rem" }} onClick={estimateMapWeight}>
                Estimate
            </MoorhenButton>
            <MoorhenButton variant="primary" style={{ marginLeft: "0.1rem" }} onClick={onCompleted}>
                Set
            </MoorhenButton>
        </>
    );
};
