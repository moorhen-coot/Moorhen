/**
 * withOriginAt, behind the 3D objects panel's "Current origin" button: the object goes to a new
 * origin whole, its second point (a cylinder's end, a cone's top) shifted by the same amount.
 */
import { withOriginAt } from "../../src/store/threeDObjectsSlice";
import { newConeObject, newCylinderObject, newPathObject, newSphereObject } from "../../src/utils/threeDObjectFactories";

describe("withOriginAt", () => {
    test("moves a cylinder whole, keeping its length and direction", () => {
        const cylinder = { ...newCylinderObject(), origin: [1, 2, 3] as [number, number, number], end: [1, 2, 8] as [number, number, number] };
        const moved = withOriginAt(cylinder, [10, 0, -5]);
        expect(moved.origin).toEqual([10, 0, -5]);
        expect(moved.end).toEqual([10, 0, 0]);
        expect(moved.radius).toBe(cylinder.radius);
        // The original is left alone: it may be frozen in the store.
        expect(cylinder.origin).toEqual([1, 2, 3]);
        expect(cylinder.end).toEqual([1, 2, 8]);
    });

    test("moves a cone's top with its base", () => {
        const cone = { ...newConeObject(), origin: [0, 0, 0] as [number, number, number], top: [0, 4, 0] as [number, number, number] };
        const moved = withOriginAt(cone, [-2, -2, -2]);
        expect(moved.top).toEqual([-2, 2, -2]);
    });

    test("leaves what is relative to the origin as it is", () => {
        const path = { ...newPathObject(), origin: [5, 5, 5] as [number, number, number], points: [0, 0, 0, 1, 1, 1] };
        const moved = withOriginAt(path, [0, 0, 0]);
        expect(moved.points).toEqual([0, 0, 0, 1, 1, 1]);
        expect(moved.origin).toEqual([0, 0, 0]);

        const sphere = withOriginAt(newSphereObject(), [7, 8, 9]);
        expect(sphere.origin).toEqual([7, 8, 9]);
        expect(sphere.type).toBe("sphere");
    });

    test("does not share the given array, so later edits to it do not move the object", () => {
        const target: [number, number, number] = [1, 1, 1];
        const moved = withOriginAt(newSphereObject(), target);
        target[0] = 99;
        expect(moved.origin).toEqual([1, 1, 1]);
    });
});
