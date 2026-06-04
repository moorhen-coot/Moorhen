import Fuse, { IFuseOptions } from "fuse.js";
import { useMemo, useRef, useState } from "react";
import { MoorhenMenuItem, MoorhenPopover, MoorhenStack } from "@/components/interface-base";
import { MoorhenClickAwayListener } from "@/components/interface-base/utils/ClickAwayListener";
import { MoorhenTextInput } from "../TextInput";
import "./autocomplete.css";

type MoorhenAutoCompleteProps<T> = {
    extraFuseOptions?: IFuseOptions<T>;
    searchItems: T[];
    keys?: { name: Extract<keyof T, string>; weight: number }[];
    resultsRenderer: (results: T) => React.ReactNode;
    autocompleteOpen?: boolean;
    setAutocompleteOpen?: (open: boolean) => void;
};

const defaultFuseOptions: IFuseOptions<unknown> = {
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    useExtendedSearch: true,
    findAllMatches: true,
    ignoreDiacritics: true,
};

const defaultResultsRenderer = (results: { name: string }[]) => {
    return (
        <MoorhenStack>
            {results.map((result, index) => (
                <MoorhenMenuItem key={index}>{result.name}</MoorhenMenuItem>
            ))}{" "}
        </MoorhenStack>
    );
};

export const MoorhenAutoComplete = <T,>(props: MoorhenAutoCompleteProps<T>) => {
    const { searchItems, resultsRenderer } = props;
    const { keys: extraKeys, ...extraFuseRest } = props.extraFuseOptions ?? {};
    const fuseOptions = { ...defaultFuseOptions, keys: [...(extraKeys ?? []), ...(props.keys ?? [])], ...extraFuseRest };
    const [query, setQuery] = useState<string>("");
    const [internalAutocompleteOpen, setInternalAutocompleteOpen] = useState(false);
    const textInputRef = useRef<HTMLInputElement>(null);

    const autocompleteOpen = props.autocompleteOpen !== undefined ? props.autocompleteOpen : internalAutocompleteOpen;
    const setAutocompleteOpen = props.setAutocompleteOpen !== undefined ? props.setAutocompleteOpen : setInternalAutocompleteOpen;

    const results = useMemo(() => {
        if (query.length > 1) {
            const fuse = new Fuse(searchItems, fuseOptions);
            const fuseResults = fuse.search(query);
            const _results = fuseResults.map(r => r.item);
            const uniqueResults = _results.filter((item, pos) => {
                return _results.indexOf(item) == pos;
            });
            return uniqueResults;
        }
        return null;
    }, [query, searchItems]);

    const resultToRender = results ? results.map(result => resultsRenderer(result)) : null;

    const textInput = <MoorhenTextInput className="moorhen__autocomplete-input"ref={textInputRef} setText={setQuery} onFocus={() => setAutocompleteOpen(true)} />;

    const minWidth = textInputRef.current ? textInputRef.current.getBoundingClientRect().width : null;
    return (
        <MoorhenClickAwayListener
            onClickAway={() => {
                setAutocompleteOpen(false);
                textInputRef.current?.blur();
            }}
        >
            <MoorhenPopover
                link={textInput}
                linkRef={textInputRef}
                isShown={!!results && autocompleteOpen}
                setIsShown={() => {}}
                type="autocomplete"
                popoverPlacement="bottom"
                style={{ minWidth: minWidth ? minWidth - 10 : null }}
            >
                <MoorhenStack direction="column">{resultToRender}</MoorhenStack>
            </MoorhenPopover>
        </MoorhenClickAwayListener>
    );
};
