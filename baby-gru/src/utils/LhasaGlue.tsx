// Import auto-generated type-definitions
import '../LhasaReact/src/lhasa.d.ts';
import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useSelector } from 'react-redux';
import { moorhen } from '../types/moorhen.js';
//import Module from '/baby-gru/moorhen.js?url';

function LhasaWrapper() {
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    
    if(cootInitialized) {
        console.log("Blob is: ", window.CCP4Module);
    }
    return (
    <>
            {cootInitialized &&
                <LhasaComponent Lhasa={window.CCP4Module} />
            }
    </>
    );
}

export { LhasaWrapper }