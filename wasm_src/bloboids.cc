/*
   bloboids.cc: Moorhen (WebCoot) Molecular Graphics Program
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

#include "bloboids.hh"

#include <algorithm>
#include <cmath>
#include <map>
#include <utility>

namespace moorhen_bloboids {

static Vec3 cross(const Vec3 &a, const Vec3 &b) {
    return {a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]};
}

static double dot(const Vec3 &a, const Vec3 &b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

static Vec3 normalised(const Vec3 &a) {
    double l = std::sqrt(dot(a, a));
    if (!(l > 0)) return {0, 0, 0};
    return {a[0] / l, a[1] / l, a[2] / l};
}

void symmetric_eigen3(const double a_in[3][3], double values[3], Vec3 vectors[3]) {
    double a[3][3];
    double v[3][3] = {{1, 0, 0}, {0, 1, 0}, {0, 0, 1}}; // columns are the eigenvectors
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            a[i][j] = (j >= i) ? a_in[i][j] : a_in[j][i];

    // Cyclic Jacobi: each sweep zeroes every off-diagonal pair in turn; a few sweeps reach
    // rounding error (convergence is quadratic). Stop once the off-diagonal elements are
    // negligible beside the diagonal, or after far more sweeps than any matrix needs.
    for (int sweep = 0; sweep < 50; sweep++) {
        double off = std::fabs(a[0][1]) + std::fabs(a[0][2]) + std::fabs(a[1][2]);
        double diag = std::fabs(a[0][0]) + std::fabs(a[1][1]) + std::fabs(a[2][2]);
        if (off == 0 || off <= 1e-15 * diag) break;
        for (int p = 0; p < 2; p++) {
            for (int q = p + 1; q < 3; q++) {
                if (a[p][q] == 0) continue;
                // The rotation that zeroes a[p][q], by the stable formula for its tangent.
                double theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
                double t = (theta >= 0 ? 1.0 : -1.0) / (std::fabs(theta) + std::sqrt(theta * theta + 1));
                double c = 1 / std::sqrt(t * t + 1), s = t * c;
                for (int k = 0; k < 3; k++) {
                    double akp = a[k][p], akq = a[k][q];
                    a[k][p] = c * akp - s * akq;
                    a[k][q] = s * akp + c * akq;
                }
                for (int k = 0; k < 3; k++) {
                    double apk = a[p][k], aqk = a[q][k];
                    a[p][k] = c * apk - s * aqk;
                    a[q][k] = s * apk + c * aqk;
                }
                for (int k = 0; k < 3; k++) {
                    double vkp = v[k][p], vkq = v[k][q];
                    v[k][p] = c * vkp - s * vkq;
                    v[k][q] = s * vkp + c * vkq;
                }
            }
        }
    }

    // Largest first.
    int order[3] = {0, 1, 2};
    std::sort(order, order + 3, [&](int i, int j) { return a[i][i] > a[j][j]; });
    for (int k = 0; k < 3; k++) {
        values[k] = a[order[k]][order[k]];
        vectors[k] = normalised({v[0][order[k]], v[1][order[k]], v[2][order[k]]});
    }
    // Right-handed: the third is the cross product of the first two (it is already, up to sign).
    vectors[2] = normalised(cross(vectors[0], vectors[1]));
}

Ellipsoid ellipsoid_of_points(const std::vector<Vec3> &points, double n_sigma, double padding) {
    Ellipsoid e;
    e.centre = {0, 0, 0};
    e.axes[0] = {1, 0, 0};
    e.axes[1] = {0, 1, 0};
    e.axes[2] = {0, 0, 1};
    e.semi_axes = {padding, padding, padding};
    const size_t n = points.size();
    if (n == 0) {
        e.semi_axes = {0, 0, 0};
        return e;
    }
    for (const Vec3 &p : points)
        for (int k = 0; k < 3; k++) e.centre[k] += p[k];
    for (int k = 0; k < 3; k++) e.centre[k] /= n;
    if (n < 2) return e;

    double cov[3][3] = {{0, 0, 0}, {0, 0, 0}, {0, 0, 0}};
    for (const Vec3 &p : points) {
        double d[3] = {p[0] - e.centre[0], p[1] - e.centre[1], p[2] - e.centre[2]};
        for (int i = 0; i < 3; i++)
            for (int j = i; j < 3; j++) cov[i][j] += d[i] * d[j];
    }
    for (int i = 0; i < 3; i++)
        for (int j = i; j < 3; j++) cov[i][j] /= (n - 1);

    double values[3];
    symmetric_eigen3(cov, values, e.axes);
    // Rounding can leave a flat or straight group's smallest variance a hair below zero.
    for (int k = 0; k < 3; k++) e.semi_axes[k] = n_sigma * std::sqrt(std::max(0.0, values[k])) + padding;
    return e;
}

/** The vertices and triangles of a unit sphere: an octahedron with each face split, normalised. */
static void unit_sphere(int subdivisions, std::vector<Vec3> &vertices, std::vector<std::array<unsigned int, 3>> &triangles) {
    vertices = {{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}};
    // Anticlockwise seen from outside: (a, b, c) with (b - a) x (c - a) pointing out.
    triangles = {{0, 2, 4}, {2, 1, 4}, {1, 3, 4}, {3, 0, 4}, {2, 0, 5}, {1, 2, 5}, {3, 1, 5}, {0, 3, 5}};
    for (int level = 0; level < subdivisions; level++) {
        std::map<std::pair<unsigned int, unsigned int>, unsigned int> midpoints;
        auto midpoint = [&](unsigned int i, unsigned int j) {
            std::pair<unsigned int, unsigned int> key(std::min(i, j), std::max(i, j));
            auto found = midpoints.find(key);
            if (found != midpoints.end()) return found->second;
            const Vec3 &a = vertices[i], &b = vertices[j];
            vertices.push_back(normalised({a[0] + b[0], a[1] + b[1], a[2] + b[2]}));
            unsigned int index = vertices.size() - 1;
            midpoints[key] = index;
            return index;
        };
        std::vector<std::array<unsigned int, 3>> finer;
        finer.reserve(4 * triangles.size());
        for (const auto &t : triangles) {
            unsigned int ab = midpoint(t[0], t[1]), bc = midpoint(t[1], t[2]), ca = midpoint(t[2], t[0]);
            finer.push_back({t[0], ab, ca});
            finer.push_back({ab, t[1], bc});
            finer.push_back({ca, bc, t[2]});
            finer.push_back({ab, bc, ca});
        }
        triangles.swap(finer);
    }
}

