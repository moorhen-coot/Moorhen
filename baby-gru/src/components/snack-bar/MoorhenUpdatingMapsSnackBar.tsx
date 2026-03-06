import { SnackbarContent, useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { disableUpdatingMaps, setCurrentScores } from "../../store/moleculeMapUpdateSlice";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenUpdatingMapsManager = () => {
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const updatingMapsIsEnabled = useSelector((state: moorhen.State) => state.moleculeMapUpdate.updatingMapsIsEnabled);
    const showScoresToast = useSelector((state: moorhen.State) => state.moleculeMapUpdate.showScoresToast);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const connectedMoleculeMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.connectedMolecule);
    const reflectionMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.reflectionMap);
    const foFcMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.foFcMap);
    const twoFoFcMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.twoFoFcMap);
    const uniqueMaps = useSelector((state: moorhen.State) => state.moleculeMapUpdate.uniqueMaps);
    const commandCentre = useCommandCentre();

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        // if (updatingMapsIsEnabled && showScoresToast) {
        //     enqueueSnackbar("updating-maps-scores", {
        //         variant: "updatingMaps",
        //         persist: true,
        //         commandCentre: commandCentre,
        //         anchorOrigin: { vertical: "top", horizontal: "right" },
        //     });
        // } else if (updatingMapsIsEnabled) {
        //     enqueueSnackbar("Adjust preferences to display scores after map updates", {variant: "info"})
        // }
    }, [updatingMapsIsEnabled, showScoresToast]);

    useEffect(() => {
        const handleConnectMaps = async () => {
            if (updatingMapsIsEnabled) {
                const currentScores = (await commandCentre.current.cootCommand(
                    {
                        returnType: "r_factor_stats",
                        command: "get_r_factor_stats",
                        commandArgs: [],
                    },
                    false
                )) as moorhen.WorkerResponse<{ r_factor: number; free_r_factor: number; rail_points_total: number }>;

                dispatch(
                    setCurrentScores({
                        rFactor: currentScores.data.result.result.r_factor,
                        rFree: currentScores.data.result.result.free_r_factor,
                        moorhenPoints: currentScores.data.result.result.rail_points_total,
                    })
                );

                const selectedMolecule = molecules.find(molecule => molecule.molNo === connectedMoleculeMolNo);
                selectedMolecule.connectedToMaps = [reflectionMap, twoFoFcMap, foFcMap];
            }
        };

        handleConnectMaps();
    }, [updatingMapsIsEnabled]);

    useEffect(() => {
        const handleScoresUpdate = async () => {
            if (updateMolNo !== null && connectedMoleculeMolNo === updateMolNo) {
                await Promise.all(
                    maps
                        .filter(map => uniqueMaps.includes(map.molNo))
                        .map(map => {
                            return map.drawMapContour();
                        })
                );

                const currentScores = (await commandCentre.current.cootCommand(
                    {
                        returnType: "r_factor_stats",
                        command: "get_r_factor_stats",
                        commandArgs: [],
                    },
                    false
                )) as moorhen.WorkerResponse<{ r_factor: number; free_r_factor: number; rail_points_total: number }>;

                dispatch(
                    setCurrentScores({
                        rFactor: currentScores.data.result.result.r_factor,
                        rFree: currentScores.data.result.result.free_r_factor,
                        moorhenPoints: currentScores.data.result.result.rail_points_total,
                    })
                );
            }
        };
        handleScoresUpdate();
    }, [updateSwitch]);

    const disconnectMaps = useCallback(() => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === connectedMoleculeMolNo);
        if (selectedMolecule) {
            selectedMolecule.connectedToMaps = null;
        }
        dispatch(disableUpdatingMaps());
    }, [molecules]);

    useEffect(() => {
        if (molecules.length === 0) {
            disconnectMaps();
        } else if (!molecules.map(molecule => molecule.molNo).includes(connectedMoleculeMolNo)) {
            disconnectMaps();
        }
    }, [molecules]);

    useEffect(() => {
        const mapsMolNo: number[] = maps.map(map => map.molNo);
        if (mapsMolNo.length === 0) {
            disconnectMaps();
        } else if (!uniqueMaps.every(mapMolNo => mapsMolNo.includes(mapMolNo))) {
            disconnectMaps();
        }
    }, [maps]);

    return null;
};

