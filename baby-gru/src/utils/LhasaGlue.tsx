// Is this import needed here?
import '../LhasaReact/src/lhasa.d.ts';
import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useEffect, useState } from 'react';


class LhasaWrapperProps {
    rdkit_molecule_pickle_map?: Map<string, string>;
    smiles_callback?: (id: string, smiles: string) => void;
}

function LhasaWrapper({rdkit_molecule_pickle_map, smiles_callback}: LhasaWrapperProps) {
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
                    rdkit_molecule_pickle_map={rdkit_molecule_pickle_map}
                    icons_path_prefix='/baby-gru/pixmaps/lhasa_icons'
                    name_of_host_program='Moorhen'
                    smiles_callback={smiles_callback}
                />
            }
        </>
    );
}

export { LhasaWrapper }