void append_ellipsoid(const Ellipsoid &e, const std::array<float, 4> &colour, int subdivisions, Mesh &mesh) {
    std::vector<Vec3> sphere;
    std::vector<std::array<unsigned int, 3>> triangles;
    unit_sphere(std::max(0, subdivisions), sphere, triangles);

    const unsigned int first = mesh.positions.size() / 3;
    for (const Vec3 &u : sphere) {
        // A point of the sphere, stretched along each axis: p = sum of semi_axes[k] u[k] axes[k].
        // Its normal is the gradient of the ellipsoid's equation there: sum of u[k] / semi_axes[k]
        // along axes[k].
        Vec3 p = e.centre, n = {0, 0, 0};
        for (int k = 0; k < 3; k++) {
            double inverse = e.semi_axes[k] > 0 ? 1.0 / e.semi_axes[k] : 0.0;
            for (int i = 0; i < 3; i++) {
                p[i] += e.semi_axes[k] * u[k] * e.axes[k][i];
                n[i] += inverse * u[k] * e.axes[k][i];
            }
        }
        n = normalised(n);
        for (int i = 0; i < 3; i++) {
            mesh.positions.push_back(p[i]);
            mesh.normals.push_back(n[i]);
        }
        for (int i = 0; i < 4; i++) mesh.colours.push_back(colour[i]);
    }
    // The axes are right-handed, so stretching along them keeps the sphere's winding.
    for (const auto &t : triangles)
        for (int i = 0; i < 3; i++) mesh.indices.push_back(first + t[i]);
}

} // namespace moorhen_bloboids
