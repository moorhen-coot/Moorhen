import { Fragment } from "react";
import { BabyGruMoleculeCard } from "./BabyGruMoleculeCard"
import { BabyGruMapCard } from "./BabyGruMapCard"

export const BabyGruDisplayObjects = (props) => {

    let displayData = [];
    if (props.molecules.length!=0) {
        props.molecules.forEach(molecule => displayData.push(
            <BabyGruMoleculeCard 
                index={molecule.coordMolNo}
                molecule={molecule}
                molecules={props.molecules}
                setMolecules={props.setMolecules}
                glRef={props.glRef}
                commandCentre={props.commandCentre}>
            </BabyGruMoleculeCard>
            )
        )
    } 
    
    if (props.maps.length!=0) {
        props.maps.forEach(map => displayData.push(
            <BabyGruMapCard {...props} index={map.mapMolNo} map={map} initialContour={0.8} initialRadius={13} initialMapLitLines={false} />
        ))
    }   

    displayData.sort((a,b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <Fragment>
                {displayData}
            </Fragment>
}

