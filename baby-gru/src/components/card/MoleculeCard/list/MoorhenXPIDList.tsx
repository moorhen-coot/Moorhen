import { v4 as uuidv4 } from "uuid";
import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { addGeneralRepresentation, removeGeneralRepresentation } from "@/store";
import { moorhen } from "../../../../types/moorhen";
import { privateer } from "../../../../types/privateer";
import { MoorhenCarbohydrateCard } from "../../MoorhenCarbohydrateCard";
import { MoorhenToggle } from "@/components/inputs/MoorhenToggle/Toggle"
import { addVectors, removeVectors, MoorhenVector } from "../../../../store/vectorsSlice";
import { useMoorhenInstance } from "../../../../InstanceManager";

export interface MoorhenXPIDResult {
    H_atom : string
    X_atom : string
    X_chain : string
    X_id : number
    X_res : string
    X_xyz_x : number
    X_xyz_y : number
    X_xyz_z : number
    angle_xh_pi : number
    angle_xpcn : number
    dist_X_Pi : number
    method : string
    model : string
    pdb : string
    pi_center_x : number
    pi_center_y : number
    pi_center_z : number
    pi_chain : string
    pi_id : number
    pi_res : string
    proj_dist : number
    theta : number
}

export const MoorhenXPIDList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule;
    height?: number | string;
}) => {
    const dispatch = useDispatch();
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);

    const [xpidList, setXpidList] = useState<MoorhenXPIDResult[] | null>(null);
    const [xpidVisibleList, setXpidVisibleList] = useState<boolean[] | null>(null);
    const [vectorsList, setVectorsList] = useState<MoorhenVector[] | null>(null);

    const moorhenGlobalInstance = useMoorhenInstance()

    const validate = async () => {
        props.setBusy?.(true);
        const result = window.CCP4Module.detect_xhpi_interactions_json(props.molecule.gemmiStructure)
        const interactions = JSON.parse(result)
        const theVectors = []
        const visibleList:boolean[]  = []
        interactions.forEach((inter,idx) => {
            const dispInter = inter as MoorhenXPIDResult
            visibleList.push(false)
            const key = inter.X_id+"_"+inter.H_atom+"_"+inter.X_atom+"_"+inter.X_chain+"_"+inter.X_res+inter.pi_id+"_"+"_"+inter.pi_chain+"_"+inter.pi_res + "_" + idx
            const aVector: MoorhenVector = {
                coordsMode: "points",
                labelMode: "none",
                labelText: "vector label",
                drawMode: "dashedcylinder",
                arrowMode: "end",
                xFrom: inter.X_xyz_x,
                yFrom: inter.X_xyz_y,
                zFrom: inter.X_xyz_z,
                xTo: inter.pi_center_x,
                yTo: inter.pi_center_y,
                zTo: inter.pi_center_z,
                cidFrom: "",
                cidTo: "",
                molNoFrom: 0,
                molNoTo: 0,
                uniqueId: key,
                vectorColour: { r: 255, g: 0, b: 0 },
                textColour: { r: 0, g: 0, b: 0 },
                radius: 0.1,
            };
            theVectors.push(aVector)
        })
        setXpidList(interactions);
        setXpidVisibleList(visibleList);
        setVectorsList(theVectors)
        props.setBusy?.(false);
    };

    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo) {
            validate();
        }
    }, [updateSwitch]);

    useEffect(() => {
        validate();
    }, []);

    const extraControl = [
        <MoorhenInfoCard infoText={xpidInfoText} />,
    ];

    return (
        <MoorhenAccordion title="XH-PI Interactions" extraControls={extraControl}>
            {xpidList === null ? (
                <LinearProgress variant="indeterminate" />
            ) : xpidList.length > 0 ? (
                <MoorhenStack inputGrid>
                    {xpidList.map((xpi,idx) => {
                        const key = xpi.X_id+"_"+xpi.H_atom+"_"+xpi.X_atom+"_"+xpi.X_chain+"_"+xpi.X_res+xpi.pi_id+"_"+"_"+xpi.pi_chain+"_"+xpi.pi_res + "_" + idx
                        const text = xpi.X_chain+"/"+xpi.X_id+"("+xpi.X_res+")/"+xpi.X_atom+" -> " +xpi.pi_chain+"/"+xpi.pi_id+"("+xpi.pi_res+")"
                        return (<>
                        <MoorhenToggle key={key} label={text} checked={xpidVisibleList[idx]} onChange={() => {
                            const newVisList = [...xpidVisibleList]
                            newVisList[idx] = !newVisList[idx]
                            setXpidVisibleList(newVisList);
                            dispatch(removeVectors(vectorsList))
                            const visVectors = vectorsList.filter((vec,vecIdx) => newVisList[vecIdx])
                            dispatch(addVectors(visVectors))
                        }}/>
                        <MoorhenButton
                            key={"center_"+key}
                            size="accordion"
                            onClick={() => {moorhenGlobalInstance.centerOnCoordinate(-xpi.X_xyz_x,-xpi.X_xyz_y,-xpi.X_xyz_z)}}
                            type="icon-only"
                            icon="MatSymFilterFocus"
                            tooltip="Center on molecule"
                        />
                        </>)
                    })}
                </MoorhenStack>
            ) : (
                <div>
                    <b>No XH-PI interactions</b>
                </div>
            )}
        </MoorhenAccordion>
    );
};

const xpidInfoText = (
    <>
        <h1>XPID</h1>
        <p>This plugin uses XPID Moorhen to generate XH-PI data.</p>
        <a href="https://github.com/SeanWang5868/xpid_moorhen/tree/main" target="_blank" rel="noreferrer">
            XPID Moorhen source
        </a>
    </>
);
