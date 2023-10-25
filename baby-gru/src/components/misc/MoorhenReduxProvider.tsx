import { Provider } from 'react-redux';
import MoorhenStore from '../../store/MoorhenReduxStore';

export const MoorhenReduxProvider = ({ children }) => {
    return  <Provider store={MoorhenStore}> 
                {children}
            </Provider>
};