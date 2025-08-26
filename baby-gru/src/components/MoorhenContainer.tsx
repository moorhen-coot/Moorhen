import { MoorhenGlobalInstanceProvider } from "../InstanceManager";
import { ContainerProps, InnerMoorhenContainer } from "./MoorhenInnerContainer";

export const MoorhenContainer = (props: ContainerProps) => {
    return (
        <MoorhenGlobalInstanceProvider>
            <InnerMoorhenContainer {...props} />
        </MoorhenGlobalInstanceProvider>
    );
};
