/**
 * Smooth surfaces shaded per pixel from their field, in the WebGPU renderer: group 2 of the field
 * pipelines (previewShaders.ts, fs_field) - the field's grid as a uniform, its values as storage -
 * one bind group per field, made when it is first drawn and dropped once it is released or no
 * longer drawn. The field itself belongs to its representation (smoothSurface/surfaceField.ts).
 */
import { BufferUsage, ShaderStage } from './gpu';
import { FIELD_GRID_BYTES, type SurfaceField, surfaceFieldUniform } from './smoothSurface/surfaceField';

interface CachedField {
    uniform: GPUBuffer;
    bindGroup: GPUBindGroup;
    /** The colouring it was made with: remade when another is attached. */
    colouring: SurfaceField["colouring"];
    used: boolean;
}

export class FieldShading {
    /** For group 2 of the field pipelines. */
    readonly layout: GPUBindGroupLayout;
    private readonly cache = new Map<SurfaceField, CachedField>();

    constructor(private readonly device: GPUDevice) {
        this.layout = device.createBindGroupLayout({
            label: "field shading",
            entries: [
                { binding: 16, visibility: ShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 17, visibility: ShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
                // Per-pixel colour: atoms, their colours, the bins' starts and members.
                ...[18, 19, 20, 21].map(binding => ({ binding, visibility: ShaderStage.FRAGMENT, buffer: { type: "read-only-storage" as const } })),
            ],
        });
        // For a field with no atoms attached: bound, never read (FieldGrid says so).
        this.noAtoms = device.createBuffer({ label: "field shading no atoms", size: 16, usage: BufferUsage.STORAGE });
    }

    private readonly noAtoms: GPUBuffer;

    /** Whether a field can be drawn with: on this device, and not released. */
    usable(field: SurfaceField | null | undefined): field is SurfaceField {
        return !!field && !field.released;
    }

    /**
     * The bind group for `field`, made the first time it is asked for (and again when other atoms are
     * attached). `atomColours`: coloured per pixel from its atoms, if it has them, rather than by its
     * vertex colours. The grid block is written each time, so a new blend width shows at once.
     */
    bindGroupFor(field: SurfaceField, atomColours = false): GPUBindGroup {
        let cached = this.cache.get(field);
        if (cached && cached.colouring !== field.colouring) {
            cached.uniform.destroy();
            this.cache.delete(field);
            cached = undefined;
        }
        if (!cached) {
            const uniform = this.device.createBuffer({
                label: "field shading grid", size: FIELD_GRID_BYTES, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            });
            const c = field.colouring;
            const atoms = c ? [c.atoms, c.colours, c.binStart, c.binMembers] : [this.noAtoms, this.noAtoms, this.noAtoms, this.noAtoms];
            const bindGroup = this.device.createBindGroup({
                label: "field shading",
                layout: this.layout,
                entries: [
                    { binding: 16, resource: { buffer: uniform } },
                    { binding: 17, resource: { buffer: field.buffer } },
                    ...atoms.map((buffer, k) => ({ binding: 18 + k, resource: { buffer } })),
                ],
            });
            cached = { uniform, bindGroup, colouring: c, used: true };
            this.cache.set(field, cached);
        }
        this.device.queue.writeBuffer(cached.uniform, 0, surfaceFieldUniform(field, atomColours));
        cached.used = true;
        return cached.bindGroup;
    }

    /** After a frame: forget the fields released or not drawn since the last prune. */
    prune(): void {
        for (const [field, cached] of this.cache) {
            if (field.released || !cached.used) {
                cached.uniform.destroy();
                this.cache.delete(field);
            } else {
                cached.used = false;
            }
        }
    }

    destroy(): void {
        this.cache.forEach(cached => cached.uniform.destroy());
        this.cache.clear();
        this.noAtoms.destroy();
    }
}
