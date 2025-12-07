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
    const cidAsArray = hoveredAtom.cid?.split("/") || [];
    const reformatedCid = `${cidAsArray[2]} - ${cidAsArray[3]} - ${cidAsArray[4]}`;
    const text = hoveredAtom.molecule
        ? hoveredAtom.molecule.name.length > 16
            ? `${hoveredAtom.molecule.name.substring(0, 13)}...:\u00A0\u00A0\u00A0${reformatedCid}`
            : `${hoveredAtom.molecule.name}:\u00A0\u00A0\u00A0${reformatedCid}`
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
            {showHoverInfo && hoveredAtom.cid && <div>{text}</div>}
            {timeCapsuleBusy && <SaveOutlined style={{ padding: 0, margin: 0, color: "black" }} />}
        </div>
    );
};
