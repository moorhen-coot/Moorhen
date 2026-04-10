import { Dispatch, Store, UnknownAction } from "@reduxjs/toolkit";
import { RootState, setShownControl } from "@/store";

export class StoreExtension {
    private _dispatch: Dispatch<UnknownAction>;
    private _store: Store<RootState>;

    public get dispatch(): Dispatch<UnknownAction> {
        return this._dispatch;
    }
    public get store(): Store<RootState> {
        return this._store;
    }

    public subscribeToStore = <T>(selector: (state: RootState) => T, callback: (value: T) => void) => {
        let previousValue = selector(this._store.getState());

        return this._store.subscribe(() => {
            const newValue = selector(this._store.getState());
            if (previousValue !== newValue) {
                previousValue = newValue;
                callback(newValue);
            }
        });
    };

    public set dispatch(value: Dispatch<UnknownAction>) {
        this._dispatch = value;
    }
    public set store(value: Store<RootState>) {
        this._store = value;
    }

    public setShownControl() {
        this.dispatch(setShownControl(null));
    }
}
