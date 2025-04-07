import { useEffect, useCallback, useState, useRef } from "react"
import { Table, Container } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase"
import { MoorhenSlider } from '../misc/MoorhenSlider'
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { cidToSpec, sleep } from '../../utils/utils';
import { hideModal } from "../../store/modalsSlice";
import { useSnackbar } from "notistack";
import { modalKeys } from "../../utils/enums";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { Icon, Button, IconButton } from "@mui/material";
import { Accordion, AccordionDetails, AccordionSummary, Typography, Collapse, Box, Grid, Checkbox, FormGroup, FormControlLabel} from '@mui/material';
import { ExpandMoreOutlined, CenterFocusWeakOutlined } from "@mui/icons-material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export const MoorhenJsonValidation = (propsIn: {validationJson:any, collectedProps: moorhen.CollectedProps}) => {

    const props = propsIn.collectedProps
    const dispatch = useDispatch()

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const useRamaRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useRamaRefinementRestraints)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const { enqueueSnackbar } = useSnackbar()

    const filterMapFunction = (map: moorhen.Map) => map.isDifference

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const [sectionOpen, setSectionOpen ] = useState({keys:[]})
    const [sectionOrdered, setSectionOrdered ] = useState({keys:[]})

    const flipSide = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "side_chain_180",
            commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}/C`],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        await selectedMolecule.refineResiduesUsingAtomCidAnimated(`//${chainId}/${seqNum}`, activeMap, 2, true, false)

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleRefine = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string, method: string, tripleWithRama: boolean) => {

        if(tripleWithRama){
            await props.commandCentre.current.cootCommand({
                command: 'set_use_rama_plot_restraints',
                commandArgs: [true],
                returnType: "status"
            }, false)
        }

        await selectedMolecule.refineResiduesUsingAtomCid(`//${chainId}/${seqNum}`, method, 4000, true)

        if(tripleWithRama){
            //Restore previous setting, whether true or false
            await props.commandCentre.current.cootCommand({
                command: 'set_use_rama_plot_restraints',
                commandArgs: [useRamaRestraints],
                returnType: "status"
            }, false)
        }

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleTripleRefineWithRamaRestraints = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        //TODO - The Rama restraints!
        await selectedMolecule.refineResiduesUsingAtomCid(`//${chainId}/${seqNum}`, 'TRIPLE', 4000, true)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleAutoFitRotamer = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [
                selectedMolecule.molNo,
                chainId,
                seqNum,
                insCode
            ],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        await selectedMolecule.refineResiduesUsingAtomCidAnimated(`//${chainId}/${seqNum}`, activeMap, 2, true, false)

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )

    }

    const handleFlipSide = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            flipSide(...args)
        }
    }


    const refine_svg = `${props.urlPrefix}/pixmaps/refine-1.svg`
    const refine_rama_svg = `${props.urlPrefix}/pixmaps/refine-rama.svg`
    const flip_side_svg = isDark ? `${props.urlPrefix}/pixmaps/side-chain-180-dark.svg` : `${props.urlPrefix}/pixmaps/side-chain-180.svg`
    const auto_fit_svg = `${props.urlPrefix}/pixmaps/auto-fit-rotamer.svg`

    const refineRamaSvgIcon = (
        <Icon>
          <img alt="Refine" src={refine_rama_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const refineSvgIcon = (
        <Icon>
          <img alt="Refine" src={refine_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const flipSideSvgIcon = (
        <Icon>
          <img alt="Flip side chain" src={flip_side_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const autoFitRotamerSvgIcon = (
        <Icon>
          <img alt="Auto fit rotamer" src={auto_fit_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const toggleSection = ((e,key) => {
        e.stopPropagation()
        const isOpen = sectionOpen.keys[key]
        const new_keys = sectionOpen.keys
        new_keys[key] = !isOpen
        setSectionOpen({keys:new_keys})
    })

    const toggleSectionOrder = ((e,key) => {
        e.stopPropagation()
        const isOrdered = sectionOrdered.keys[key]
        console.log("Sort",key,isOrdered)
        const new_keys = sectionOrdered.keys
        new_keys[key] = !isOrdered
        setSectionOrdered({keys:new_keys})
    })

    useEffect(() => {
        const new_keys = []
        const new_order_keys = []
        if(!propsIn.validationJson.sections) return
        propsIn.validationJson.sections.map((section, section_index) => {
            new_keys.push(true)
            new_order_keys.push(false)
        })
        setSectionOpen({...sectionOpen, keys:new_keys})
        setSectionOrdered({...sectionOrdered, keys:new_order_keys})
    },[propsIn.validationJson]);

    const fetchCardData = (() => {
        let cards = []
        let title = ""

        let selectedMolecule
        if(intoMoleculeRef.current)
            selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))

        if(propsIn.validationJson&&propsIn.validationJson.sections){
            const sections = propsIn.validationJson.sections
            title =  propsIn.validationJson.title

            //TODO - Put in a 'toSorted' here
            cards.push(sections.map((section, section_index) => {

                const isOpen = sectionOpen.keys[section_index]
                const isSorted = sectionOrdered.keys[section_index]
                const things = section.items
                const innerCards = []
                innerCards.push(things.map((issue, index) => {
                let additionalLabel = ""
                let chainId = ""
                let resNum = -9999
                let insCode = ""
                if(issue["position-type"]&&issue["position-type"]==="by-residue-spec"&&issue["residue-spec"]){
                   additionalLabel = issue["residue-spec"][0]+"/"+issue["residue-spec"][1]
                   chainId = issue["residue-spec"][0]
                   resNum = parseInt(issue["residue-spec"][1])
                   insCode = issue["residue-spec"][2]
                }
                if(issue["position-type"]&&issue["position-type"]==="by-atom-spec-pair"&&issue["atom-1-spec"]&&issue["atom-2-spec"]){
                   additionalLabel = issue["atom-1-spec"][0]+"/"+issue["atom-1-spec"][1]+"/"+issue["atom-1-spec"][3] + " <--> " +
                                     issue["atom-2-spec"][0]+"/"+issue["atom-2-spec"][1]+"/"+issue["atom-2-spec"][3]
                   chainId = issue["atom-1-spec"][0]
                   resNum = parseInt(issue["atom-1-spec"][1])
                   insCode = issue["atom-1-spec"][2]
                }
                return <Table key={index} style={{ margin: '0', padding:'0'}}>
                        <tbody>
                             <tr>
                                <td style={{backgroundColor: isDark ? '#333' : 'white', color: isDark ? 'white' : 'black', margin: '0', padding:'0', verticalAlign:'middle', textAlign:'left'}}>
                                    {issue.label} {additionalLabel}
                                </td>
                                <td style={{backgroundColor: isDark ? '#333' : 'white', margin: '0', padding:'0', verticalAlign:'middle', textAlign:'right'}}>
                                    {selectedMolecule && <IconButton title="Centre on" aria-label="Centre on" style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${chainId}/${resNum}-${resNum}/`, false)}>
                                        <CenterFocusWeakOutlined style={{color: isDark ? 'white' : 'black'}}/>
                                    </IconButton>}
                                    {(selectedMolecule && issue["action"].indexOf("sphere-refinement-action")>-1) && <Button title="Sphere Refine" aria-label="Sphere Refine" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={refineSvgIcon} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "SPHERE", false)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("triple-refinement-with-rama-restraints-action")>-1) && <Button title="Triple Refine with Rama restraints" aria-label="Triple Refine with Rama restraints" startIcon={refineRamaSvgIcon} sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "TRIPLE", true)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("triple-refinement-action")>-1) && <Button title="Triple Refine" aria-label="Triple Refine" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={refineSvgIcon} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "TRIPLE", false)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("side-chain-flip-action")>-1) && <Button title="Flip side chain" aria-label="Flip side chain" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={flipSideSvgIcon} onClick={() => {
                                        handleFlipSide(selectedMolecule, chainId, resNum, insCode)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("auto-fit-rotamer-action")>-1) && <Button title="Auto fit rotamer" aria-label="Auto fit rotamer" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={autoFitRotamerSvgIcon} onClick={() => {
                                        handleAutoFitRotamer(selectedMolecule, chainId, resNum, insCode)
                                    }}/>}
                                </td>
                             </tr>
                        </tbody>
                    </Table>
            }))
                return <Container key={section_index} style={{ width:"100%", padding:'1px'}}>
                <Grid onClick={(e) => toggleSection(e,section_index)} container spacing={2} style={{borderRadius:"4px", color:'black', backgroundColor: isDark ? '#adb5bd' : '#ecf0f1', width:"100%", verticalAlign:"middle", padding:'0px'}}>
                <Grid style={{padding:'5px', verticalAlign:"middle", textAlign:'left'}} size={8}>
                <span style={{margin: '0', padding:'0', verticalAlign:"middle"}}>{section.title}</span>
                </Grid>
                <Grid maxHeight={30} size={4} style={{padding:'0px',textAlign:'right', verticalAlign:"middle"}}>
                {(isOpen&&false) && 
                   <FormControlLabel onClick={(e) => e.stopPropagation()} control={<Checkbox onChange={(e) => toggleSectionOrder(e,section_index)} checked={isSorted} inputProps={{ 'aria-label': 'controlled' }}/>} label="Sort" />
                }
                <IconButton
                  aria-label="expand row"
                  size="small"
                  onClick={(e) => toggleSection(e,section_index)}
                >
                  {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
                </Grid>
                </Grid>
                <Collapse in={isOpen}>
                <Box sx={{ margin: 1 }}>
                {innerCards}
                </Box>
                </Collapse>
                </Container>
            }))
        }
        return {title,cards}
    })

    const cards = fetchCardData()
    console.log(sectionOrdered.keys)
    return <Container>
                <MoorhenMoleculeSelect
                    label="Molecule"
                    width=""
                    allowAny={false}
                    molecules={molecules}
                    ref={intoMoleculeRef}
                    />
           <h5 className='mb-3'>{cards.title}</h5>
           {cards.cards}
           </Container>
}
