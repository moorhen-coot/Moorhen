import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

export const { setMenuSetting, resetMenuSetting, resetMenu } = menusSlice.actions;
export default menusSlice.reducer;

