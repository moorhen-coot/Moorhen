import * as elements from "../../../src/WebComponent/elements";

/**
 * React 19 sets a prop on a custom element as a property when the element has a property by that
 * name, and as an attribute otherwise. A read-only property named like an attribute (an internal
 * getter, say) therefore makes React throw when the attribute is used in JSX, and takes the page
 * down. Every attribute an element observes must be either no property at all, or a settable one.
 */
const descriptorOf = (prototype: object, name: string): PropertyDescriptor | undefined => {
    for (let p: object | null = prototype; p; p = Object.getPrototypeOf(p)) {
        const descriptor = Object.getOwnPropertyDescriptor(p, name);
        if (descriptor) return descriptor;
    }
    return undefined;
};

const elementClasses = Object.entries(elements).filter(
    ([name, value]) => typeof value === "function" && name.endsWith("Element") && name !== "MoorhenUIElement"
) as [string, { prototype: object; observedAttributes?: string[] }][];

describe("Moorhen UI elements with React 19", () => {
    test("there are elements to check", () => {
        expect(elementClasses.length).toBeGreaterThanOrEqual(9);
    });

    test.each(elementClasses)("%s: every attribute React may set as a property can be set", (_name, elementClass) => {
        const readOnly = (elementClass.observedAttributes ?? []).filter(attribute => {
            const descriptor = descriptorOf(elementClass.prototype, attribute);
            return descriptor !== undefined && !descriptor.set && !descriptor.writable;
        });
        expect(readOnly).toEqual([]);
    });
});
