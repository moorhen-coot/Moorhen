import { useCallback, useMemo } from "react";
import { getMultiColourRuleArgs } from '../../utils/utils';
import { Card, Row, Col, Button } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";
import { Store } from "@reduxjs/toolkit";
import { enqueueSnackbar } from "notistack";
import { GetPolimerInfoQuery } from "../../utils/__graphql__/graphql";

export const MoorhenQueryHitCard = (props: { 
    data: GetPolimerInfoQuery;
    idx: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    store: Store;
    selectedMolNo: number;
    selectedChain: string;
 }) => {

    const { 
        commandCentre, selectedMolNo, data, idx,
        glRef, monomerLibraryPath, store, selectedChain,
    } = props

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const dispatch = useDispatch()

    const { entryInfo, entityInfo, label } = useMemo(() => {
        const entryInfo = data.entryInfo[idx]
        const entityInfo = data.entityInfo[idx]
        const depositionDate = new Date(entryInfo.accessionInfo.date)
        const depositionYear = depositionDate.getFullYear()
        
        let label: string
        if (entryInfo.compModelInfo) {
            label = `${entryInfo.entryId} - ${entryInfo.compModelInfo.db} - (${depositionYear})`
        } else {
            const chain = entityInfo.entityIds.authId[0]
            const resolution = entryInfo.info.resolution[0].toFixed(1)
            label = `${entryInfo.entryId}:${chain} - ${resolution}Å - (${depositionYear})`
        }

        return {
            entryInfo,
            entityInfo,
            label
        }
    }, [data, idx])

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
            console.warn(`Cannot fetch molecule from ${url}`)
        }
    }, [backgroundColor, defaultBondSmoothness])

    const fetchAndSuperpose = useCallback(async () => {
        const coordUrl = entryInfo.compModelInfo?.url ?? `https://files.rcsb.org/download/${entryInfo.entryId}.pdb`
        const chainId = entityInfo.entityIds.authId[0]
        const newMolecule = await fetchMoleculeFromURL(coordUrl, entityInfo.entityId)
        if (!newMolecule) {
            return
        }
        if (entryInfo.compModelInfo?.url) {
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
    }, [entryInfo, entityInfo, fetchMoleculeFromURL, selectedChain, selectedMolNo])

    return <Card style={{marginTop: '0.5rem'}}>
        <Card.Body style={{padding:'0.5rem'}}>
            <Row style={{display:'flex', justifyContent:'between'}}>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                    <span>
                        {label}
                    </span>
                </Col>
                <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                    <Button style={{marginRight:'0.5rem'}} onClick={fetchAndSuperpose}>
                        Fetch
                    </Button>
                </Col>
            </Row>
        </Card.Body>
    </Card>
}
