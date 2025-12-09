import { SaveOutlined } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";
import "./container.css";

export const ActivityIndicator = () => {
    const busy = useSelector((state: moorhen.State) => state.globalUI.busy);
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom);
    const showHoverInfo = useSelector((state: moorhen.State) => state.generalStates.showHoverInfo);
    const timeCapsuleBusy = useSelector((state: moorhen.State) => state.globalUI.isTimeCapsuleBusy);
    const cidAsArray = hoveredAtom.cid?.split("/") || [];
    const residueName = cidAsArray[3]?.split(`(`)[1].slice(0, -3) + cidAsArray[3]?.split(`(`)[1].slice(1, -1).toLowerCase();
    const residueNumber = cidAsArray[3]?.split(`(`)[0];
    const reformatedCid = `${cidAsArray[2]} - ${residueName} ${residueNumber} - ${cidAsArray[4]}`;
    const molName = hoveredAtom.molecule
        ? hoveredAtom.molecule.name.length > 24
            ? `${hoveredAtom.molecule.name.substring(0, 21)}...:`
            : `${hoveredAtom.molecule.name}`
        : null;

    const busyIndicator = busy ? (
        <>
            <CircularProgress color="inherit" size="1.6rem" />
            &nbsp;&nbsp;&nbsp;
        </>
    ) : null;

    const show = busy || timeCapsuleBusy || (showHoverInfo && hoveredAtom.cid);
    if (!show) {
        return null;
    }
    return (
        <div className="moorhen__activity-indicator">
            {busyIndicator}
            {showHoverInfo && hoveredAtom.cid && (
                <MoorhenStack>
                    <span>{reformatedCid}</span>
                    <span style={{ fontSize: "0.8em" }}>{molName}</span>
                </MoorhenStack>
            )}
            {timeCapsuleBusy && <SaveOutlined style={{ padding: 0, margin: 0, color: "black" }} />}
        </div>
    );
};
