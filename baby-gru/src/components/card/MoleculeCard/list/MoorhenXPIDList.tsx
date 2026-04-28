import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenAccordion, MoorhenInfoCard } from "@/components/interface-base";
import { addGeneralRepresentation, removeGeneralRepresentation } from "@/store";
import { moorhen } from "../../../../types/moorhen";
import { privateer } from "../../../../types/privateer";
import { MoorhenCarbohydrateCard } from "../../MoorhenCarbohydrateCard";


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

    const validate = async () => {
        props.setBusy?.(true);
        const result = window.CCP4Module.detect_xhpi_interactions_json(props.molecule.gemmiStructure)
        setXpidList(JSON.parse(result));
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

    return (
        <MoorhenAccordion title="XH-PI Interactions">
            {xpidList === null ? (
                <LinearProgress variant="indeterminate" />
            ) : xpidList.length > 0 ? (
                    /*
                    {xpidList.map(carbohydrate => {
                        return <MoorhenCarbohydrateCard key={carbohydrate.id} carbohydrate={carbohydrate} molecule={props.molecule} />;
                    })}
                    */
                <>
                    {xpidList.map((xpi,idx) => {
                        const key = xpi.X_id+"_"+xpi.H_atom+"_"+xpi.X_atom+"_"+xpi.X_chain+"_"+xpi.X_res+xpi.pi_id+"_"+"_"+xpi.pi_chain+"_"+xpi.pi_res + "_" + idx
                        return <div key={key}>{xpi.X_chain+"/"+xpi.X_id+"("+xpi.X_res+")/"+xpi.X_atom+" -- " +xpi.pi_chain+"/"+xpi.pi_id+"("+xpi.pi_res+")"}</div>
                    })}
                </>
            ) : (
                <div>
                    <b>No XH-PI interactions</b>
                </div>
            )}
        </MoorhenAccordion>
    );
};

const privateerInfoText = (
    <>
        <h1>XPID</h1>
        <p>This plugin uses XPID_Moorhen to generate XH-PI data.</p>
        <a href="https://github.com/SeanWang5868/xpid_moorhen/tree/main" target="_blank" rel="noreferrer">
            Privateer Website
        </a>
    </>
);
