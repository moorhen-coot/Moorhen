// The C++ smooth surface (wasm_src/smooth-surface.cc) of a few atoms, for tests/gpu/smoothSurface.gpu.spec.ts:
// the atoms, the field as the C++ hands it to the GPU (smoothSurfaceFieldFromAtoms: iso - field) and
// the C++'s own finished surface, at the app's default options. One thread, so the run is the same
// every time. See tests/gpu/README.md to regenerate tests/gpu/data/smooth-surface-1df7-first40.cpp.bin.gz.
//
// atoms.bin (makeAtoms.ts): u32 n; n x f32 (x, y, z, r); n x i32 residue; f32 probe.
// out.bin, little-endian: the input as read; i32 nx, ny, nz; f32 origin x, y, z, spacing; f32 field;
// u32 vertices, indices; f32 positions, normals (3 per vertex); u32 indices; i32 atom, other; f32 weight;
// i32 near, f32 near gap (4 per vertex); then stage 2's hand-off (ses_field_unblurred): f32 field
// (unblurred, opened), u32 changed-mask length (0 if none) and its bytes, f64 interior, f64 clamp.
#include "smooth-surface.hh"

#include <cstdio>
#include <vector>

int main(int argc, char **argv) {
    if (argc != 3) { std::fprintf(stderr, "usage: smoothSurfaceReference atoms.bin out.bin\n"); return 2; }
    FILE *in = std::fopen(argv[1], "rb");
    uint32_t n = 0;
    if (!in || std::fread(&n, 4, 1, in) != 1) return 2;
    std::vector<float> packed(4 * n);
    std::vector<int32_t> residue(n);
    float probe = 0;
    if (std::fread(packed.data(), 4, packed.size(), in) != packed.size() || std::fread(residue.data(), 4, n, in) != n ||
        std::fread(&probe, 4, 1, in) != 1) return 2;
    std::fclose(in);
    std::vector<smooth_surface::atom_t> atoms(n);
    for (uint32_t i = 0; i < n; i++) atoms[i] = {packed[4 * i], packed[4 * i + 1], packed[4 * i + 2], packed[4 * i + 3]};

    smooth_surface::options_t o;
    o.threads = 1;
    smooth_surface::grid_t grid = smooth_surface::ses_field(atoms, probe, o.spacing, o.sigma, o.max_shift, o.open_radius, o.threads,
                                                            o.open_uncapped, o.heal_blur);
    for (auto &v : grid.field) v = float(grid.iso - v);
    smooth_surface::surface_t s = smooth_surface::surface_from_atoms(atoms, residue, probe, o);

    FILE *out = std::fopen(argv[2], "wb");
    auto put = [&](const void *data, size_t bytes) { std::fwrite(data, 1, bytes, out); };
    put(&n, 4); put(packed.data(), 4 * packed.size()); put(residue.data(), 4 * n); put(&probe, 4);
    int32_t dims[3] = {grid.nx, grid.ny, grid.nz};
    float placement[4] = {float(grid.origin[0]), float(grid.origin[1]), float(grid.origin[2]), float(grid.spacing)};
    put(dims, 12); put(placement, 16); put(grid.field.data(), 4 * grid.field.size());
    uint32_t counts[2] = {uint32_t(s.positions.size() / 3), uint32_t(s.indices.size())};
    put(counts, 8);
    put(s.positions.data(), 4 * s.positions.size()); put(s.normals.data(), 4 * s.normals.size()); put(s.indices.data(), 4 * s.indices.size());
    put(s.atom.data(), 4 * s.atom.size()); put(s.other.data(), 4 * s.other.size()); put(s.weight.data(), 4 * s.weight.size());
    put(s.near.data(), 4 * s.near.size()); put(s.near_gap.data(), 4 * s.near_gap.size());
    smooth_surface::grid_t unblurred = smooth_surface::ses_field_unblurred(atoms, probe, o.spacing, o.sigma, o.max_shift, o.open_radius,
                                                                           o.threads, o.open_uncapped, o.heal_blur);
    put(unblurred.field.data(), 4 * unblurred.field.size());
    uint32_t changed = uint32_t(unblurred.changed.size());
    put(&changed, 4); put(unblurred.changed.data(), changed);
    double tail[2] = {double(unblurred.interior), unblurred.clamp};
    put(tail, 16);
    std::fclose(out);
    std::fprintf(stderr, "%u atoms; grid %dx%dx%d; %u vertices, %u triangles\n", n, grid.nx, grid.ny, grid.nz, counts[0], counts[1] / 3);
    return 0;
}
