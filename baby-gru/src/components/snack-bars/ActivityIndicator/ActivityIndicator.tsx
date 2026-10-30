import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoorhenIcon, MoorhenSpinner } from "../../icons";
import { MoorhenStack } from "../../interface-base";
import { UpdatingMapsSnackBar } from "./UpdatingMaps";
import "./activity-indicator.css";

/** How long the app must stay busy before the spinner shows, ms. */
const BUSY_SPINNER_DELAY = 300;

/**
 * `value`, but true only once it has stayed true for `delay` ms; false at once.
 *
 * The busy flag is set whenever any command is in flight in the Coot worker, and map recontours
 * send one on every camera move. Shown directly, the spinner flashed in and out of the hover box
 * the whole time the view moved. Delayed, quick commands never show it; long jobs still do.
 */
const useDelayedTrue = (value: boolean, delay: number): boolean => {
    const [delayed, setDelayed] = useState(false);
    useEffect(() => {
        if (!value) return;
        const timer = setTimeout(() => setDelayed(true), delay);
        // When value goes false (or the delay changes): forget it was ever shown.
        return () => {
            clearTimeout(timer);
            setDelayed(false);
        };
    }, [value, delay]);
    return value && delayed;
};

export const ActivityIndicator = () => {
    const busy = useDelayedTrue(useSelector((state: RootState) => state.globalUI.busy), BUSY_SPINNER_DELAY);
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const showHoverInfo = useSelector((state: RootState) => state.generalStates.showHoverInfo);
    const timeCapsuleBusy = useSelector((state: RootState) => state.globalUI.isTimeCapsuleBusy);    
    
    const chemShifts = useSelector((state: RootState) => state.molecules[0]?.chemShifts);
    const NMRMode = (hoveredAtom.molecule?.chemShifts?.length ?? 0) > 0;
    const updatingMapsIsEnabled = useSelector((state: RootState) => state.moleculeMapUpdate.updatingMapsIsEnabled);
    const cidAsArray = hoveredAtom.cid?.split("/") || [];
    const residueName = cidAsArray[3]?.split(`(`)[1].slice(0, -3) + cidAsArray[3]?.split(`(`)[1].slice(1, -1).toLowerCase();
    const residueNumber = cidAsArray[3]?.split(`(`)[0];
    const reformatedCid = `${cidAsArray[2]} - ${residueName} ${residueNumber} - ${cidAsArray[4]}`;
    const bFactorNOccupancy = hoveredAtom.atomInfo
        ? `B-Fact: ${hoveredAtom.atomInfo.tempFactor.toFixed(1)} Occ: ${hoveredAtom.atomInfo.occupancy.toFixed(2)}`
        : "";

    const glWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const atomChemShift = hoveredAtom.atomInfo
        ? hoveredAtom.molecule?.chemShifts?.find(
              cs =>
                  cs.atom === hoveredAtom.atomInfo.name &&
                  cs.chain === hoveredAtom.atomInfo.chain_id &&
                  `${cs.seq}` === `${hoveredAtom.atomInfo.res_no}` &&
                  cs.resname === hoveredAtom.atomInfo.res_name
          )
        : undefined;
    const chemShiftAtom = atomChemShift
        ? `δ: ${Number(atomChemShift.chemshift).toFixed(2)} ppm · amb: ${atomChemShift.ambiguityFlag ? "yes" : "no"}`
        : "δ: N/A";

    const lineStyle: React.CSSProperties = {
        display: "block",
        minWidth: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };
    const infoLine = NMRMode ? chemShiftAtom : bFactorNOccupancy;
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
        <div className="moorhen__activity-indicator-container" style={{ left: glWidth }}>
            {showHoverInfoPanel && (
                <div className="moorhen__activity-indicator">
                    {busyIndicator}
                    {showHoverInfo && hoveredAtom.cid && (
                        <MoorhenStack style={{ minWidth: "0" }}>
                            <span style={lineStyle} title={reformatedCid}>
                                {reformatedCid}
                            </span>
                            <span style={{ ...lineStyle, fontSize: "0.8em" }} title={infoLine}>
                                {infoLine}
                            </span>
                            <span style={{ ...lineStyle, fontSize: "0.8em" }} title={hoveredAtom.molecule.name}>
                                {hoveredAtom.molecule.name}
                            </span>
                        </MoorhenStack>
                    )}
                    {timeCapsuleBusy && <MoorhenIcon moorhenSVG="MatSymSaveClock" />}
                </div>
            )}
            {updatingMapsIsEnabled && (
                <div className="moorhen__activity-indicator">
                    {" "}
                    <UpdatingMapsSnackBar />
                </div>
            )}
        </div>
    );
};
