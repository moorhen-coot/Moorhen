import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoorhenIcon, MoorhenSpinner } from "../../icons";
import { MoorhenStack } from "../../interface-base";
import { UpdatingMapsSnackBar } from "./UpdatingMaps";
import "./activity-indicator.css";

export const ActivityIndicator = () => {
    const busy = useSelector((state: RootState) => state.globalUI.busy);
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const showHoverInfo = useSelector((state: RootState) => state.generalStates.showHoverInfo);
    const timeCapsuleBusy = useSelector((state: RootState) => state.globalUI.isTimeCapsuleBusy);    
    
    const chemShifts = useSelector((state: RootState) => state.molecules[0]?.chemShifts);
    const NMRMode = (hoveredAtom.molecule?.chemShifts?.length ?? 0) > 0;
    const updatingMapsIsEnabled = useSelector((state: RootState) => state.moleculeMapUpdate.updatingMapsIsEnabled);
    // A hover does not always name an atom. One that came from a molecular surface names the
    // residue behind the triangle under the pointer and stops there, so the CID is
    // "/1/A/23(ALA)" with no fifth field - and a residue with no name at all, from a CID
    // written elsewhere in the app, leaves nothing in the brackets to read.
    // A hover does not always name an atom. One that came from a molecular surface names the
    // residue behind the triangle under the pointer and stops there - "/1/A/23(ALA)", with no
    // fifth field - and its residue may carry an insertion code, "/1/A/52(ALA).B".
    //
    // The name is read out of the brackets rather than by counting characters in from each
    // end. That was exact for a three-letter code and nothing else: an insertion code after
    // the bracket turned ALA into "ALAla).", and a two-letter nucleotide came out as "a".
    const cidAsArray = hoveredAtom.cid?.split("/") || [];
    const residueField = cidAsArray[3] ?? "";
    const residueCode = residueField.match(/\(([^)]*)\)/)?.[1] ?? "";
    const residueName = residueCode ? residueCode[0] + residueCode.slice(1).toLowerCase() : "";
    const insertionCode = residueField.split(").")[1] ?? "";
    const residueNumber = residueField.split("(")[0] + insertionCode;
    const atomName = cidAsArray[4];
    const reformatedCid = [cidAsArray[2], `${residueName} ${residueNumber}`.trim(), atomName]
        .filter(Boolean)
        .join(" - ");
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
