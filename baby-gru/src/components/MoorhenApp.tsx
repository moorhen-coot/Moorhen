import { Provider } from "react-redux";
import { MoorhenReduxStore as store } from "../store/MoorhenReduxStore";
import { MoorhenGlobalInstanceProvider } from "../InstanceManager";
import { MoorhenContainer } from "./MoorhenContainer";

export const MoorhenApp = () => {
    return (
        <Provider store={store}>
            <MoorhenGlobalInstanceProvider>
                <MoorhenContainer />
            </MoorhenGlobalInstanceProvider>
        </Provider>
    );
};