export const MoorhenUpdatingMapsSnackBar = () => {
    const [innerRFactorDiff, setInnerRFactorDiff] = useState<string | null>(null);
    const [innerRFreeDiff, setInnerRFreeDiff] = useState<string | null>(null);
    const [innerMoorhenPointsDiff, setInnerMoorhenPointsDiff] = useState<string | null>(null);

    const showScoresToast = useSelector((state: moorhen.State) => state.moleculeMapUpdate.showScoresToast);
    const rFactor = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScores.rFactor);
    const rFree = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScores.rFactor);
    const moorhenPoints = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScores.moorhenPoints);
    const rFactorDiff = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScoreDiffs.rFactor);
    const rFreeDiff = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScoreDiffs.rFactor);
    const moorhenPointsDiff = useSelector((state: moorhen.State) => state.moleculeMapUpdate.currentScoreDiffs.moorhenPoints);
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.moleculeMapUpdate.defaultUpdatingScores);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const updatingMapsIsEnabled = useSelector((state: moorhen.State) => state.moleculeMapUpdate.updatingMapsIsEnabled);

    // const { closeSnackbar } = useSnackbar();

    // useEffect(() => {
    //     if (!showScoresToast || !updatingMapsIsEnabled) {
    //         closeSnackbar(props.id);
    //     }
    // }, [showScoresToast, updatingMapsIsEnabled]);

    useEffect(() => {
        if (rFactorDiff !== null) {
            setInnerRFactorDiff(`${rFactorDiff < 0 ? "" : "+"}${rFactorDiff.toFixed(3)}`);
            setTimeout(() => {
                setInnerRFactorDiff(null);
            }, 3000);
        }
    }, [rFactorDiff]);

    useEffect(() => {
        if (rFreeDiff !== null) {
            setInnerRFreeDiff(`${rFreeDiff < 0 ? "" : "+"}${rFreeDiff.toFixed(3)}`);
            setTimeout(() => {
                setInnerRFreeDiff(null);
            }, 3000);
        }
    }, [rFreeDiff]);

    useEffect(() => {
        if (moorhenPointsDiff !== null) {
            setInnerMoorhenPointsDiff(`${moorhenPointsDiff < 0 ? "" : "+"}${moorhenPointsDiff}`);
            setTimeout(() => {
                setInnerMoorhenPointsDiff(null);
            }, 3000);
        }
    }, [moorhenPointsDiff]);

    return (
        <MoorhenStack>
            {defaultUpdatingScores.includes("Rfactor") && (
                <span
                    style={{
                        paddingLeft: "0.5rem",
                        marginBottom: "0rem",
                        fontSize: "0.9rem",
                        color: innerRFactorDiff === null ? "" : rFactorDiff < 0 ? "green" : "red",
                    }}
                >
                    Clipper R-Factor {innerRFactorDiff === null ? rFactor?.toFixed(3) : innerRFactorDiff}
                </span>
            )}
            {defaultUpdatingScores.includes("Rfree") && (
                <span
                    style={{
                        paddingLeft: "0.5rem",
                        marginBottom: "0rem",
                        fontSize: "0.9rem",
                        color: innerRFreeDiff === null ? "" : rFreeDiff < 0 ? "green" : "red",
                    }}
                >
                    Clipper R-Free {innerRFactorDiff === null ? rFree?.toFixed(3) : innerRFactorDiff}
                </span>
            )}
            {defaultUpdatingScores.includes("Moorhen Points") && (
                <span
                    style={{
                        paddingLeft: "0.5rem",
                        marginBottom: "0rem",
                        fontSize: "0.9rem",
                        color: innerMoorhenPointsDiff === null ? "" : moorhenPointsDiff < 0 ? "red" : "green",
                    }}
                >
                    Moorhen Points {innerRFactorDiff === null ? moorhenPoints?.toFixed(3) : innerRFactorDiff}
                </span>
            )}
        </MoorhenStack>
    );
};

MoorhenUpdatingMapsSnackBar.displayName = "MoorhenUpdatingMapsSnackBar";
