import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Dispatch, useState } from 'react';
import { batch, useSelector } from "react-redux";
import { moorhen } from "../types/moorhen";

interface MenuState {
    settings: Record<string, Record<string, any>>; 
}

const initialState: MenuState = {
    settings: {}
};

const menusSlice = createSlice({
    name: 'menus',
    initialState,
    reducers: {
        setMenuSetting: (state, action: PayloadAction<{ menu: string; key: string; value: any }>) => {
            if (!state.settings[action.payload.menu]) {
                state.settings[action.payload.menu] = {}; 
            }
            state.settings[action.payload.menu][action.payload.key] = action.payload.value;
        },
        resetMenuSetting: (state, action: PayloadAction<{ menu: string; key: string }>) => {
            if (state.settings[action.payload.menu]) {
                delete state.settings[action.payload.menu][action.payload.key];
            }
        },
        resetMenu: (state, action: PayloadAction<{ menu: string }>) => {
            delete state.settings[action.payload.menu]; 
        }
    }
});


/**
 * Custom hook to manage menu state and store it to Redux.
 * @param menu - The name of the menu.
 * @param key - The key for the specific setting.
 * @param defaultValue - The default value if the setting is not found in the Redux store.
 * @param dispatch - Optional Redux dispatch function to update the store when the value changes.
 * @returns A tuple containing the current value and a function to update it.
 */
export const useMenuStateMemory = <T>(menu: string, key: string, defaultValue: T, dispatch: Dispatch<any> = null) => {
    const storeValue: T = useSelector((state: moorhen.State) => state.menus.settings[menu]?.[key]) ?? defaultValue;
    const [value, setValue] = useState<T>(storeValue);
    
    const setStoreValue = (newValue: T) => {
        setValue(newValue);
        if (dispatch) {
            dispatch(setMenuSetting({ menu, key, value: newValue }));
        }
    };

    return [value, setStoreValue] as const;
};

/**
 * Custom hook to retrieve a menu setting from the Redux store.
 * @param menu - The name of the menu.
 * @param key - The key for the specific setting.
 * @param defaultValue - The default value if the setting is not found in the Redux store.
 * @returns The value of the setting from the Redux store or the default value.
 */
export const useMenuMemory = <T>(menu: string, key: string, defaultValue: T) => {
    const storedValue: T = useSelector((state: moorhen.State) => state.menus.settings[menu]?.[key]) ?? defaultValue;
    return storedValue as T;
};

/**
 * Utility function to batch dispatch multiple menu settings.
 * Groups multiple `setMenuSetting` actions into a single render update.
 * 
 * @param dispatch - The Redux dispatch function.
 * @param menu - The name of the menu.
 * @param data - An array of key-value pairs to be stored.
 */
export const dispatchMenuMemory = (dispatch: Dispatch<any>, menu: string, data: { key: string; value: any }[]) => {
    const exec = data.forEach(item => {
        dispatch(setMenuSetting({ menu, key: item.key, value: item.value }));
    });
    batch(() => {
        exec;
    });
};

export const { setMenuSetting, resetMenuSetting, resetMenu } = menusSlice.actions;
export default menusSlice.reducer;
