import { gemmiAtomPairsToCylindersInfo,  guid} from '../utils/utils'
import { contrastingTextColour, rasteriseTextStyle } from '../utils/textStyle'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'

const get1LetterElementPaddedCid = (cid): string  => {
    let newCid
    const cidSplit = cid.split("/")
    const atNameAlt = cidSplit[cidSplit.length-1]
    cidSplit.pop()
    const atNameAltSplit = atNameAlt.split(":")
    const atName = atNameAltSplit[0]
    if(atName.length===1){
        newCid = cidSplit.join("/")+"/ "+atName + "  "
    } else if(atName.length===2){
        newCid = cidSplit.join("/")+"/ "+atName + " "
    } else if(atName.length===3){
        newCid = cidSplit.join("/")+"/ "+atName
    } else if(atName.length===4){
        //Try unpadding ...
        newCid = cidSplit.join("/")+"/"+atName.trim()
    }
    if(atNameAltSplit.length>1)
        newCid += ":"+atNameAltSplit[1]
    return newCid
}

const get2LetterElementPaddedCid = (cid): string  => {
    let newCid
    const cidSplit = cid.split("/")
    const atNameAlt = cidSplit[cidSplit.length-1]
    cidSplit.pop()
    const atNameAltSplit = atNameAlt.split(":")
    const atName = atNameAltSplit[0]
    if(atName.length===2){
        newCid = cidSplit.join("/")+"/"+atName + "  "
    } else if(atName.length===3){
        newCid = cidSplit.join("/")+"/"+atName + " "
    } else if(atName.length===4){
        //Try unpadding ...
        newCid = cidSplit.join("/")+"/"+atName.trim()
    }
    if(atNameAltSplit.length>1)
        newCid += ":"+atNameAltSplit[1]
    return newCid
}

/**
 * The centre of the atoms a selection picks out of a molecule, or null if it picks out none.
 *
 * Names given without the PDB column padding (" CA " written "CA") are retried with one-letter
 * and two-letter element padding, as a selection typed by hand or saved from elsewhere often is.
 */
export const selectionCentroid = (molecule: { gemmiStructure: unknown }, cid: string): [number, number, number] | null => {
    if (!molecule || !cid) return null
    let atoms = null
    let nAtoms = 0
    try {
        atoms = window.gemmiModule.get_atom_info_for_selection(molecule.gemmiStructure, cid, "" )
        nAtoms = atoms.size()
        if(nAtoms===0 && cid.length!==4){
            //Try 4-char padding/unpadding
            atoms.delete()
            atoms = window.gemmiModule.get_atom_info_for_selection(molecule.gemmiStructure, get1LetterElementPaddedCid(cid), "" )
            nAtoms = atoms.size()
            if(nAtoms===0){
                atoms.delete()
                atoms = window.gemmiModule.get_atom_info_for_selection(molecule.gemmiStructure, get2LetterElementPaddedCid(cid), "" )
                nAtoms = atoms.size()
            }
        }
    } catch(e) {
        console.log(e)
    }
    let centre: [number, number, number] | null = null
    if(nAtoms>0){
        let totX = 0
        let totY = 0
        let totZ = 0
        for(let i=0;i<nAtoms;i++){
            const at = atoms.get(i)
            totX += at.x
            totY += at.y
            totZ += at.z
        }
        centre = [totX/nAtoms, totY/nAtoms, totZ/nAtoms]
    }
    if(atoms) atoms.delete()
    return centre
}

