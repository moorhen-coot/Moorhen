import store from '../store/MoorhenReduxStore'
import { guid } from '../utils/utils';
import { gemmiAtomPairsToCylindersInfo } from '../utils/utils'
import { getMathJaxSVG }  from '../utils/mathJaxUtils'

export const getVectorsBuffers = async (): Promise<any>  => {

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
            if(vec.molNoFrom!==undefined&&vec.cidFrom.length>0){
                const fromMol = molecules.find(mol => mol.molNo === vec.molNoFrom)
                if(fromMol){
                    let fromAtoms
                    let nFromAtoms = 0
                    try {
                        fromAtoms = window.CCP4Module.get_atom_info_for_selection(fromMol.gemmiStructure, vec.cidFrom, "" )
                        nFromAtoms = fromAtoms.size()
                    } catch(e) {
                        console.log(e)
                    }
                    if(nFromAtoms>0){
                        let totXFrom = 0
                        let totYFrom = 0
                        let totZFrom = 0
                        for(let iFrom=0;iFrom<nFromAtoms;iFrom++){
                            const at = fromAtoms.get(iFrom)
                            totXFrom += at.x
                            totYFrom += at.y
                            totZFrom += at.z
                        }
                        totXFrom /= nFromAtoms
                        totYFrom /= nFromAtoms
                        totZFrom /= nFromAtoms
                        xFromOrig = totXFrom
                        yFromOrig = totYFrom
                        zFromOrig = totZFrom
                    }
                    fromAtoms.delete()
                }
            }
        }
        if(vec.coordsMode==="atoms"){
            if(vec.molNoTo!==undefined&&vec.cidTo.length>0){
                const toMol = molecules.find(mol => mol.molNo === vec.molNoTo)
                if(toMol){
                    let toAtoms
                    let nToAtoms = 0
                    try {
                        toAtoms = window.CCP4Module.get_atom_info_for_selection(toMol.gemmiStructure, vec.cidTo, "" )
                        nToAtoms = toAtoms.size()
                    } catch(e) {
                        console.log(e)
                    }
                    if(nToAtoms>0){
                        let totXTo = 0
                        let totYTo = 0
                        let totZTo = 0
                        for(let iTo=0;iTo<nToAtoms;iTo++){
                            const at = toAtoms.get(iTo)
                            totXTo += at.x
                            totYTo += at.y
                            totZTo += at.z
                        }
                        totXTo /= nToAtoms
                        totYTo /= nToAtoms
                        totZTo /= nToAtoms
                        xToOrig = totXTo
                        yToOrig = totYTo
                        zToOrig = totZTo
                    }
                    toAtoms.delete()
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
            const labelScale = 3.0
            if(vec.labelText.startsWith("$")&&vec.labelText.endsWith("$")){
                const mjdata = await getMathJaxSVG(vec.labelText.substring(1,vec.labelText.length-1))

                const svg = mjdata.svg
                const img = new window.Image()
                const blob = new Blob([svg], {type: 'image/svg+xml'})
                const blobUrl = URL.createObjectURL(blob)
                img.src = blobUrl
                img.crossOrigin = "Anonymous"
                await img.decode()

                const saveCanvas = new OffscreenCanvas(img.width*labelScale, img.height*labelScale)
                const ctx = saveCanvas.getContext("2d")
                ctx.drawImage(img,0,0,img.width,img.height,0,0,img.width*labelScale,img.height*labelScale)
                const myImageData = ctx.getImageData(0, 0, img.width*labelScale,img.height*labelScale)

                if(vec.labelMode==="start"){
                    newLabelBuffers.push({label:{imgData:myImageData, font:"24px Arial",text:vec.labelText,x:xFrom,y:yFrom,z:zFrom},uuid:guid()})
                }
                if(vec.labelMode==="end"){
                    newLabelBuffers.push({label:{imgData:myImageData, font:"24px Arial",text:vec.labelText,x:xTo,y:yTo,z:zTo},uuid:guid()})
                }
                if(vec.labelMode==="middle"){
                    const xLabel = xFrom + 0.5 * (xToOrig - xFromOrig)
                    const yLabel = yFrom + 0.5 * (yToOrig - yFromOrig)
                    const zLabel = zFrom + 0.5 * (zToOrig - zFromOrig)
                    newLabelBuffers.push({label:{imgData:myImageData, font:"24px Arial",text:vec.labelText,x:xLabel,y:yLabel,z:zLabel},uuid:guid()})
                }
            } else {
                if(vec.labelMode==="start"){
                    newLabelBuffers.push({label:{font:"24px Arial",text:vec.labelText,x:xFrom,y:yFrom,z:zFrom},uuid:guid()})
                }
                if(vec.labelMode==="end"){
                    newLabelBuffers.push({label:{font:"24px Arial",text:vec.labelText,x:xTo,y:yTo,z:zTo},uuid:guid()})
                }
                if(vec.labelMode==="middle"){
                    const xLabel = xFrom + 0.5 * (xToOrig - xFromOrig)
                    const yLabel = yFrom + 0.5 * (yToOrig - yFromOrig)
                    const zLabel = zFrom + 0.5 * (zToOrig - zFromOrig)
                    newLabelBuffers.push({label:{font:"24px Arial",text:vec.labelText,x:xLabel,y:yLabel,z:zLabel},uuid:guid()})
                }
            }
            if(vec.arrowMode==="end"||vec.arrowMode==="both"){
                xTo = xFrom + 0.8 * (xToOrig - xFromOrig)
                yTo = yFrom + 0.8 * (yToOrig - yFromOrig)
                zTo = zFrom + 0.8 * (zToOrig - zFromOrig)
            }
            if(vec.arrowMode==="start"||vec.arrowMode==="both"){
                xFrom = xFrom + 0.2 * (xToOrig - xFromOrig)
                yFrom = yFrom + 0.2 * (yToOrig - yFromOrig)
                zFrom = zFrom + 0.2 * (zToOrig - zFromOrig)
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
            const pair = [firstAtomInfo, secondAtomInfo]
            if(vec.drawMode==="dashedcylinder"){
                dashPairs.push(pair)
            } else {
                solidPairs.push(pair)
            }
            if(vec.arrowMode==="end"||vec.arrowMode==="both"){
                const xFrom = xFromOrig + 0.8 * (xToOrig - xFromOrig)
                const yFrom = yFromOrig + 0.8 * (yToOrig - yFromOrig)
                const zFrom = zFromOrig + 0.8 * (zToOrig - zFromOrig)
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
                const pair = [firstAtomInfo, secondAtomInfo]
                arrowHeadPairs.push(pair)
            }
            if(vec.arrowMode==="start"||vec.arrowMode==="both"){
                const xTo = xFromOrig
                const yTo = yFromOrig
                const zTo = zFromOrig
                const xFrom = xFromOrig + 0.2 * (xToOrig - xFromOrig)
                const yFrom = yFromOrig + 0.2 * (yToOrig - yFromOrig)
                const zFrom = zFromOrig + 0.2 * (zToOrig - zFromOrig)
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
                const pair = [firstAtomInfo, secondAtomInfo]
                arrowHeadPairs.push(pair)
            }
        }
    }

    const dashColours = {}
    const solidColours = {}
    const arrowColours = {}

    dashPairs.forEach(atom => { dashColours[`${atom[0].serial}`] =  atom[0].colour; dashColours[`${atom[1].serial}`] =  atom[0].colour })
    solidPairs.forEach(atom => { solidColours[`${atom[0].serial}`] = atom[0].colour; solidColours[`${atom[1].serial}`] = atom[0].colour })
    arrowHeadPairs.forEach(atom => { arrowColours[`${atom[0].serial}`] = atom[0].colour; arrowColours[`${atom[1].serial}`] = atom[0].colour })

    const objects = [
        gemmiAtomPairsToCylindersInfo(dashPairs, 0.07, dashColours, false, 0.01, 1000.)
    ]
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(solidPairs, 0.07, solidColours, false, 0.01, 1000., false)
    ])
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(arrowHeadPairs, 0.15, arrowColours, false, 0.01, 1000., false, "cone")
    ])

    return [objects,newLabelBuffers]

}
