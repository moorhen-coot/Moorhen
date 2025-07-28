import { useRef } from 'react';
import { Provider } from 'react-redux';
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import store from '../store/MoorhenReduxStore';
import { MoorhenContainer } from "./MoorhenContainer";

export const MoorhenApp = () => {
    const glRef = useRef<null | webGL.MGWebGL>(null);
    const timeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null);
    const commandCentre = useRef<null | moorhen.CommandCentre>(null);
    const moleculesRef = useRef<null | moorhen.Molecule[]>(null);
    const mapsRef = useRef<null | moorhen.Map[]>(null);
    const activeMapRef = useRef<null | moorhen.Map>(null);
    const lastHoveredAtom = useRef<null | moorhen.HoveredAtom>(null);


    return (
        <Provider store={store}>
            <MoorhenContainer 
                glRef={glRef}
                timeCapsuleRef={timeCapsuleRef}
                commandCentre={commandCentre}
                moleculesRef={moleculesRef}
                mapsRef={mapsRef}
                activeMapRef={activeMapRef}
                lastHoveredAtomRef={lastHoveredAtom}
            />
        </Provider>
    );
};
