import { useDispatch } from "react-redux";
import { useCommandCentre } from "../../InstanceManager";
import { setOrigin } from "../../store/glRefSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenUnmodelledBlobs = () => {
    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    //FIXME - RMSD cutoff should be user settable.
    async function fetchCardData(selectedModel: number, selectedMap: number): Promise<libcootApi.InterestingPlaceDataJS[]> {
        const inputData = {
            message: "coot_command",
            command: "unmodelled_blobs",
            returnType: "interesting_places_data",
            commandArgs: [selectedModel, selectedMap, 1.4],
        };
        const response = (await commandCentre.current.cootCommand(inputData, false)) as moorhen.WorkerResponse<
            libcootApi.InterestingPlaceDataJS[]
        >;
        const blobs = response.data.result.result;
        return blobs;
    }

    const getCards = (selectedModel: number, selectedMap: number, blobs: libcootApi.InterestingPlaceDataJS[]) => {
        return blobs.map((blob, index) => {
            return (
                <MoorhenStack gap={"1rem"} direction="row">
                    <label style={{ height:"2.1rem", display: "flex", alignItems: "center" }}>{`${blob.buttonLabel} ( size: ${blob.featureValue.toFixed(2)} )`}</label>
                    <MoorhenStack direction="row" style={{ display: "flex", marginLeft: "auto", marginRight: "0rem" }}>
                    <MoorhenButton
                        style={{ display: "flex", marginLeft: "auto", marginRight: "0.1rem" }}
                        onClick={() => {
                            dispatch(setOrigin([-blob.coordX, -blob.coordY, -blob.coordZ]));
                        }}
                    >
                        View
                    </MoorhenButton>
                </MoorhenStack>
                </MoorhenStack>
            );
        });
    };

    return <MoorhenValidationListWidgetBase fetchData={fetchCardData} getCards={getCards} menuId="unmodelled-blobs-validation" />;
};
