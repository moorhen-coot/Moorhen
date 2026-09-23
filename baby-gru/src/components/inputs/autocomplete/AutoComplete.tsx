import Fuse, { IFuseOptions } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
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
    maxResults?: number;
    debounceMs?: number;
    minQueryLength?: number;
    value?: string;
    setValue?: (text: string) => void;
    searchFn?: (query: string, context: { fuse: Fuse<T>; maxResults?: number }) => Promise<T[]> | T[];
};

const defaultFuseOptions: IFuseOptions<unknown> = {
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    useExtendedSearch: true,
    findAllMatches: true,
    ignoreDiacritics: true,
};

export const MoorhenAutoComplete = <T,>(props: MoorhenAutoCompleteProps<T>) => {
    const { searchItems, resultsRenderer } = props;
    const debounceMs = props.debounceMs ?? 200;
    const minQueryLength = props.minQueryLength ?? 2;
    const fuseOptions = useMemo(() => {
        const { keys: extraKeys, ...extraFuseRest } = props.extraFuseOptions ?? {};
        return { ...defaultFuseOptions, keys: [...(extraKeys ?? []), ...(props.keys ?? [])], ...extraFuseRest };
    }, [props.extraFuseOptions, props.keys]);
    const [_query, _setQuery] = useState<string>("");

    const query = props.value !== undefined ? props.value : _query;
    const setQuery = (newQuery: string) => {
        if (props.setValue) {
            props.setValue(newQuery);
        } else {
            _setQuery(newQuery);
        }
    };
    const [debouncedQuery, setDebouncedQuery] = useState<string>("");
    const [results, setResults] = useState<T[] | null>(null);
    const [internalAutocompleteOpen, setInternalAutocompleteOpen] = useState(false);
    const textInputRef = useRef<HTMLInputElement>(null);

    const autocompleteOpen = props.autocompleteOpen !== undefined ? props.autocompleteOpen : internalAutocompleteOpen;
    const setAutocompleteOpen = props.setAutocompleteOpen !== undefined ? props.setAutocompleteOpen : setInternalAutocompleteOpen;

    const fuse = useMemo(() => new Fuse(searchItems, fuseOptions), [searchItems, fuseOptions]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [query, debounceMs]);

    useEffect(() => {
        let isCancelled = false;

        const doSearch = async () => {
            if (debouncedQuery.length < minQueryLength) {
                if (!isCancelled) {
                    setResults(null);
                }
                return;
            }

            const searchOutput = props.searchFn
                ? await props.searchFn(debouncedQuery, { fuse, maxResults: props.maxResults })
                : fuse.search(debouncedQuery).map(result => result.item);

            const uniqueResults = searchOutput.filter((item, index, self) => self.indexOf(item) === index);
            const limitedResults = props.maxResults ? uniqueResults.slice(0, props.maxResults) : uniqueResults;

            if (!isCancelled) {
                setResults(limitedResults);
            }
        };

        doSearch();

        return () => {
            isCancelled = true;
        };
    }, [debouncedQuery, fuse, minQueryLength, props.maxResults, props.searchFn]);

    const resultToRender = results ? results.map(result => resultsRenderer(result)) : null;

    const textInput = (
        <MoorhenTextInput
            className="moorhen__autocomplete-input"
            ref={textInputRef}
            setText={setQuery}
            text={query}
            onFocus={() => setAutocompleteOpen(true)}
        />
    );

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
                <div className="moorhen__autocomplete-results-container">{resultToRender}</div>
            </MoorhenPopover>
        </MoorhenClickAwayListener>
    );
};
