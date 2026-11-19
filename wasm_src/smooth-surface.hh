/*
   smooth-surface.hh: Moorhen (WebCoot) Molecular Graphics Program
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

/*
 * Moorhen's smooth molecular surface: the solvent-excluded surface as a signed distance field on a
 * grid, blurred (with the blur's shift capped), opened to cut pinched necks, contoured by marching
 * cubes, split once with positions and normals from the field, and each vertex given the atoms it
 * belongs to - for colouring and residue ownership afterwards, by the caller.
 *
 * A port of src/utils/smoothSurface.ts (baby-gru), function for function, which stays the reference:
 * the same arithmetic (double, with float storage where the TS has Float32Array) and the same order,
 * so the two give the same surface. The roadmap and the reasons for each step are in
 * baby-gru/src/.roadmaps/smooth-surface.md and the TS comments.
 *
 * This part knows nothing of molecules (no MMDB, no emscripten): atoms (centre, van der Waals radius)
 * and a residue index per atom in, a mesh and each vertex's atoms out. The caller makes the atoms
 * and residues and does the colouring.
 */

#ifndef MOORHEN_SMOOTH_SURFACE_HH
#define MOORHEN_SMOOTH_SURFACE_HH

#include <cstdint>
#include <limits>
#include <vector>

namespace smooth_surface {

    struct atom_t {
        double x, y, z;
        //! van der Waals radius, A
        double r;
    };

    //! How the surface is made (smoothSurfaceSetting in the TS); the defaults are the TS defaults.
    struct options_t {
        //! grid spacing, A (raised if the grid would be too large)
        double spacing = 0.5;
        //! Gaussian blur of the distance field, A; 0: no blur
        double sigma = 0.5;
        //! how far the blur may move the surface, A (soft cap); infinity: the plain blur
        double max_shift = 0.3;
        //! radius of the ball rolled inside the surface to cut pinched necks, A; 0: off
        double open_radius = 0.5;
        //! split every triangle once, positions and normals from the field
        bool refine = true;
        //! threads to use; 0: the hardware's, at most 8 (the WASM build's pthread pool is 32, Coot's
        //! own work shares it). The result does not depend on it.
        int threads = 0;
    };

    //! Where the time went, ms.
    struct timings_t {
        double sas = 0, seeds = 0, transform = 0, distance = 0, blur = 0, contour = 0, atoms = 0;
    };

    //! The blurred SES signed distance field: positive inside, x fastest, then y, z.
    struct grid_t {
        std::vector<float> field;
        int nx = 0, ny = 0, nz = 0;
        double origin[3] = {0, 0, 0};
        double spacing = 0;
        //! the level to contour at: inside is above it
        double iso = 0;
        timings_t timings;
    };

    //! How many of its nearest atoms a vertex keeps for its colour.
    constexpr int colour_atoms = 4;

    //! The surface: the mesh, and each vertex's atoms (indices into the atoms given).
    struct surface_t {
        std::vector<float> positions;   // 3 per vertex
        std::vector<float> normals;     // 3 per vertex, unit, out of the surface
        std::vector<uint32_t> indices;  // 3 per triangle, counter-clockwise seen from outside
        //! the atom whose sphere the vertex is nearest
        std::vector<int32_t> atom;
        //! the nearest atom of another residue within the ownership band; -1 if none
        std::vector<int32_t> other;
        //! how much of the vertex is `atom`'s (>= 0.5), the rest `other`'s; 1 where there is no other
        std::vector<float> weight;
        //! colour_atoms nearest atoms per vertex, nearest first, -1 past the last
        std::vector<int32_t> near;
        //! how far each of those atoms' spheres is, |v - a| - r
        std::vector<float> near_gap;
        timings_t timings;
        //! the grid the surface was contoured on
        int nx = 0, ny = 0, nz = 0;
        double spacing = 0;
    };

    //! The blurred SES signed distance field of these atoms (empty field if there are none).
    grid_t ses_field(const std::vector<atom_t> &atoms, double probe, double spacing, double sigma,
                     double max_shift = std::numeric_limits<double>::infinity(), double open_radius = 0, int threads = 0);

    //! The whole of it: the surface of `atoms` (`residue_of`: a residue index per atom) with each
    //! vertex's atoms. An empty surface if there is nothing to contour.
    surface_t surface_from_atoms(const std::vector<atom_t> &atoms, const std::vector<int32_t> &residue_of,
                                 double probe, const options_t &options);

    //! How far from a second residue's atom a vertex is still shared with it.
    inline double ownership_band(double probe) { return probe > 1.4 ? probe : 1.4; }
}

#endif // MOORHEN_SMOOTH_SURFACE_HH
