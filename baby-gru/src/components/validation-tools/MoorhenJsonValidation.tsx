import { useEffect, useCallback, useState, useRef } from "react"
import { Table, Container } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase"
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
import { ThemeProvider } from '@mui/material/styles';
import { rgbToHsv,hsvToRgb } from '../../utils/utils';

export const MoorhenJsonValidation = (props: moorhen.CollectedProps) => {

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
    const [sectionSortable, setSectionSortable ] = useState({keys:[]})

    const validationJson = useSelector((state: moorhen.State) => state.jsonValidation.validationJson)

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
        const new_keys = sectionOrdered.keys
        new_keys[key] = !isOrdered
        setSectionOrdered({keys:new_keys})
    })

    useEffect(() => {
        const new_keys = []
        const new_order_keys = []
        const new_sortable_keys = []
        if(!validationJson.sections) return
        validationJson.sections.map((section, section_index) => {
            new_keys.push(true)
            new_order_keys.push(false)
            let isSortable = true
            section.items.map((issue, index) => {
                 if(!Object.hasOwn(issue,"badness")){
                     isSortable = false
                 }
            })
            new_sortable_keys.push(isSortable)
        })
        setSectionOpen({...sectionOpen, keys:new_keys})
        setSectionOrdered({...sectionOrdered, keys:new_order_keys})
        setSectionSortable({...sectionSortable, keys:new_sortable_keys})
    },[validationJson]);

    const ColorRampBox = ((boxProps) => {
        let startcol = "#000000"
        let endcol = "#ffffff"
        let width = 20
        let height= 20
        let col = startcol
        let val = 0.0
        if(boxProps.val)
           val = boxProps.val
        if(boxProps.startColor)
           startcol = boxProps.startColor
        if(boxProps.endColor)
           endcol = boxProps.endColor
        if(boxProps.width)
           width = parseInt(boxProps.width)
        if(boxProps.height)
           height = parseInt(boxProps.height)

        startcol = startcol.replace("#","")
        endcol = endcol.replace("#","")

        if(startcol.length === 3){
            startcol = startcol.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }
        if(endcol.length === 3){
            endcol = endcol.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        const startRGB = [parseInt(startcol.slice(0,2),16)/255.,
                          parseInt(startcol.slice(2,4),16)/255.,
                          parseInt(startcol.slice(4,6),16)/255.]
        const endRGB = [parseInt(endcol.slice(0,2),16)/255.,
                          parseInt(endcol.slice(2,4),16)/255.,
                          parseInt(endcol.slice(4,6),16)/255.]

        const startHSV = rgbToHsv(startRGB[0],startRGB[1],startRGB[2])
        const endHSV = rgbToHsv(endRGB[0],endRGB[1],endRGB[2])
        const valHSV = [val*endHSV[0] + (1.0-val)*startHSV[0],
                        val*endHSV[1] + (1.0-val)*startHSV[1],
                        val*endHSV[2] + (1.0-val)*startHSV[2]]

        if(valHSV[0]<0.0) valHSV[0] += 360

        const valRGB = hsvToRgb(valHSV[0],valHSV[1],valHSV[2])
        let colR = parseInt((valRGB[0]*255).toFixed(0)).toString(16)
        let colG = parseInt((valRGB[1]*255).toFixed(0)).toString(16)
        let colB = parseInt((valRGB[2]*255).toFixed(0)).toString(16)
        if(colR.length===1) colR = "0"+colR
        if(colG.length===1) colG = "0"+colG
        if(colB.length===1) colB = "0"+colB
        col = "#" + colR+colG+colB

        return (
            <ThemeProvider
                theme={{
                  palette: {
                    primary: {
                      main: col,
                      dark: col,
                    },
                  },
                }}
            >
            <Box
                sx={{
                  width: width,
                  height: height,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  display: 'inline-block'
                }}
                component="span"
            />
            </ThemeProvider>
        );
   })

    const fetchCardData = (() => {
        const cards = []
        let title = ""

        let selectedMolecule
        if(intoMoleculeRef.current)
            selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))

        if(validationJson&&validationJson.sections){
            const sections = validationJson.sections
            title =  validationJson.title

            cards.push(sections.map((section, section_index) => {

                const isOpen = sectionOpen.keys[section_index]
                const isSorted = sectionOrdered.keys[section_index]
                const items = section.items
                const innerCards = []
                let sortFun = undefined
                if(sectionOrdered.keys[section_index]){
                    sortFun = (a,b) => {
                        return b.badness-a.badness
                    }
                }
                innerCards.push(items.toSorted(sortFun).map((issue, index) => {
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
                //FIXME - val={issue.badness} should be val={issue.score}, badness is for testing
                //        and same for  additionalLabel += " ("+issue.badness+")" 
                if(sectionSortable.keys[section_index]){
                    additionalLabel += " ("+issue.badness+")"
                }
                console.log
                return <Table key={index} style={{ margin: '0', padding:'0'}}>
                        <tbody>
                             <tr>
                                <td style={{backgroundColor: isDark ? '#333' : 'white', color: isDark ? 'white' : 'black', margin: '0', padding:'0', verticalAlign:'middle', textAlign:'left'}}>
                                    {issue.label}&nbsp;{additionalLabel}&nbsp;{sectionSortable.keys[section_index]&&<ColorRampBox val={issue.badness} startColor="#f00" endColor="#00f" width="20" height="10"/>}
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
                <Grid style={{padding:'5px', verticalAlign:"middle", textAlign:'left'}} size={6}>
                <span style={{margin: '0', padding:'0', verticalAlign:"middle"}}>{section.title}</span>
                </Grid>
                <Grid maxHeight={30} size={6} style={{padding:'0px',textAlign:'right', verticalAlign:"middle"}}>
                {(isOpen&&sectionSortable.keys[section_index]) &&
                   <FormControlLabel onClick={(e) => e.stopPropagation()} control={<Checkbox onChange={(e) => toggleSectionOrder(e,section_index)} checked={isSorted} inputProps={{ 'aria-label': 'controlled' }}/>} label="Sort&nbsp;by&nbsp;'badness'" />
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
