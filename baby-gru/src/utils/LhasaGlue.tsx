// Is this import needed here?
import '../LhasaReact/src/lhasa.d.ts';
import { LhasaComponent } from '../LhasaReact/src/Lhasa';
import { useEffect, useState } from 'react';

function LhasaWrapper() {
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
                    icons_path_prefix='/baby-gru/pixmaps/lhasa_icons'
                />
            }
        </>
    );
}

export { LhasaWrapper }