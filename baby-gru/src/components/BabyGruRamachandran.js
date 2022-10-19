import { Fragment, useEffect, useRef, useState } from "react"
import { Ramachandran } from "../WebGL/Ramachandran"
import { cootCommand, postCootMessage } from "../BabyGruUtils"

export const BabyGruRamachandran = (props) => {
    const ramachandranRef = useRef();
    const [clickedResidue, setClickedResidue] = useState(null)


    return <Fragment>
                <Ramachandran
                    ref={ramachandranRef}
                    onClick={(result) => setClickedResidue(result)} 
                    molecules={props.molecules}
                    cootWorker={props.cootWorker} 
                    postCootMessage={postCootMessage}
                />
            </Fragment>

}