import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { moorhen } from "../../types/moorhen";
import { LhasaComponent } from '../../LhasaReact/src/Lhasa';
import { modalKeys } from "../../utils/enums";
import { libcootApi } from "../../types/libcoot";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { useSnackbar } from "notistack";
import { addMolecule } from "../../store/moleculesSlice";
import { webGL } from "../../types/mgWebGL";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { Backdrop } from "@mui/material";
import { Spinner, Stack } from "react-bootstrap";
import { emptyRdkitMoleculePickleList } from "../../store/lhasaSlice";

const LhasaWrapper = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    store: ToolkitStore;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const rdkitMoleculePickleList = useSelector((state: moorhen.State) => state.lhasa.rdkitMoleculePickleList)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const [isCootAttached, setCootAttached] = useState(window.cootModule !== undefined)

    // FIXME: Lhasa should really be able to take the array of objects directly instead of having to do this stupid conversion at every redux update...
    const rdkitMoleculePickleMap = useMemo(() => {
        const rdkitMolPickleMap: Map<string, string> = new Map()
        rdkitMoleculePickleList.forEach(item => rdkitMolPickleMap.set(item.id, item.pickle))
        return rdkitMolPickleMap
    }, [rdkitMoleculePickleList])

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    const handleCootAttached = useCallback(() => {
        if (window.cootModule !== undefined) {
            setCootAttached(true)
        } else {
            console.warn("Unable to locate coot module... Cannot start Lhasa.")
        }
    }, [])

    useEffect(() => {
        document.addEventListener('cootModuleAttached', handleCootAttached)
        return () => {
            document.removeEventListener('cootModuleAttached', handleCootAttached)
        };
    }, [handleCootAttached])

    const smilesCallback = useCallback(async (internalLhasaID: number, id: string, smiles: string) => {
        props.setBusy(true)
        const ligandName = id ?? "LIG"
        const smilesResult = await props.commandCentre.current.cootCommand({
            command: 'smiles_to_pdb',
            commandArgs: [smiles, ligandName, 10, 100],
            returnType: 'str_str_pair'
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>

        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'read_dictionary_string',
            commandArgs: [smilesResult.data.result.result.second, -999999],
            changesMolecules: []
        }, false)
        
        const result = await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'get_monomer_and_position_at',
            commandArgs: [ligandName, -999999, ...props.glRef.current.origin.map(coord => -coord)]
        }, true) as moorhen.WorkerResponse<number> 

        if (result.data.result.status === "Completed") {
            const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
            newMolecule.molNo = result.data.result.result
            newMolecule.name = ligandName
            newMolecule.setBackgroundColour(backgroundColor)
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
            newMolecule.coordsFormat = 'mmcif'
            await Promise.all([
                newMolecule.fetchDefaultColourRules(),
                newMolecule.addDict(smilesResult.data.result.result.second)
            ])
            await newMolecule.fetchIfDirtyAndDraw("CBs")
            dispatch( addMolecule(newMolecule) )
        } else {
            enqueueSnackbar("Something went wrong...", {variant: "warning"})
        }
        props.setBusy(false)
    }, [props.commandCentre, props.glRef, props.store, props.monomerLibraryPath])

    return  isCootAttached ?
                <LhasaComponent 
                    Lhasa={window.cootModule}
                    show_footer={false}
                    show_top_panel={false}
                    rdkit_molecule_pickle_map={rdkitMoleculePickleMap}
                    icons_path_prefix='/pixmaps/lhasa_icons'
                    name_of_host_program='Moorhen'
                    smiles_callback={smilesCallback}
                /> : null
}

export const MoorhenLhasaModal = (props: moorhen.CollectedProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [busy, setBusy] = useState<boolean>(false)

    const dispatch = useDispatch()

    const handleClose = () => {
        dispatch(emptyRdkitMoleculePickleList())
    }

    return <MoorhenDraggableModalBase
                modalId={modalKeys.LHASA}
                left={width / 6}
                top={height / 3}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Lhasa'
                resizeNodeRef={resizeNodeRef}
                onClose={handleClose}
                body={ 
                    <LhasaWrapper
                        commandCentre={props.commandCentre}
                        glRef={props.glRef}
                        monomerLibraryPath={props.monomerLibraryPath}
                        store={props.store}
                        setBusy={setBusy}/>
                }
                additionalChildren={
                    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                        <Stack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
                            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                            <span>Please wait...</span>
                        </Stack>
                    </Backdrop>
                }
            />
}
