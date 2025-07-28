import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useSnackbar } from "notistack";
import { Backdrop } from "@mui/material";
import { Spinner, Stack } from "react-bootstrap";
import { moorhenGlobalInstance } from "../../InstanceManager/MoorhenGlobalInstance";
import { moorhen } from "../../types/moorhen";
import { LhasaComponent } from '../../LhasaReact/src/Lhasa';
import { modalKeys } from "../../utils/enums";
import { libcootApi } from "../../types/libcoot";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { addMolecule } from "../../store/moleculesSlice";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { emptyRdkitMoleculePickleList } from "../../store/lhasaSlice";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";

const LhasaWrapper = (props: {
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    urlPrefix: string;
}) => {

    const rdkitMoleculePickleList = useSelector((state: moorhen.State) => state.lhasa.rdkitMoleculePickleList)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const originState = useSelector((state: moorhen.State) => state.glRef.origin)

    const [isCootAttached, setCootAttached] = useState(window.cootModule !== undefined)

    const store = useStore()
    const commandCentre = moorhenGlobalInstance.getCommandCentreRef()
    const monomerLibraryPath = moorhenGlobalInstance.paths.monomerLibrary

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
        try {
            props.setBusy(true)
            const ligandName = id ?? "LIG"
            const smilesResult = await commandCentre.current.cootCommand({
                command: 'smiles_to_pdb',
                commandArgs: [smiles, ligandName, 10, 100],
                returnType: 'str_str_pair'
            }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>
            
            if (!smilesResult.data.result.result.second) {
                enqueueSnackbar("Unable to read SMILES...", {variant: "error"})
                props.setBusy(false)
                return
            }
    
            const readDictResult = await commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_dictionary_string',
                commandArgs: [smilesResult.data.result.result.second, -999999],
                changesMolecules: []
            }, false) as moorhen.WorkerResponse<number>

            if (readDictResult.data.result.result !== 1) {
                enqueueSnackbar("Unable to read dictionary...", {variant: "error"})
                props.setBusy(false)
                return
            }

            const getMonomerResult = await commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [ligandName, -999999, ...originState.map(coord => -coord)]
            }, true) as moorhen.WorkerResponse<number> 
    
            if (getMonomerResult.data.result.result === -1) {
                enqueueSnackbar("Unable to get monomer...", {variant: "error"})
            } else if (getMonomerResult.data.result.status === "Completed") {
                const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
                newMolecule.molNo = getMonomerResult.data.result.result
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
        } catch (err) {
            console.warn(err)
            enqueueSnackbar("Something went wrong...", {variant: "warning"})
            props.setBusy(false)
        }
    }, [commandCentre, store, monomerLibraryPath])

    return  isCootAttached ?
                <LhasaComponent 
                    Lhasa={window.cootModule}
                    show_footer={false}
                    show_top_panel={false}
                    rdkit_molecule_pickle_list={rdkitMoleculePickleList}
                    icons_path_prefix={`${props.urlPrefix}/pixmaps/lhasa_icons`}
                    name_of_host_program='Moorhen'
                    smiles_callback={smilesCallback}
                /> : null
}

export const MoorhenLhasaModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const urlPrefix = moorhenGlobalInstance.paths.urlPrefix;    

    const [busy, setBusy] = useState<boolean>(false)

    const dispatch = useDispatch()

    const handleClose = () => {
        dispatch(emptyRdkitMoleculePickleList())
    }

    return <MoorhenDraggableModalBase
                modalId={modalKeys.LHASA}
                left={width / 6}
                top={height / 3}
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
                        urlPrefix={urlPrefix}
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
