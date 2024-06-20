import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useEffect, useState } from 'react';

export const LhasaWrapper = (props: {
    rdkit_molecule_pickle_map?: Map<string, string>;
    smiles_callback?: (id: string, smiles: string) => void;
}) => {

    const [isCootAttached, setCootAttached] = useState(() => { 
        return window.cootModule !== undefined;
    });
    
    let handler = () => {
        setCootAttached(true);
    };

    useEffect(() => {
        document.addEventListener('cootModuleAttached', handler);
        return () => {
            document.removeEventListener('cootModuleAttached', handler);
        };
    },[]);

    return  isCootAttached ?
                <LhasaComponent 
                    Lhasa={window.cootModule}
                    show_footer={false}
                    show_top_panel={false}
                    rdkit_molecule_pickle_map={props.rdkit_molecule_pickle_map}
                    icons_path_prefix='/pixmaps/lhasa_icons'
                    name_of_host_program='Moorhen'
                    smiles_callback={props.smiles_callback}
                /> : null
}
