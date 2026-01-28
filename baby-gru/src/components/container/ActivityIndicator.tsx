import { SaveOutlined } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoorhenSpinner } from "../icons";
import { MoorhenStack } from "../interface-base";
import { MoorhenUpdatingMapsManager, MoorhenUpdatingMapsSnackBar } from "../snack-bar/MoorhenUpdatingMapsSnackBar";
import "./container.css";

export const ActivityIndicator = () => {
    const busy = useSelector((state: RootState) => state.globalUI.busy);
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const showHoverInfo = useSelector((state: RootState) => state.generalStates.showHoverInfo);
    const timeCapsuleBusy = useSelector((state: RootState) => state.globalUI.isTimeCapsuleBusy);
    const updatingMapsIsEnabled = useSelector((state: RootState) => state.moleculeMapUpdate.updatingMapsIsEnabled);
    const cidAsArray = hoveredAtom.cid?.split("/") || [];
    const residueName = cidAsArray[3]?.split(`(`)[1].slice(0, -3) + cidAsArray[3]?.split(`(`)[1].slice(1, -1).toLowerCase();
    const residueNumber = cidAsArray[3]?.split(`(`)[0];
    const reformatedCid = `${cidAsArray[2]} - ${residueName} ${residueNumber} - ${cidAsArray[4]}`;
    const bFactorNOccupancy = hoveredAtom.atomInfo
        ? `B-Fact: ${hoveredAtom.atomInfo.tempFactor.toFixed(1)} Occ: ${hoveredAtom.atomInfo.occupancy.toFixed(2)}`
        : "";
    const busyIndicator = busy ? (
        <>
            <MoorhenSpinner size="3rem" />
            &nbsp;&nbsp;&nbsp;
        </>
    ) : null;

    const show = busy || timeCapsuleBusy || (showHoverInfo && hoveredAtom.cid) || updatingMapsIsEnabled;
    if (!show) {
        return null;
    }

    const showHoverInfoPanel = busy || timeCapsuleBusy || (showHoverInfo && hoveredAtom.cid);
    return (
        <div className="moorhen__activity-indicator-container">
            {showHoverInfoPanel && (
                <div className="moorhen__activity-indicator">
                    {busyIndicator}
                    {showHoverInfo && hoveredAtom.cid && (
                        <MoorhenStack style={{ minWidth: "0" }}>
                            <span>{reformatedCid}</span>
                            <span style={{ fontSize: "0.8em" }}>{bFactorNOccupancy}</span>
                            <span
                                style={{
                                    fontSize: "0.8em",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                    minWidth: 0,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    border: "none",
                                }}
                            >
                                {hoveredAtom.molecule.name}
                            </span>
                        </MoorhenStack>
                    )}
                    {timeCapsuleBusy && <SaveOutlined style={{ padding: 0, margin: 0, color: "black" }} />}
                </div>
            )}
            {updatingMapsIsEnabled && (
                <div className="moorhen__activity-indicator">
                    {" "}
                    <MoorhenUpdatingMapsSnackBar />
                </div>
            )}
        </div>
    );
};
