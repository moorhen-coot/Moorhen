import { SaveOutlined } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import "./container.css";

export const ActivityIndicator = () => {
    const busy = useSelector((state: moorhen.State) => state.globalUI.busy);
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom);
    const showHoverInfo = useSelector((state: moorhen.State) => state.generalStates.showHoverInfo);
    const timeCapsuleBusy = useSelector((state: moorhen.State) => state.globalUI.isTimeCapsuleBusy);
    const text = hoveredAtom.molecule
        ? hoveredAtom.molecule.name.length > 16
            ? `${hoveredAtom.molecule.name.substring(0, 13)}...:\u00A0\u00A0\u00A0${hoveredAtom.cid}`
            : `${hoveredAtom.molecule.name}:\u00A0\u00A0\u00A0${hoveredAtom.cid}`
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
    console.log(showHoverInfo, hoveredAtom.cid);
    return (
        <div className="moorhen__activity-indicator">
            {busyIndicator}
            {showHoverInfo && hoveredAtom.cid && <div>{text}</div>}
            {timeCapsuleBusy && <SaveOutlined style={{ padding: 0, margin: 0, color: "black" }} />}
        </div>
    );
};