export const getVectorsBuffers = async (store: Store<RootState>): Promise<any>  => {

    const vectorsList = store.getState().vectors.vectorsList
    const molecules = store.getState().molecules.moleculeList

    const dashPairs = []
    const solidPairs = []
    const arrowHeadPairs = []
    const newLabelBuffers = []

    let nAtom = 0
    for(let ivec=0; ivec<vectorsList.length; ivec++) {
        const vec = vectorsList[ivec]
        let xFromOrig;
        let yFromOrig;
        let zFromOrig;
        let xToOrig;
        let yToOrig;
        let zToOrig;
        const vecSize = vec.radius ? vec.radius : 0.07
        const theColour = [vec.vectorColour.r/256,vec.vectorColour.g/256,vec.vectorColour.b/256,1.0]
        if(vec.coordsMode==="points"){
            xFromOrig = vec.xFrom
            yFromOrig = vec.yFrom
            zFromOrig = vec.zFrom
            xToOrig = vec.xTo
            yToOrig = vec.yTo
            zToOrig = vec.zTo
        }
        if(vec.coordsMode==="atompoint"||vec.coordsMode==="atoms"){
            if(vec.coordsMode==="atompoint"){
                xToOrig = vec.xTo
                yToOrig = vec.yTo
                zToOrig = vec.zTo
            }
            if(vec.molFromUniqueId!==undefined&&vec.cidFrom.length>0){
                const fromMol = molecules.find(mol => mol.uniqueId === vec.molFromUniqueId)
                const centre = fromMol ? selectionCentroid(fromMol, vec.cidFrom) : null
                if(centre){
                    [xFromOrig, yFromOrig, zFromOrig] = centre
                }
            }
        }
        if(vec.coordsMode==="atoms"){
            if(vec.molToUniqueId!==undefined&&vec.cidTo.length>0){
                const toMol = molecules.find(mol => mol.uniqueId === vec.molToUniqueId)
                const centre = toMol ? selectionCentroid(toMol, vec.cidTo) : null
                if(centre){
                    [xToOrig, yToOrig, zToOrig] = centre
                }
            }
        }
        if(xFromOrig!==undefined&&xToOrig!==undefined){
            let xFrom = xFromOrig
            let yFrom = yFromOrig
            let zFrom = zFromOrig
            let xTo = xToOrig
            let yTo = yToOrig
            let zTo = zToOrig
            let fnSize = vec.labelFontSize ?? 24
            const lsq = (xToOrig - xFromOrig) * (xToOrig - xFromOrig)
                      + (yToOrig - yFromOrig) * (yToOrig - yFromOrig)
                      + (zToOrig - zFromOrig) * (zToOrig - zFromOrig)
            const l = Math.sqrt(lsq)
            const dashSteps = vec.dashSpacing
                ? Math.max(3, Math.min(80, Math.round(l / vec.dashSpacing)))
                : 15
            const arrowHeadLength = vec.arrowHeadLength ?? 1.0
            const arrowHeadRadiusScale = vec.arrowHeadRadiusScale ?? 2.0
            const labelScreenOffsetDistance = vec.labelScreenOffsetDistance ?? 0.0
            const labelScreenOffset = {
                screenOffsetVectorX: xToOrig - xFromOrig,
                screenOffsetVectorY: yToOrig - yFromOrig,
                screenOffsetVectorZ: zToOrig - zFromOrig,
                screenOffsetDistance: labelScreenOffsetDistance,
            }
            if(window.devicePixelRatio){
                fnSize *= window.devicePixelRatio
            }
            const fnSizePx = fnSize + "px"

            const latexLabel = vec.labelIsLatex && vec.labelMode !== "none"
                ? await rasteriseTextStyle(
                    { text: vec.labelText, latex: true, fontFamily: "serif", fontPixelSize: vec.labelFontSize ?? 24 },
                    window.devicePixelRatio || 1,
                    contrastingTextColour(store.getState().sceneSettings.backgroundColor)
                )
                : null
            if(latexLabel){
                const myImageData = latexLabel.imgData
                // The atlas caches pixels by text and font, so the typeset form needs a key of its
                // own: otherwise a plain label "x" and a LaTeX label "x" would share a texture.
                const latexKey = "\u0001latex\u0001" + vec.labelText

                if(vec.labelMode==="start"){
                    newLabelBuffers.push({label:{imgData:myImageData, font:fnSizePx+" Arial",text:latexKey,x:xFrom,y:yFrom,z:zFrom,...labelScreenOffset},uuid:guid()})
                }
                if(vec.labelMode==="end"){
                    newLabelBuffers.push({label:{imgData:myImageData, font:fnSizePx+" Arial",text:latexKey,x:xTo,y:yTo,z:zTo,...labelScreenOffset},uuid:guid()})
                }
                if(vec.labelMode==="middle"){
                    const xLabel = xFrom + 0.5 * (xToOrig - xFromOrig)
                    const yLabel = yFrom + 0.5 * (yToOrig - yFromOrig)
                    const zLabel = zFrom + 0.5 * (zToOrig - zFromOrig)
                    newLabelBuffers.push({label:{imgData:myImageData, font:fnSizePx+" Arial",text:latexKey,x:xLabel,y:yLabel,z:zLabel,...labelScreenOffset},uuid:guid()})
                }
            } else {
                if(vec.labelMode==="start"){
                    newLabelBuffers.push({label:{font:fnSizePx+" Arial",text:vec.labelText,x:xFrom,y:yFrom,z:zFrom,...labelScreenOffset},uuid:guid()})
                }
                if(vec.labelMode==="end"){
                    newLabelBuffers.push({label:{font:fnSizePx+" Arial",text:vec.labelText,x:xTo,y:yTo,z:zTo,...labelScreenOffset},uuid:guid()})
                }
                if(vec.labelMode==="middle"){
                    const xLabel = xFrom + 0.5 * (xToOrig - xFromOrig)
                    const yLabel = yFrom + 0.5 * (yToOrig - yFromOrig)
                    const zLabel = zFrom + 0.5 * (zToOrig - zFromOrig)
                    newLabelBuffers.push({label:{font:fnSizePx+" Arial",text:vec.labelText,x:xLabel,y:yLabel,z:zLabel,...labelScreenOffset},uuid:guid()})
                }
            }
            if(vec.arrowMode==="end"||vec.arrowMode==="both"){
                xTo = xTo - arrowHeadLength * (xToOrig - xFromOrig) / l
                yTo = yTo - arrowHeadLength * (yToOrig - yFromOrig) / l
                zTo = zTo - arrowHeadLength * (zToOrig - zFromOrig) / l
            }
            if(vec.arrowMode==="start"||vec.arrowMode==="both"){
                xFrom = xFrom + arrowHeadLength * (xToOrig - xFromOrig) / l
                yFrom = yFrom + arrowHeadLength * (yToOrig - yFromOrig) / l
                zFrom = zFrom + arrowHeadLength * (zToOrig - zFromOrig) / l
            }
            const firstAtomInfo = {
                pos: [xFrom, yFrom, zFrom],
                x: xFrom,
                y: yFrom,
                z: zFrom,
                serial: nAtom++,
                colour: theColour
            }
            const secondAtomInfo = {
                pos: [xTo, yTo, zTo],
                x: xTo,
                y: yTo,
                z: zTo,
                serial: nAtom++,
                colour: theColour
            }
            const pair = [firstAtomInfo, secondAtomInfo, vecSize, dashSteps]
            if(vec.drawMode==="dashedcylinder"){
                dashPairs.push(pair)
            } else {
                solidPairs.push(pair)
            }
            if(vec.arrowMode==="end"||vec.arrowMode==="both"){
                const xFrom = xToOrig - arrowHeadLength * (xToOrig - xFromOrig) / l
                const yFrom = yToOrig - arrowHeadLength * (yToOrig - yFromOrig) / l
                const zFrom = zToOrig - arrowHeadLength * (zToOrig - zFromOrig) / l
                const xTo = xToOrig
                const yTo = yToOrig
                const zTo = zToOrig
                const firstAtomInfo = {
                    pos: [xFrom, yFrom, zFrom],
                    x: xFrom,
                    y: yFrom,
                    z: zFrom,
                    serial: nAtom++,
                    colour: theColour
                }
                const secondAtomInfo = {
                    pos: [xTo, yTo, zTo],
                    x: xTo,
                    y: yTo,
                    z: zTo,
                    serial: nAtom++,
                    colour: theColour
                }
                const pair = [firstAtomInfo, secondAtomInfo, vecSize, arrowHeadRadiusScale]
                arrowHeadPairs.push(pair)
            }
            if(vec.arrowMode==="start"||vec.arrowMode==="both"){
                const xTo = xFromOrig
                const yTo = yFromOrig
                const zTo = zFromOrig
                const xFrom = xFromOrig + arrowHeadLength * (xToOrig - xFromOrig) / l
                const yFrom = yFromOrig + arrowHeadLength * (yToOrig - yFromOrig) / l
                const zFrom = zFromOrig + arrowHeadLength * (zToOrig - zFromOrig) / l
                const firstAtomInfo = {
                    pos: [xFrom, yFrom, zFrom],
                    x: xFrom,
                    y: yFrom,
                    z: zFrom,
                    serial: nAtom++,
                    colour: theColour
                }
                const secondAtomInfo = {
                    pos: [xTo, yTo, zTo],
                    x: xTo,
                    y: yTo,
                    z: zTo,
                    serial: nAtom++,
                    colour: theColour
                }
                const pair = [firstAtomInfo, secondAtomInfo, vecSize, arrowHeadRadiusScale]
                arrowHeadPairs.push(pair)
            }
        }
    }

    const solidColours = {}
    const arrowColours = {}

    const solidSizes = []
    const arrowSizes = []

    solidPairs.forEach(atom => { solidSizes.push(atom[2]); solidColours[`${atom[0].serial}`] = atom[0].colour; solidColours[`${atom[1].serial}`] = atom[0].colour })
    arrowHeadPairs.forEach(atom => { arrowSizes.push((atom[3] ?? 2.0)*atom[2]); arrowColours[`${atom[0].serial}`] = atom[0].colour; arrowColours[`${atom[1].serial}`] = atom[0].colour })

    const objects = []
    const dashPairsByStep = new Map<number, any[]>()
    dashPairs.forEach(atom => {
        const dashSteps = atom[3] ?? 15
        if (!dashPairsByStep.has(dashSteps)) dashPairsByStep.set(dashSteps, [])
        dashPairsByStep.get(dashSteps).push(atom)
    })
    dashPairsByStep.forEach((pairs, dashSteps) => {
        const dashColours = {}
        const dashSizes = []
        pairs.forEach(atom => {
            dashSizes.push(atom[2]);
            dashColours[`${atom[0].serial}`] = atom[0].colour;
            dashColours[`${atom[1].serial}`] = atom[0].colour;
        })
        objects.push(gemmiAtomPairsToCylindersInfo(pairs, 0.01, dashColours, false, 0.01, 1000.0, true, "cylinder", dashSizes, dashSteps))
    })
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(solidPairs, 0.01, solidColours, false, 0.01, 1000.0, false, "cylinder", solidSizes)
    ])
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(arrowHeadPairs, 0.01, arrowColours, false, 0.01, 1000.0, false, "cone", arrowSizes)
    ])

    return [objects,newLabelBuffers]

}
