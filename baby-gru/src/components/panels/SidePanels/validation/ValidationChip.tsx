import { MoorhenButton } from "@/components/inputs";
import "./validation-chip.css";

export type ValidationChipProps = {};

export const ValidationChip = (props: ValidationChipProps) => {
    return (
        <div className="moorhen__validation-chip-container">
            <div className="moorhen__validation-chip-description">Test Chip</div>
            <div className="moorhen__validation-chip-buttons-bar">
                <MoorhenButton type="icon-only" icon="MatSymFilterFocus" />
            </div>
        </div>
    );
};
