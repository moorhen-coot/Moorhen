import { Fragment, useState } from "react";
import { BabyGruMoleculeCard } from "./BabyGruMoleculeCard"
import { BabyGruMapCard } from "./BabyGruMapCard"

export const BabyGruDisplayObjects = (props) => {
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState(-1)

    let displayData = [];
    if (props.molecules.length != 0) {
        props.molecules.forEach(molecule => displayData.push(
            <BabyGruMoleculeCard
                key={molecule.molNo}
                index={molecule.molNo}
                molecule={molecule}
                currentDropdownMolNo={currentDropdownMolNo}
                setCurrentDropdownMolNo={setCurrentDropdownMolNo}
                {...props} />
        )
        )
    }

    if (props.maps.length != 0) {
        props.maps.forEach(map => displayData.push(
            <BabyGruMapCard
                key={map.molNo}
                index={map.molNo}
                map={map}
                initialContour={0.8}
                initialRadius={13}
                currentDropdownMolNo={currentDropdownMolNo}
                setCurrentDropdownMolNo={setCurrentDropdownMolNo}
                {...props} />
        ))
    }

    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <Fragment>
        {displayData}
    </Fragment>
}

