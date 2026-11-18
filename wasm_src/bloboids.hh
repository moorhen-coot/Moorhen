/*
   bloboids.hh: Moorhen (WebCoot) Molecular Graphics Program
   Derived from DrawBlobEllipsoids in pygl/build_tree_primitives.cc: CCP4MG Molecular Graphics Program
   Copyright (C) 2001-2008 University of York, CCLRC
   Copyright (C) 2009-2011 University of York
   Copyright (C) 2012-2026 STFC

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
 * Bloboids: one ellipsoid for each group of atoms (a chain), showing where its atoms are - centred
 * on their mean, along their principal axes, with semi-axes of two standard deviations along each
 * plus 0.7 A, as CCP4MG draws them.
 *
 * This part knows nothing of molecules (no MMDB): groups of points in, ellipsoids and a triangle
 * mesh out. The caller (DrawBloboids, moorhen-wrappers-helpers.h) makes the groups and colours.
 *
 * Where CCP4MG's went wrong, and what is done instead:
 *  - SpheroidCollection turned a unit sphere onto the axes with two rotations, the second by an
 *    angle from acos (so without its sign), patched by trying 90 degrees: the long axis came out
 *    right and the other two often did not. Here the axes are the columns of the rotation.
 *  - matrix::Eigen's Jacobi kept a cached largest element per row but refreshed only the two rows
 *    it had turned, so it could stop with off-diagonal elements left (or run out of iterations and
 *    return nothing). Here a cyclic Jacobi sweeps every pair until the off-diagonal sum is
 *    negligible next to the diagonal.
 *  - A group of one point had its covariance divided by N - 1 = 0. Here it is a sphere.
 */

#ifndef MOORHEN_BLOBOIDS_HH
#define MOORHEN_BLOBOIDS_HH

#include <array>
#include <vector>

namespace moorhen_bloboids {

typedef std::array<double, 3> Vec3;

/**
 * The eigenvalues and eigenvectors of a symmetric 3 x 3 matrix (only its upper triangle is read),
 * by cyclic Jacobi rotations: values largest first, and vectors[k] the unit eigenvector of
 * values[k]; the three are perpendicular and right-handed (vectors[2] = vectors[0] x vectors[1]).
 */
void symmetric_eigen3(const double a[3][3], double values[3], Vec3 vectors[3]);

struct Ellipsoid {
    Vec3 centre;
    /** Half-lengths along axes[0], axes[1], axes[2], longest first. */
    Vec3 semi_axes;
    /** Unit axes, perpendicular and right-handed. */
    Vec3 axes[3];
};

/**
 * The ellipsoid of a group of points: centred on their mean, along the principal axes of their
 * covariance (divided by N - 1, as CCP4MG), semi-axes `n_sigma` standard deviations plus
 * `padding`. One point gives a sphere of radius `padding`; none, an ellipsoid of zero size at the
 * origin (check the group is not empty first).
 */
Ellipsoid ellipsoid_of_points(const std::vector<Vec3> &points, double n_sigma = 2.0, double padding = 0.7);

/** Triangles with a normal and an RGBA colour per vertex, wound anticlockwise seen from outside. */
struct Mesh {
    std::vector<float> positions;
    std::vector<float> normals;
    std::vector<float> colours;
    std::vector<unsigned int> indices;
};

/**
 * Add the ellipsoid to `mesh`: a unit sphere (an octahedron with each face split `subdivisions`
 * times, so 8 x 4^subdivisions triangles) stretched along the axes, with the ellipsoid's own
 * normals - not the sphere's turned, which a stretched sphere would be lit with.
 */
void append_ellipsoid(const Ellipsoid &ellipsoid, const std::array<float, 4> &colour, int subdivisions, Mesh &mesh);

} // namespace moorhen_bloboids

#endif
