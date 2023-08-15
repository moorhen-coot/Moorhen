import { useState, useEffect, useCallback } from "react";
import { moorhen } from "../../../src/types/moorhen";
import { webGL } from "../../../src/types/mgWebGL";

export const MoorhenExitMenu = (props: {
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    exitCallback: (viewSettings: moorhen.viewDataSession, molData?: { molName: string; pdbData: string; }[]) => Promise<void>;
}) => {

    const handleExit = useCallback(async (doSave: boolean = false) => {
        console.log('HELOOOOOO')
        const selectedMolecules = props.molecules.filter(molecule => !molecule.isLigand())
        console.log(selectedMolecules)
        const moleculeAtoms = await Promise.all(selectedMolecules.map(molecule => molecule.getAtoms()))

        const molData = selectedMolecules.map((molecule, index) => {
            return {molName: molecule.name, pdbData: moleculeAtoms[index].data.result.pdbData}
        })
        const viewData: moorhen.viewDataSession = {
            origin: props.glRef.current.origin,
            backgroundColor: props.glRef.current.background_colour,
            ambientLight: props.glRef.current.light_colours_ambient,
            diffuseLight: props.glRef.current.light_colours_diffuse,
            lightPosition: props.glRef.current.light_positions,
            specularLight: props.glRef.current.light_colours_specular,
            fogStart: props.glRef.current.gl_fog_start,
            fogEnd: props.glRef.current.gl_fog_end,
            zoom: props.glRef.current.zoom,
            doDrawClickedAtomLines: props.glRef.current.doDrawClickedAtomLines,
            clipStart: (props.glRef.current.gl_clipPlane0[3] + props.glRef.current.fogClipOffset) * -1,
            clipEnd: props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset,
            quat4: props.glRef.current.myQuat
        }
      
        props.exitCallback(viewData, molData)

    }, [props.exitCallback, props.molecules])

    useEffect(() => {
        handleExit()
    }, [])

    return <span>Saving...</span>
}