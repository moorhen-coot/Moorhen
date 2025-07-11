export const create = jest.fn(() => ({
    select: jest.fn(() => ({
        selectAll: jest.fn(() => ({
            remove: jest.fn(),
            data: jest.fn(() => ({
                enter: jest.fn(() => ({
                    append: jest.fn(() => ({
                        attr: jest.fn(),
                        style: jest.fn(),
                        text: jest.fn(),
                        on: jest.fn(),
                    })),
                })),
                exit: jest.fn(() => ({
                    remove: jest.fn(),
                })),
            })),
            append: jest.fn(() => ({
                attr: jest.fn(),
                style: jest.fn(),
                text: jest.fn(),
            })),
        })),
        append: jest.fn(() => ({
            attr: jest.fn(),
            style: jest.fn(),
            text: jest.fn(),
        })),
        attr: jest.fn(),
        style: jest.fn(),
        text: jest.fn(),
        on: jest.fn(),
    })),
    append: jest.fn(() => ({
        attr: jest.fn(),
        style: jest.fn(),
        text: jest.fn(),
    })),
}));

export const select = jest.fn(() => ({
    selectAll: jest.fn(() => ({
        remove: jest.fn(),
        data: jest.fn(() => ({
            enter: jest.fn(() => ({
                append: jest.fn(() => ({
                    attr: jest.fn(),
                    style: jest.fn(),
                    text: jest.fn(),
                })),
            })),
        })),
    })),
    append: jest.fn(() => ({
        attr: jest.fn(),
        style: jest.fn(),
        text: jest.fn(),
    })),
}));

export const selectAll = jest.fn(() => ({
    remove: jest.fn(),
    data: jest.fn(() => ({
        enter: jest.fn(() => ({
            append: jest.fn(() => ({
                attr: jest.fn(),
                style: jest.fn(),
                text: jest.fn(),
            })),
        })),
    })),
}));

// Add other d3 functions you might use
export const scaleLinear = jest.fn(() => ({
    domain: jest.fn(() => ({
        range: jest.fn(() => jest.fn()),
    })),
    range: jest.fn(() => jest.fn()),
}));

export const axisBottom = jest.fn(() => jest.fn());
export const axisLeft = jest.fn(() => jest.fn());

export default {
    create,
    select,
    selectAll,
    scaleLinear,
    axisBottom,
    axisLeft,
};