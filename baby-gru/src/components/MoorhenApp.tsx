import { useRef } from 'react';
import { MoorhenContainer } from "./MoorhenContainer";
import { MoorhenReduxProvider } from './misc/MoorhenReduxProvider'
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';

export const MoorhenApp = (props) => {
    const glRef = useRef<null | webGL.MGWebGL>(null)
    const timeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null)
    const commandCentre = useRef<null | moorhen.CommandCentre>(null)
    const moleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const mapsRef = useRef<null | moorhen.Map[]>(null)
    const activeMapRef = useRef<null | moorhen.Map>(null)
    const lastHoveredAtom = useRef<null | moorhen.HoveredAtom>(null)
    const prevActiveMoleculeRef = useRef<null | moorhen.Molecule>(null)

    const collectedProps = {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        lastHoveredAtom, prevActiveMoleculeRef,
    }

    return  <MoorhenReduxProvider>
                <MoorhenContainer {...collectedProps}/>
            </MoorhenReduxProvider>
}
