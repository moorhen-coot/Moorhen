import store from '../store/MoorhenReduxStore'
import { guid } from '../utils/utils';
import { gemmiAtomPairsToCylindersInfo } from '../utils/utils'

export const getVectorsBuffers = (): any  => {

    const labelBuffers = store.getState().glRef.labelBuffers
    const displayBuffers = store.getState().glRef.displayBuffers
    const vectorsList = store.getState().vectors.vectorsList
    const molecules = store.getState().molecules.moleculeList

    const atomColours = {}
    const colour = [1.0,0.0,0.0,1.0]
    const dashPairs = []
    const solidPairs = []
    const arrowHeadPairs = []
    const newLabelBuffers = []

    vectorsList.forEach(vec => {
        let xFromOrig;
        let yFromOrig;
        let zFromOrig;
        let xToOrig;
        let yToOrig;
        let zToOrig;
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
                    const fromAtoms = window.CCP4Module.get_atom_info_for_selection(fromMol.gemmiStructure, vec.cidFrom, "" )
                    const nFromAtoms = fromAtoms.size()
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
                    const toAtoms = window.CCP4Module.get_atom_info_for_selection(toMol.gemmiStructure, vec.cidTo, "" )
                    const nToAtoms = toAtoms.size()
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
            }
            const secondAtomInfo = {
                pos: [xTo, yTo, zTo],
                x: xTo,
                y: yTo,
                z: zTo,
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
                }
                const secondAtomInfo = {
                    pos: [xTo, yTo, zTo],
                    x: xTo,
                    y: yTo,
                    z: zTo,
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
                }
                const secondAtomInfo = {
                    pos: [xTo, yTo, zTo],
                    x: xTo,
                    y: yTo,
                    z: zTo,
                }
                const pair = [firstAtomInfo, secondAtomInfo]
                arrowHeadPairs.push(pair)
            }
        }
    })

    dashPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
    solidPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
    arrowHeadPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })

    const objects = [
        gemmiAtomPairsToCylindersInfo(dashPairs, 0.07, atomColours, false, 0.01, 1000.)
    ]
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(solidPairs, 0.07, atomColours, false, 0.01, 1000., false)
    ])
    objects.push(...[
        gemmiAtomPairsToCylindersInfo(arrowHeadPairs, 0.15, atomColours, false, 0.01, 1000., false, "cone")
    ])

    return [objects,newLabelBuffers]

}
