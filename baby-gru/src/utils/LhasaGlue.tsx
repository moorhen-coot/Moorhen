// Import auto-generated type-definitions
import '../LhasaReact/src/lhasa.d.ts';
import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useEffect, useState } from 'react';

function LhasaWrapper() {
    const [isCootAttached, setCootAttached] = useState(false);
    
    let handler = () => {
        setCootAttached(true);
    };

    useEffect(() => {
        window.addEventListener('cootModuleAttached', handler);
        return () => {
            window.removeEventListener('cootModuleAttached', handler);
        };
    },[]);

    if(isCootAttached) {
        console.log("Blob is: ", window.cootModule);
    }
    return (
        <>
                {isCootAttached &&
                    <LhasaComponent Lhasa={window.cootModule} />
                }
        </>
    );
}

export { LhasaWrapper }