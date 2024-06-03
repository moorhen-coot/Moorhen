// Is this import needed here?
import '../LhasaReact/src/lhasa.d.ts';
import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useEffect, useState } from 'react';


class LhasaWrapperProps {
    rdkit_molecule_pickle?: Uint8Array;
}

function LhasaWrapper({rdkit_molecule_pickle}: LhasaWrapperProps) {
    const [isCootAttached, setCootAttached] = useState(() => { 
        // @ts-ignore
        return window.cootModule !== undefined;
    });
    
    let handler = () => {
        setCootAttached(true);
    };

    useEffect(() => {
        window.addEventListener('cootModuleAttached', handler);
        return () => {
            window.removeEventListener('cootModuleAttached', handler);
        };
    },[]);

    return (
        <>
            {isCootAttached &&
                <LhasaComponent 
                    // @ts-ignore
                    Lhasa={window.cootModule}
                    show_footer={false}
                    show_top_panel={false}
                    rdkit_molecule_pickle={rdkit_molecule_pickle}
                    icons_path_prefix='/baby-gru/pixmaps/lhasa_icons'
                />
            }
        </>
    );
}

export { LhasaWrapper }