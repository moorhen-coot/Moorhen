import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { MoorhenMapManager} from "./MoorhenMapManager"

export const MoorhenMapsHeadManager = () => {
    const maps = useSelector((state: moorhen.State) => state.maps);
    const managerList = maps.map((item) => 
        <MoorhenMapManager mapMolNo={item.molNo} key={'MapManager' + item.molNo}/> 
    )
    return (managerList ? managerList : null)
}