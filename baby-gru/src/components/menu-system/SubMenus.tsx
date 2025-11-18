import { MenuFromItems } from "./MenuFromItems ";
import { useMoorhenMenuSystem } from "./MenuSystemContext";

export const CalculateMenu = (props: { extraCalculateMenuItems?: React.ReactElement[] }) => {
    const calculateMenu = useMoorhenMenuSystem().getItems("calculate");

    return (
        <MenuFromItems menuItemList={calculateMenu} />
        //     {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
        // </>
    );
};

export const EditMenu = (props: { extraEditMenuItems?: React.ReactNode[] }) => {
    const editMenu = useMoorhenMenuSystem().getItems("edit");

    return (
        <MenuFromItems menuItemList={editMenu} />
        //     {props.extraEditMenuItems && props.extraEditMenuItems.map(menu => menu)}
        // </>
    );
};

export const HelpMenu = () => {
    const helpMenu = useMoorhenMenuSystem().getItems("help");

    return <MenuFromItems menuItemList={helpMenu} />;
};

export const LigandMenu = () => {
    const ligandMenu = useMoorhenMenuSystem().getItems("ligand");

    return <MenuFromItems menuItemList={ligandMenu} />;
};

export const MapToolsMenu = () => {
    const mapToolsMenu = useMoorhenMenuSystem().getItems("map-tool");
    return <MenuFromItems menuItemList={mapToolsMenu} />;
};

export const ValidationMenu = () => {
    const validationMenu = useMoorhenMenuSystem().getItems("validation");
    return <MenuFromItems menuItemList={validationMenu} />;
};

export const ViewMenu = () => {
    const viewMenu = useMoorhenMenuSystem().getItems("view");

    return <MenuFromItems menuItemList={viewMenu} />;
};

export const FileMenu = () => {
    const fileMenu = useMoorhenMenuSystem().getItems("file");

    return <MenuFromItems menuItemList={fileMenu} />;
};

export const PreferencesMenu = () => {
    const preferencesMenu = useMoorhenMenuSystem().getItems("preferences");

    return <MenuFromItems menuItemList={preferencesMenu} />;
};
