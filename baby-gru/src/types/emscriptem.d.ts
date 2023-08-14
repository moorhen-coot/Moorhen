export namespace emscriptem {

    type instance<T> = {
        clone: () => T;
        delete: () => void;
        isDeleted: () => boolean;
    }

    interface vector<T> extends instance<T> {
        size: () => number;
        get: (idx: number) => T;
        at: (idx: number) => T;
        length: () => number;
        push_back: (arg0: T) => void;
    }

    interface map<T1, T2> extends instance<T1> {
        set(idx: T2, value: T1): void;
        size: () => number;
        get: (idx: T2) => T1;
        length: () => number;
        keys: () => vector<T2>;
    }
    
}
