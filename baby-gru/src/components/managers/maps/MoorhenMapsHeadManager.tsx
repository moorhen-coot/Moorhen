import { useSelector } from "react-redux";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMapManager} from "./MoorhenMapManager"

/**
 * React functional component that manages and renders a list of `MoorhenMapManager` components,
 * one for each map present in the application's Redux state.
 *
 * @returns {JSX.Element[] | null} An array of `MoorhenMapManager` components, or `null` if no maps are present.
 *
 * @remarks
 * - Uses the `useSelector` hook to access the `maps` array from the Redux state.
 * - Each `MoorhenMapManager` is keyed by its associated `molNo`.
 */
export const MoorhenMapsHeadManager = () => {
    const maps = useSelector((state: moorhen.State) => state.maps);
    const managerList = maps.map((item) => 
        <MoorhenMapManager mapMolNo={item.molNo} key={'MapManager' + item.molNo}/> 
    )
    return (managerList ? managerList : null)
}