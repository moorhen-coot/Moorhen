/*
   smooth-surface-test.cc: Moorhen (WebCoot) Molecular Graphics Program
   Copyright (C) 2026 University of York
   This library is free software: you can redistribute it and/or
   modify it under the terms of the GNU Lesser General Public License
   version 3, modified in accordance with the provisions of the
   license to address the requirements of UK law.
   You should have received a copy of the modified GNU Lesser General
   Public License along with this library.  If not, copies may be
   downloaded from http://www.ccp4.ac.uk/ccp4license.php
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Lesser General Public License for more details.
 */

// Native driver for smooth-surface.cc, to compare it with the TS it was ported from
// (baby-gru/scripts/smooth-surface-compare.ts writes the input and checks the output):
//
//   g++ -O2 -std=c++17 smooth-surface.cc smooth-surface-test.cc -o smooth-surface-test
//   ./smooth-surface-test atoms.bin out.bin
//
// atoms.bin: int32 n; n x float32 (x, y, z, r); n x int32 residue; float32 probe, spacing, sigma,
// max_shift (<= 0: infinity), open_radius; int32 refine.
// out.bin: int32 nx, ny, nz; float64 spacing, iso; nx*ny*nz float32 field; int32 vertices, triangle
// corners; positions, normals (float32); indices (uint32); atom, other (int32); weight (float32);
// near (int32), near_gap (float32), colour_atoms per vertex; float64 timings (sas, seeds, transform,
// distance, blur, contour, atoms).

#include "smooth-surface.hh"

#include <cstdio>
#include <iostream>

template <typename T> static bool read(FILE *f, T *data, size_t count) { return fread(data, sizeof(T), count, f) == count; }
template <typename T> static void write(FILE *f, const T *data, size_t count) { fwrite(data, sizeof(T), count, f); }

int main(int argc, char **argv) {
    if (argc != 3) { std::cerr << "usage: smooth-surface-test atoms.bin out.bin\n"; return 2; }
    FILE *in = fopen(argv[1], "rb");
    if (!in) { std::cerr << "cannot read " << argv[1] << "\n"; return 2; }
    int32_t n = 0;
    read(in, &n, 1);
    std::vector<float> packed(4 * n);
    std::vector<int32_t> residue_of(n);
    float params[5];
    int32_t refine = 1;
    if (!read(in, packed.data(), packed.size()) || !read(in, residue_of.data(), residue_of.size()) || !read(in, params, 5) || !read(in, &refine, 1)) {
        std::cerr << "short input\n"; return 2;
    }
    fclose(in);
    std::vector<smooth_surface::atom_t> atoms(n);
    for (int i = 0; i < n; i++) atoms[i] = {packed[4 * i], packed[4 * i + 1], packed[4 * i + 2], packed[4 * i + 3]};
    smooth_surface::options_t options;
    double probe = params[0];
    options.spacing = params[1];
    options.sigma = params[2];
    options.max_shift = params[3] > 0 ? double(params[3]) : std::numeric_limits<double>::infinity();
    options.open_radius = params[4];
    options.refine = refine != 0;

    // The field on its own (as sesField), then the whole (which makes it again, timed).
    smooth_surface::grid_t grid = smooth_surface::ses_field(atoms, probe, options.spacing, options.sigma, options.max_shift, options.open_radius);
    smooth_surface::surface_t s = smooth_surface::surface_from_atoms(atoms, residue_of, probe, options);

    FILE *out = fopen(argv[2], "wb");
    int32_t dims[3] = {grid.nx, grid.ny, grid.nz};
    double grid_values[2] = {grid.spacing, grid.iso};
    write(out, dims, 3);
    write(out, grid_values, 2);
    write(out, grid.field.data(), grid.field.size());
    int32_t counts[2] = {int32_t(s.positions.size() / 3), int32_t(s.indices.size())};
    write(out, counts, 2);
    write(out, s.positions.data(), s.positions.size());
    write(out, s.normals.data(), s.normals.size());
    write(out, s.indices.data(), s.indices.size());
    write(out, s.atom.data(), s.atom.size());
    write(out, s.other.data(), s.other.size());
    write(out, s.weight.data(), s.weight.size());
    write(out, s.near.data(), s.near.size());
    write(out, s.near_gap.data(), s.near_gap.size());
    const auto &t = s.timings;
    double timings[7] = {t.sas, t.seeds, t.transform, t.distance, t.blur, t.contour, t.atoms};
    write(out, timings, 7);
    fclose(out);
    std::cerr << n << " atoms: grid " << grid.nx << "x" << grid.ny << "x" << grid.nz << ", " << counts[0] << " vertices, "
              << counts[1] / 3 << " triangles; ms sas " << t.sas << " seeds " << t.seeds << " transform " << t.transform
              << " distance " << t.distance << " blur " << t.blur << " contour " << t.contour << " atoms " << t.atoms << "\n";
    return 0;
}
