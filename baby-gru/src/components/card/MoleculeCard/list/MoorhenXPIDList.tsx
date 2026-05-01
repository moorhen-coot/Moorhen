import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton, MoorhenColourPicker } from "@/components/inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { moorhen } from "../../../../types/moorhen";
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
    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList)
    const [vectorColour, setVectorColour] = useState({ r: 255, g: 0, b: 0 });

    const [xpidList, setXpidList] = useState<MoorhenXPIDResult[] | null>(null);
    const [xpidVisibleList, setXpidVisibleList] = useState<boolean[] | null>(null);
    const [xpidVectorsList, setXpidVectorsList] = useState<MoorhenVector[] | null>(null);

    const moorhenGlobalInstance = useMoorhenInstance()

    const validate = async () => {
        props.setBusy?.(true);
        const structure = window.CCP4Module.cloneGemmiStructureWithTrimmedAtomNames(props.molecule.gemmiStructure)
        const result = window.CCP4Module.detect_xhpi_interactions_json(structure)
        structure.delete()
        const interactions = JSON.parse(result)
        const theVectors = []
        const visibleList:boolean[]  = []
        interactions.forEach((inter,idx) => {
            const dispInter = inter as MoorhenXPIDResult
            const key = "__TAG_XPID_" +
                props.molecule.uniqueId +inter.X_id+"_"+inter.H_atom+"_"+inter.X_atom+"_"+inter.X_chain+"_"+inter.X_res+inter.pi_id+"_"+"_"+inter.pi_chain+"_"+inter.pi_res + "_" + idx
            const matchingKeyVectors = vectorsList.filter(v => {
                return v.uniqueId===key
                })
            if(matchingKeyVectors.length===0)
                visibleList.push(false)
            else {
                visibleList.push(true)
                setVectorColour(matchingKeyVectors[0].vectorColour);
            }
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
                molFromUniqueId: "",
                molToUniqueId: "",
                uniqueId: key,
                vectorColour: vectorColour,
                textColour: { r: 0, g: 0, b: 0 },
                radius: 0.1,
            };
            theVectors.push(aVector)
        })
        setXpidList(interactions);
        setXpidVisibleList(visibleList);
        setXpidVectorsList(theVectors)
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

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        setVectorColour(color);
        dispatch(removeVectors(xpidVectorsList))
        const newVectors = xpidVectorsList.map(v => Object.assign({}, v, {vectorColour : vectorColour}))
        setXpidVectorsList(newVectors)
        dispatch(addVectors(newVectors))
    };

    return (
        <MoorhenAccordion title="XH-Pi Interactions" extraControls={extraControl} defaultOpen>
            {xpidList === null ? (
                <LinearProgress variant="indeterminate" />
            ) : xpidList.length > 0 ? (
                <>
                <MoorhenStack inputGrid gridWidth={3}>
                <MoorhenButton variant="primary" onClick={() => {
                    const newVisList = Array(xpidVisibleList.length).fill(true)
                    setXpidVisibleList(newVisList);
                    dispatch(addVectors(xpidVectorsList))
                }}>Show&nbsp;all</MoorhenButton>
                <MoorhenButton variant="primary" onClick={() => {
                    const newVisList = Array(xpidVisibleList.length).fill(false)
                    setXpidVisibleList(newVisList);
                    dispatch(removeVectors(xpidVectorsList))
                }}>Hide&nbsp;all</MoorhenButton>
                <MoorhenColourPicker
                    colour={[vectorColour.r, vectorColour.g, vectorColour.b]}
                    setColour={color => {
                        handleColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    position="right"
                    tooltip="Change vector colour"
                />
                </MoorhenStack>
                <MoorhenStack inputGrid>
                    {xpidList.map((xpi,idx) => {
                        const key = xpi.X_id+"_"+xpi.H_atom+"_"+xpi.X_atom+"_"+xpi.X_chain+"_"+xpi.X_res+xpi.pi_id+"_"+"_"+xpi.pi_chain+"_"+xpi.pi_res + "_" + idx
                        const text = xpi.X_chain+"/"+xpi.X_id+"("+xpi.X_res+")/"+xpi.X_atom+" -> " +xpi.pi_chain+"/"+xpi.pi_id+"("+xpi.pi_res+")"
                        return (<>
                        <MoorhenToggle key={key} label={text} checked={xpidVisibleList[idx]} onChange={() => {
                            const newVisList = [...xpidVisibleList]
                            newVisList[idx] = !newVisList[idx]
                            setXpidVisibleList(newVisList);
                            dispatch(removeVectors(xpidVectorsList))
                            const visVectors = xpidVectorsList.filter((vec,vecIdx) => newVisList[vecIdx])
                            dispatch(addVectors(visVectors))
                        }}/>
                        <MoorhenButton
                            key={"center_"+key}
                            size="accordion"
                            onClick={() => {
                                const newVisList = [...xpidVisibleList]
                                newVisList[idx] = true
                                setXpidVisibleList(newVisList);
                                dispatch(removeVectors(xpidVectorsList))
                                const visVectors = xpidVectorsList.filter((vec,vecIdx) => newVisList[vecIdx])
                                dispatch(addVectors(visVectors))
                                moorhenGlobalInstance.centerOnCoordinate(-xpi.X_xyz_x,-xpi.X_xyz_y,-xpi.X_xyz_z)
                            }}
                            type="icon-only"
                            icon="MatSymFilterFocus"
                            tooltip="Center on molecule"
                        />
                        </>)
                    })}
                </MoorhenStack>
                </>
            ) : (
                <div>
                    <b>No XH-Pi interactions</b>
                </div>
            )}
        </MoorhenAccordion>
    );
};

const xpidInfoText = (
    <>
        <h1>XPID</h1>
        <p>This plugin uses XPID Moorhen to generate XH-Pi data.</p>
        <a href="https://github.com/SeanWang5868/xpid_moorhen/tree/main" target="_blank" rel="noreferrer">
            XPID Moorhen source
        </a>
    </>
);
