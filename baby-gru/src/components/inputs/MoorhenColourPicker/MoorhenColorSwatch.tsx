import { MoorhenButton } from "..";
import { MoorhenGrid } from "../../interface-base/Stack/Grid";

type MoorhenColorSwatchProps = {
    cols?: string[];
    size?: number;
    columns?: number;
    onClick: (colour: string) => void;
};

const defaultSwatches = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
    "#00bcd4",
    "#009688",
    "#4caf50",
    "#8bc34a",
    "#cddc39",
    "#ffeb3b",
    "#ffc107",
    "#ff9800",
    "#ff5722",
    "#795548",
    "#607d8b",
];
export const MoorhenColorSwatch = (props: MoorhenColorSwatchProps) => {


    const { size = 20, columns = 5, cols = defaultSwatches, onClick = () => {} } = props;

    return (
        <>
            <MoorhenGrid columns={columns} gap="5px" style={{ margin: "2px", padding: "2px", border: "1px solid var(--moorhen-border)", borderRadius: "5px"}}>
                {cols.map((c, i) => {
                    return (
                        <div key={i}>
                            <MoorhenButton
                                onClick={e => onClick(c)}
                                variant="white"
                                style={{ padding: 0, minWidth: 0, minHeight: 0, width: size, height: size, borderRadius: "50%" }}
                            >
                                <div
                                    style={{ padding: 0, margin: 0, backgroundColor: c, width: size, height: size, borderRadius: "50%" }}
                                />
                            </MoorhenButton>
                        </div>
                    );
                })}
            </MoorhenGrid>
        </>
    );
};
