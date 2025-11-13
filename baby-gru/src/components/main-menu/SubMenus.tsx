import { useMoorhenInstance } from "../../InstanceManager";
import { menuFromMap } from "./createSubMenu";

export const CalculateMenu = (props: { extraCalculateMenuItems?: React.ReactElement[] }) => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const calculateMenu = menuFromMap(subMenuMap, "calculate");

    return (
        <>
            {calculateMenu}
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
        </>
    );
};

export const EditMenu = (props: { extraEditMenuItems?: React.ReactNode[] }) => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const editMenu = menuFromMap(subMenuMap, "edit");

    return (
        <>
            {editMenu}
            {props.extraEditMenuItems && props.extraEditMenuItems.map(menu => menu)}
        </>
    );
};

export const HelpMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const helpMenu = menuFromMap(subMenuMap, "help");

    return <>{helpMenu}</>;
};

export const LigandMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const ligandMenu = menuFromMap(subMenuMap, "ligand");

    return <>{ligandMenu}</>;
};

export const MapToolsMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const mapToolsMenu = menuFromMap(subMenuMap, "map-tool");
    return <>{mapToolsMenu}</>;
};

export const ValidationMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const validationMenu = menuFromMap(subMenuMap, "validation");
    return <>{validationMenu}</>;
};

export const ViewMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const viewMenu = menuFromMap(subMenuMap, "view");

    return <>{viewMenu}</>;
};

export const FileMenu = () => {
    const subMenuMap = useMoorhenInstance().subMenuMap;
    const fileMenu = menuFromMap(subMenuMap, "file");

    return <>{fileMenu}</>;
};
