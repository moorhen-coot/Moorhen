import { useState, useEffect, useCallback, useMemo } from "react";
import { getMultiColourRuleArgs } from '../../utils/utils';
import { Card, Row, Col, Button, Stack, Spinner } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { enqueueSnackbar } from "notistack";
import { useQuery, gql } from "@apollo/client";
import { Skeleton } from "@mui/material";

const getPolimerInfoQuery = gql`
query GetPolimerInfo ($entryId: String! $entityId: String!) {
    entry(entry_id: $entryId) {
        entryInfo: rcsb_entry_info {
            resolution: resolution_combined
        }
        accessionInfo: rcsb_accession_info {
            date: initial_release_date
        }
        compModelInfo: rcsb_comp_model_provenance {
            db: source_db
            url: source_url
        }
    }
    entity: polymer_entity(entry_id: $entryId entity_id: $entityId) {
        entityIds: rcsb_polymer_entity_container_identifiers {
            authId: auth_asym_ids
        }
    }
}`

export const MoorhenQueryHitCard = (props: { 
    source: string;
    polimerEntity: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    store: ToolkitStore;
    selectedMolNo: number;
    selectedChain: string;
 }) => {

    const { 
        polimerEntity, commandCentre, source, selectedMolNo,
        glRef, monomerLibraryPath, store, selectedChain,
    } = props

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const [label, setLabel] = useState<string>(polimerEntity)

    const [entryId, entityId] = useMemo(() => {
        if (source === 'AFDB') {
            const entryId = polimerEntity.split('_')
            const entityId = entryId.pop()
            return [
                entryId.join("_"), 
                entityId
            ]
        } else {
            return [
                polimerEntity.slice(0, 4), 
                polimerEntity.slice(5)
            ]
        }
    }, [source, polimerEntity])

    const { loading, error, data } = useQuery(getPolimerInfoQuery, {
        variables: {
            entryId,
            entityId
        }
    })

    const dispatch = useDispatch()

    useEffect(() => {
        if (error) {
            console.warn(error.message)
            setLabel("Something went wrong... Unable to fetch.")
        } else if (data && source !== 'AFDB') {
            const chain = data.entity.entityIds.authId[0]
            const resolution = data.entry.entryInfo.resolution[0].toFixed(1)
            const depositionDate = new Date(data.entry.accessionInfo.date)
            const depositionYear = depositionDate.getFullYear()
            setLabel(
                `${entryId}:${chain} - ${resolution}Å - (${depositionYear})`
            )
        } else if (data) {
            const sourceDb = data.entry.compModelInfo.db
            const depositionDate = new Date(data.entry.accessionInfo.date)
            const depositionYear = depositionDate.getFullYear()
            setLabel(
                `${entryId} - ${sourceDb} - (${depositionYear})`
            )
        }
    }, [data, error])

    const fetchMoleculeFromURL = useCallback(async (url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(commandCentre, glRef, store, monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            if (newMolecule.molNo === -1) throw new Error("Cannot read the fetched molecule...")
            return newMolecule
        } catch (err) {
            enqueueSnackbar("Failed to read molecule", {variant: "error"})
            console.log(`Cannot fetch molecule from ${url}`)
        }
    }, [backgroundColor, defaultBondSmoothness])

    const fetchAndSuperpose = useCallback(async () => {
        const coordUrl = source === "AFDB" ? data.entry.compModelInfo.url : `https://files.rcsb.org/download/${entryId}.pdb`
        const chainId = data.entity.entityIds.authId[0]
        const newMolecule = await fetchMoleculeFromURL(coordUrl, polimerEntity)
        if (!newMolecule) {
            return
        }
        if (source === 'AFDB') {
            const colourRule = new MoorhenColourRule(
                'af2-plddt', "//*", "#ffffff", commandCentre, true
            )
            colourRule.setLabel("PLDDT")
            const ruleArgs = await getMultiColourRuleArgs(newMolecule, 'af2-plddt')
            colourRule.setArgs([ ruleArgs ])
            colourRule.setParentMolecule(newMolecule)
            newMolecule.defaultColourRules = [ colourRule ]
        } 
        await commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'SSM_superpose',
            returnType: 'superpose_results',
            commandArgs: [
                selectedMolNo,
                selectedChain,
                newMolecule.molNo,
                chainId
            ],
            changesMolecules: [newMolecule.molNo]
        }, true)                            
        newMolecule.setAtomsDirty(true)
        await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? 'CRs' : 'CBs')
        await newMolecule.centreOn('/*/*/*/*', true)
        dispatch( addMolecule(newMolecule) )
    }, [source, data, fetchMoleculeFromURL, selectedChain, selectedMolNo, entryId])

    return <Card key={polimerEntity} style={{marginTop: '0.5rem'}}>
        <Card.Body style={{padding:'0.5rem'}}>
            <Row style={{display:'flex', justifyContent:'between'}}>
                {loading ?
                <Stack direction="horizontal" gap={1} style={{ display: "flex", width: "100%" }}>
                    <Spinner variant="info"/>
                    <Stack gap={1} direction="vertical">
                        <Skeleton variant="rounded" width={"100%"} height={"100%"}/>
                        <Skeleton variant="rounded" width={"100%"} height={"100%"}/>
                    </Stack>
                </Stack>
                : 
                <>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                    <span>
                        {label}
                    </span>
                </Col>
                <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                    <Button style={{marginRight:'0.5rem'}} onClick={fetchAndSuperpose} disabled={Boolean(error)}>
                        Fetch
                    </Button>
                </Col>
                </>
                }
            </Row>
        </Card.Body>
    </Card>
}
