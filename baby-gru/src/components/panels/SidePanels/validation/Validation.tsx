import { MoorhenStack } from "@/components/interface-base";
import { SidePanelContainer } from "../utils/SidePanelContainer";
import { ValidationChip } from "./ValidationChip";

export type ValidationPanelProps = {};

export const ValidationPanel = (props: ValidationPanelProps) => {
    return (
        <SidePanelContainer title="Validation test">
            <MoorhenStack gap={"-0.5rem"} style={{ marginTop: "0.5rem" }}>
                <ValidationChip />
                <ValidationChip />
                <ValidationChip />
                <ValidationChip />
                <ValidationChip />
            </MoorhenStack>
        </SidePanelContainer>
    );
};
