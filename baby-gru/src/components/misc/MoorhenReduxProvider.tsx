import { Provider } from 'react-redux';
import MoorhenStore from '../../store/MoorhenReduxStore';

/**
 * Redux provider for the Moorhen app. MoorhenContainer needs to be rendered inside this component.
 * @param children - The Moorhen container
 * @example
 * import { MoorhenReduxProvider, MoorhenContainer } from "moorhen";
 * 
 * const exampleApp = () => {
 * 
 *    return <MoorhenReduxProvider>
 *              <MoorhenContainer/>
 *           <\MoorhenReduxProvider>
 * }
 * 
 */
export const MoorhenReduxProvider = ({ children }) => {
    return  <Provider store={MoorhenStore}> 
                {children}
            </Provider>
};