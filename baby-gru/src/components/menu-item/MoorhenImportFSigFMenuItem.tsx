import { useRef } from "react"
import { Col, Row } from "react-bootstrap"
import { MoorhenMapSelect } from "../select/MoorhenMapSelect"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";

export const MoorhenImportFSigFMenuItem = (props:{
    maps: moorhen.Map[];
    molecules: moorhen.Molecule[];
    selectedMolNo?: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
}) => {
    
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const twoFoFcSelectRef = useRef<null | HTMLSelectElement>(null)
    const foFcSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const connectMap = async () => {
        const [molecule, reflectionMap, twoFoFcMap, foFcMap] = [
            props.selectedMolNo !== null ? props.selectedMolNo : parseInt(moleculeSelectRef.current.value),
            parseInt(mapSelectRef.current.value),
            parseInt(twoFoFcSelectRef.current.value),
            parseInt(foFcSelectRef.current.value)
        ]
        const uniqueMaps = [...new Set([reflectionMap, twoFoFcMap, foFcMap].slice(1))]
        const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap]
        const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap]

        if (connectMapsArgs.every(arg => !isNaN(arg))) {

            //Calculate rmsd before connecting
            const prevRmsd = await Promise.all(uniqueMaps.map(imol => {
                const currentMap = props.maps.find(map => map.molNo === imol)
                return currentMap.fetchMapRmsd()
            }))

            // Connect maps
            await props.commandCentre.current.cootCommand({
                command: 'connect_updating_maps',
                commandArgs: connectMapsArgs,
                returnType: 'status'
            }, false)

            await props.commandCentre.current.cootCommand({
                command: 'sfcalc_genmaps_using_bulk_solvent',
                commandArgs: sFcalcArgs,
                returnType: 'status'
            }, false)

            const connectedMapsEvent = new CustomEvent("connectMaps", {
                "detail": {
                    molecule: molecule,
                    maps: [reflectionMap, twoFoFcMap, foFcMap],
                    uniqueMaps: uniqueMaps
                }
            })
            document.dispatchEvent(connectedMapsEvent)

            //Adjust contour to match previous rmsd
            await Promise.all(
                uniqueMaps.map(async (imol, index) => {
                    const currentMap = props.maps.find(map => map.molNo === imol)
                    const postRmsd = await currentMap.fetchMapRmsd()
                    let newContourLevel = currentMap.contourLevel * postRmsd / prevRmsd[index]
                    if (currentMap.isDifference) {
                        newContourLevel -= newContourLevel * 0.3
                    }
                    const newMapContourEvt: moorhen.NewMapContourEvent = new CustomEvent("newMapContour", {
                        "detail": {
                            molNo: currentMap.molNo,
                            mapRadius: currentMap.mapRadius,
                            cootContour: currentMap.cootContour,
                            contourLevel: newContourLevel,
                            mapColour: currentMap.mapColour,
                            litLines: currentMap.litLines,
                        }
                    })
                    document.dispatchEvent(newMapContourEvt)
                })
            )
        }
    }

    const onCompleted = async () => {
        return await connectMap()
    }

    const panelContent = <>
        <Row>
            <Col style={{ width: '30rem' }}>
                <MoorhenMapSelect {...props} ref={mapSelectRef} filterFunction={(map) => map.hasReflectionData} width='100%' label='Reflection data' />
            </Col>
        </Row>
        <Row style={{ marginBottom: "1rem" }}>
            <Col key="Col1">
                <MoorhenMapSelect {...props} ref={twoFoFcSelectRef} label="2foFc" width='100%' />
            </Col>
            <Col key="Col2">
                <MoorhenMapSelect {...props} ref={foFcSelectRef} label="FoFc" filterFunction={(map) => map.isDifference} width='100%' />
            </Col>
            {props.selectedMolNo === null &&
                <Col key="Col3">
                    <MoorhenMoleculeSelect {...props} ref={moleculeSelectRef} label="Molecule" allowAny={false} width='100%' />
                </Col>
            }
        </Row>
    </>

    return <MoorhenBaseMenuItem
        id="connect-molecule-and-map-menu-item"
        popoverContent={panelContent}
        menuItemText="Connect mol. and map for updating..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenImportFSigFMenuItem.defaultProps = { selectedMolNo: null }

