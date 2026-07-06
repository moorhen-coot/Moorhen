import { moorhen } from "../../types/moorhen";
import { privateer } from "../../types/privateer";
import { SimpleWebGL } from "./SimpleWebGL";
import { useCommandCentre } from "../../InstanceManager";
//import { meshDataToGlb } from "../../utils/meshDataToGlb";
import { doDownload } from "../../utils/utils";
import { useCallback, useEffect, useState } from 'react';

export const MoorhenCremerPople = (props: { stackDirection: "horizontal" | "vertical", width?: number, molecule: moorhen.Molecule }) => {

    const plotWidth = props.width ? props.width : 500
    const plotHeight = plotWidth
    const commandCentre = useCommandCentre();

    const [showRadialConformations, setShowRadialConformations] = useState<boolean>(true)
    const [cremerPopleParams, setCremerPopleParams] = useState<privateer.CremerPopleParameters[]>([])
    const [pickedResidue, setPickedResidue] = useState<string>("")
    const [pinRadius, setPinRadius] = useState<number>(0)

    // Measure the radius of the sphere the pins sit on. With the radial
    // conformations omitted, the pins are the outermost geometry, so the mesh's
    // max vertex distance from the origin is the pin radius. SimpleWebGL needs
    // this to reconstruct clicks accurately (the view is fitted to a larger
    // bounding sphere when the rings are shown).
    useEffect(() => {
        let cancelled = false
        const measure = async () => {
            const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(props.molecule.gemmiStructure)
            const response = await commandCentre.current.cootCommand(
                {
                    returnType: "mesh",
                    command: "DrawCremerPopleSphere",
                    commandArgs: [input_cif_string, false],
                },
                false
            )
            const mesh = response.data.result.result
            let maxR2 = 0
            for (const group of (mesh?.vert_tri ?? [])) {
                for (const verts of group) {
                    for (let i = 0; i < verts.length; i += 3) {
                        const r2 = verts[i] * verts[i] + verts[i + 1] * verts[i + 1] + verts[i + 2] * verts[i + 2]
                        if (r2 > maxR2) maxR2 = r2
                    }
                }
            }
            if (!cancelled && maxR2 > 0) setPinRadius(Math.sqrt(maxR2))
        }
        measure()
        return () => { cancelled = true }
    }, [props.molecule.molNo])

    // The pinpoints are generated in the same order as these parameters, so the
    // i-th pin corresponds to cremerPopleParams[i] (chain_id + residue_id).
    useEffect(() => {
        let cancelled = false
        props.molecule.getPrivateerCremerPopleParameters(true).then((params) => {
            if (!cancelled) setCremerPopleParams(params ?? [])
        })
        return () => { cancelled = true }
    }, [props.molecule])

    const getCremerPopleSphere = useCallback(async () => {
        const input_cif_string = window.cootModule.get_mmcif_string_from_gemmi_struct(props.molecule.gemmiStructure)
        const response = await commandCentre.current.cootCommand(
            {
                returnType: "mesh",
                command: "DrawCremerPopleSphere",
                commandArgs: [input_cif_string, showRadialConformations],
            },
            false
        )
        return response.data.result.result;
    }, [props.molecule.molNo, showRadialConformations])

    const getMesh = async () => {
        return getCremerPopleSphere()
    }

    /*
    const handleExportGltf = useCallback(async () => {
        const mesh = await getCremerPopleSphere()
        const glb = meshDataToGlb(mesh)
        doDownload([glb], `cremer-pople-${props.molecule.name ?? props.molecule.molNo}.glb`)
    }, [getCremerPopleSphere, props.molecule.name, props.molecule.molNo])
    */

    // Direction on the unit sphere for a pinpoint, matching the C++ placement:
    // dir = (sinθ cosφ, sinθ sinφ, cosθ).
    const directionFromAngles = (theta: number, phi: number): [number, number, number] => [
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
    ]

    const handleClick = useCallback((clickedDirection: [number, number, number] | null) => {
        if (!clickedDirection || cremerPopleParams.length === 0) return

        // Find the pinpoint whose direction is closest to the click (largest dot).
        let bestIndex = -1
        let bestDot = -Infinity
        for (let i = 0; i < cremerPopleParams.length; i++) {
            const d = directionFromAngles(cremerPopleParams[i].theta, cremerPopleParams[i].phi)
            const dot = clickedDirection[0] * d[0] + clickedDirection[1] * d[1] + clickedDirection[2] * d[2]
            if (dot > bestDot) { bestDot = dot; bestIndex = i }
        }

        // Require the click to land reasonably close to a pin (within ~25°).
        if (bestIndex < 0 || bestDot < Math.cos(25 * Math.PI / 180)) return

        const param = cremerPopleParams[bestIndex]
        setPickedResidue(`${param.chain_id}/${param.residue_id}`)
        console.log(`Centering on //${param.chain_id}/${param.residue_id}/`)
        props.molecule.centreOn(`//${param.chain_id}/${param.residue_id}/`, true, true)
    }, [cremerPopleParams, props.molecule])

    return (
        <>
           <SimpleWebGL stackDirection={props.stackDirection} width={props.width} handleClick={handleClick} getMesh={getMesh} refreshKey={showRadialConformations} pickRadius={pinRadius} />
           <label style={{ display: "block", margin: "0.2rem" }}>
               <input
                   type="checkbox"
                   checked={showRadialConformations}
                   onChange={(evt) => setShowRadialConformations(evt.target.checked)}
               />
               {" "}Show radial conformations
           </label>
           <div style={{ margin: "0.2rem", minHeight: "1.2rem" }}>
               {pickedResidue ? `Selected residue: ${pickedResidue}` : "Click a pinpoint to select its residue"}
           </div>
        </>
    )
}
