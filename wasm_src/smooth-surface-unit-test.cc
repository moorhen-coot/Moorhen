/*
   smooth-surface-unit-test.cc: Moorhen (WebCoot) Molecular Graphics Program
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

// Tests of smooth-surface.cc, natively: each kind of SES patch against its exact shape (the field
// is exact to within the grid's interpolation), the mesh's conventions (closed, normals out,
// counter-clockwise), the opening, no false cavities and concave patches against a brute-force SES
// on a real protein, and each vertex's atoms.
//
//   g++ -O2 -std=c++17 -pthread smooth-surface.cc smooth-surface-unit-test.cc -o smooth-surface-unit-test
//   ./smooth-surface-unit-test 1df7.xyzr
//
// The protein: "x y z r" per line, or a PDB file (radii then only roughly by element, which the
// limits were not set for). Run by baby-gru/tests/__tests__/smoothSurfaceCpp.test.ts, which writes
// 1df7 with M2T's united-atom radii, as the app sizes atoms. Exit status: the number of failed checks.

#include "smooth-surface.hh"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <fstream>
#include <functional>
#include <map>
#include <numeric>
#include <optional>
#include <set>
#include <string>
#include <vector>

using namespace smooth_surface;
using V = std::array<double, 3>;

static int failures = 0;
static const char *current = "";
#define CHECK(cond) do { if (!(cond)) { failures++; std::fprintf(stderr, "FAIL [%s] %s:%d: %s\n", current, __FILE__, __LINE__, #cond); } } while (0)
#define CHECK_LT(a, b) do { double a_ = (a), b_ = (b); if (!(a_ < b_)) { failures++; std::fprintf(stderr, "FAIL [%s] %s:%d: %s = %g, not < %g\n", current, __FILE__, __LINE__, #a, a_, b_); } } while (0)
#define CHECK_GT(a, b) do { double a_ = (a), b_ = (b); if (!(a_ > b_)) { failures++; std::fprintf(stderr, "FAIL [%s] %s:%d: %s = %g, not > %g\n", current, __FILE__, __LINE__, #a, a_, b_); } } while (0)

static double inf = std::numeric_limits<double>::infinity();
static V sub(const V &a, const V &b) { return {a[0] - b[0], a[1] - b[1], a[2] - b[2]}; }
static double len(const V &a) { return std::hypot(a[0], a[1], a[2]); }

// The contoured surface of `atoms`, every atom its own residue.
static surface_t contour(const std::vector<atom_t> &atoms, double probe, double spacing, double sigma, bool refine = false,
                         double max_shift = inf, double open_radius = 0) {
    std::vector<int32_t> residue_of(atoms.size());
    std::iota(residue_of.begin(), residue_of.end(), 0);
    options_t o;
    o.spacing = spacing; o.sigma = sigma; o.max_shift = max_shift; o.open_radius = open_radius; o.refine = refine;
    return surface_from_atoms(atoms, residue_of, probe, o);
}

static size_t vertex_count(const surface_t &s) { return s.positions.size() / 3; }
static V position(const surface_t &s, size_t v) { return {s.positions[3 * v], s.positions[3 * v + 1], s.positions[3 * v + 2]}; }
static V normal(const surface_t &s, size_t v) { return {s.normals[3 * v], s.normals[3 * v + 1], s.normals[3 * v + 2]}; }

// Worst distance from the patch's exact shape - a sphere about select(x), of |radius| - and worst
// normal angle (radius < 0: the normal points away from the centre).
struct surface_error_t { double position = 0, degrees = 0; int n = 0; };
static surface_error_t surface_error(const surface_t &s, const std::function<std::optional<V>(const V &)> &select, double radius) {
    surface_error_t e;
    for (size_t v = 0; v < vertex_count(s); v++) {
        V x = position(s, v);
        auto centre = select(x);
        if (!centre) continue;
        V to = sub(*centre, x);
        double d = len(to);
        e.position = std::max(e.position, std::abs(d - std::abs(radius)));
        V n = normal(s, v);
        double cos = (radius < 0 ? -1 : 1) * (to[0] * n[0] + to[1] * n[1] + to[2] * n[2]) / d;
        e.degrees = std::max(e.degrees, std::acos(std::min(1.0, cos)) * 180 / M_PI);
        e.n++;
    }
    return e;
}

// Every edge shared by exactly two triangles.
static bool closed(const surface_t &s) {
    std::map<std::pair<uint32_t, uint32_t>, int> edges;
    for (size_t t = 0; t < s.indices.size(); t += 3)
        for (int k = 0; k < 3; k++) {
            uint32_t a = s.indices[t + k], b = s.indices[t + (k + 1) % 3];
            edges[{std::min(a, b), std::max(a, b)}]++;
        }
    for (auto &e : edges) if (e.second != 2) return false;
    return !edges.empty();
}

// Normals point away from the centre, and triangles wind counter-clockwise about them (as M2T's).
static bool out_and_ccw(const surface_t &s) {
    size_t n = vertex_count(s);
    V centre = {0, 0, 0};
    for (size_t v = 0; v < n; v++) for (int k = 0; k < 3; k++) centre[k] += s.positions[3 * v + k] / n;
    long out = 0, ccw = 0;
    for (size_t v = 0; v < n; v++) {
        V d = sub(position(s, v), centre), nm = normal(s, v);
        out += d[0] * nm[0] + d[1] * nm[1] + d[2] * nm[2] >= 0 ? 1 : -1;
    }
    for (size_t t = 0; t < s.indices.size(); t += 3) {
        V a = position(s, s.indices[t]), b = position(s, s.indices[t + 1]), c = position(s, s.indices[t + 2]);
        V u = sub(b, a), w = sub(c, a);
        V cross = {u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]};
        V na = normal(s, s.indices[t]), nb = normal(s, s.indices[t + 1]), nc = normal(s, s.indices[t + 2]);
        double dot = 0;
        for (int k = 0; k < 3; k++) dot += cross[k] * (na[k] + nb[k] + nc[k]);
        ccw += dot >= 0 ? 1 : -1;
    }
    return out > 0 && ccw > 0;
}

// Connected pieces of the mesh, by shared vertices.
static int components(const surface_t &s) {
    std::vector<uint32_t> parent(vertex_count(s));
    std::iota(parent.begin(), parent.end(), 0);
    std::function<uint32_t(uint32_t)> find = [&](uint32_t i) { while (parent[i] != i) i = parent[i] = parent[parent[i]]; return i; };
    for (size_t t = 0; t < s.indices.size(); t += 3) {
        uint32_t a = find(s.indices[t]);
        parent[find(s.indices[t + 1])] = a;
        parent[find(s.indices[t + 2])] = a;
    }
    std::set<uint32_t> roots;
    for (uint32_t i : s.indices) roots.insert(find(i));
    return int(roots.size());
}

// Atoms from a file: "x y z r" per line (.xyzr), or a PDB file's first model, non-water, first
// altloc, radii roughly by element.
static std::vector<atom_t> read_atoms(const std::string &path) {
    std::vector<atom_t> atoms;
    std::ifstream in(path);
    if (path.size() > 5 && path.substr(path.size() - 5) == ".xyzr") {
        atom_t a;
        while (in >> a.x >> a.y >> a.z >> a.r) atoms.push_back(a);
        return atoms;
    }
    std::string line;
    while (std::getline(in, line)) {
        if (line.rfind("ENDMDL", 0) == 0) break;
        if (line.rfind("ATOM", 0) != 0 && line.rfind("HETATM", 0) != 0) continue;
        if (line.size() < 54 || line.substr(17, 3) == "HOH" || (line[16] != ' ' && line[16] != 'A')) continue;
        std::string element = line.size() >= 78 ? line.substr(76, 2) : line.substr(12, 2);
        element.erase(0, element.find_first_not_of(' '));
        double r = element[0] == 'C' ? 1.9 : element[0] == 'N' ? 1.8 : element[0] == 'O' ? 1.7 : element[0] == 'S' ? 2.0 : element[0] == 'H' ? 1.2 : 1.8;
        atoms.push_back({std::stod(line.substr(30, 8)), std::stod(line.substr(38, 8)), std::stod(line.substr(46, 8)), r});
    }
    return atoms;
}

// The exact distance from x to the probe-centre set (the SAS's spheres, the circles where two meet,
// the points where three meet - whichever is nearest and not inside another sphere), by brute force.
static double ses_truth(const std::vector<atom_t> &atoms, const V &x, double probe) {
    struct sphere_t { V c; double R; };
    std::vector<sphere_t> near;
    for (const auto &a : atoms) if (len(sub({a.x, a.y, a.z}, x)) < a.r + probe + 2.5) near.push_back({{a.x, a.y, a.z}, a.r + probe});
    double best = inf;
    auto consider = [&](const V &q, std::initializer_list<size_t> skip) {
        double d = len(sub(q, x));
        if (d >= best) return;
        for (size_t i = 0; i < near.size(); i++) {
            if (std::find(skip.begin(), skip.end(), i) != skip.end()) continue;
            if (len(sub(q, near[i].c)) < near[i].R - 1e-6) return;
        }
        best = d;
    };
    for (size_t i = 0; i < near.size(); i++) {
        V d = sub(x, near[i].c);
        double l = len(d);
        consider({near[i].c[0] + near[i].R * d[0] / l, near[i].c[1] + near[i].R * d[1] / l, near[i].c[2] + near[i].R * d[2] / l}, {i});
    }
    for (size_t i = 0; i < near.size(); i++) for (size_t j = i + 1; j < near.size(); j++) {
        const auto &A = near[i], &B = near[j];
        V u0 = sub(B.c, A.c);
        double d = len(u0);
        if (d >= A.R + B.R) continue;
        V u = {u0[0] / d, u0[1] / d, u0[2] / d};
        double t = (d * d + A.R * A.R - B.R * B.R) / (2 * d), r2 = A.R * A.R - t * t;
        if (r2 <= 0) continue;
        V C = {A.c[0] + t * u[0], A.c[1] + t * u[1], A.c[2] + t * u[2]};
        V w = sub(x, C);
        double al = w[0] * u[0] + w[1] * u[1] + w[2] * u[2];
        w = {w[0] - al * u[0], w[1] - al * u[1], w[2] - al * u[2]};
        double wl = len(w), rc = std::sqrt(r2);
        if (wl > 1e-9) consider({C[0] + rc * w[0] / wl, C[1] + rc * w[1] / wl, C[2] + rc * w[2] / wl}, {i, j});
        for (size_t k = j + 1; k < near.size(); k++) {
            const auto &Cc = near[k];
            V wv = sub(Cc.c, A.c);
            double ii = wv[0] * u[0] + wv[1] * u[1] + wv[2] * u[2];
            V v0 = {wv[0] - ii * u[0], wv[1] - ii * u[1], wv[2] - ii * u[2]};
            double jj = len(v0);
            if (jj < 1e-6) continue;
            V e2 = {v0[0] / jj, v0[1] / jj, v0[2] / jj};
            V e3 = {u[1] * e2[2] - u[2] * e2[1], u[2] * e2[0] - u[0] * e2[2], u[0] * e2[1] - u[1] * e2[0]};
            double uu = (A.R * A.R - B.R * B.R + d * d) / (2 * d);
            double tt = (A.R * A.R - Cc.R * Cc.R + ii * ii + jj * jj) / (2 * jj) - (ii / jj) * uu;
            double h2 = A.R * A.R - uu * uu - tt * tt;
            if (h2 < 0) continue;
            for (double sgn : {1.0, -1.0}) {
                V q;
                for (int m = 0; m < 3; m++) q[m] = A.c[m] + uu * u[m] + tt * e2[m] + sgn * std::sqrt(h2) * e3[m];
                consider(q, {i, j, k});
            }
        }
    }
    return best;
}

int main(int argc, char **argv) {
    if (argc != 2) { std::fprintf(stderr, "usage: smooth-surface-unit-test protein.xyzr\n"); return 2; }

    current = "one atom's SES is its van der Waals sphere";
    {
        auto s = contour({{1, 2, 3, 1.7}}, 1.4, 0.25, 0);
        CHECK(!s.indices.empty());
        double lo = inf, hi = 0, sum = 0;
        for (size_t v = 0; v < vertex_count(s); v++) { double d = len(sub(position(s, v), {1, 2, 3})); lo = std::min(lo, d); hi = std::max(hi, d); sum += d; }
        CHECK_LT(std::abs(sum / vertex_count(s) - 1.7), 0.1);
        CHECK_LT(hi - lo, 0.3);
    }

    current = "blurring keeps the enclosed volume";
    {
        std::vector<atom_t> atoms = {{0, 0, 0, 1.7}, {2.5, 0, 0, 1.7}, {1.2, 2.2, 0, 1.55}};
        auto volume = [&](double sigma) {
            grid_t g = ses_field(atoms, 1.4, 0.3, sigma);
            long n = 0;
            for (float v : g.field) if (v > g.iso) n++;
            return double(n);
        };
        CHECK_LT(std::abs(volume(0.9) / volume(0) - 1), 0.01);
    }

    current = "a convex cap is the atom's sphere";
    {
        V c = {0.12, 0.27, 0.05};
        auto e = surface_error(contour({{c[0], c[1], c[2], 8}}, 1.4, 0.35, 0), [&](const V &) { return c; }, -8);
        CHECK_LT(e.position, 0.01);
        CHECK_LT(e.degrees, 3);
    }

    current = "splitting keeps the contour on the sphere, normals accurate, 4x the triangles";
    {
        V c = {0.13, 0.27, 0.05};
        auto coarse = contour({{c[0], c[1], c[2], 3}}, 1.4, 0.5, 0);
        auto fine = contour({{c[0], c[1], c[2], 3}}, 1.4, 0.5, 0, true);
        CHECK(fine.indices.size() == 4 * coarse.indices.size());
        auto e = surface_error(fine, [&](const V &) { return c; }, -3);
        CHECK_LT(e.position, 0.01);
        CHECK_LT(e.degrees, 0.45);
        CHECK(out_and_ccw(fine));
        // Unsplit, normals from the field along each grid edge: mean and worst angle.
        double sum = 0, worst = 0;
        for (size_t v = 0; v < vertex_count(coarse); v++) {
            V d = sub(position(coarse, v), c), n = normal(coarse, v);
            double deg = std::acos(std::min(1.0, (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / len(d))) * 180 / M_PI;
            sum += deg; worst = std::max(worst, deg);
        }
        CHECK_LT(sum / vertex_count(coarse), 0.1);
        CHECK_LT(worst, 0.27);
    }

    current = "the surface is closed, split or not, normals out and counter-clockwise";
    {
        std::vector<atom_t> atoms = {{0, 0, 0, 1.7}, {3, 0.5, 0, 1.52}, {1.4, 2.4, 0.3, 1.55}};
        for (bool refine : {false, true}) {
            auto s = contour(atoms, 1.4, 0.3, 0.6, refine);
            CHECK(closed(s));
            CHECK(out_and_ccw(s));
        }
    }

    current = "a saddle between two atoms is the probe's torus";
    {
        double r = 1.9, p = 1.4, d = 3.4;
        V o = {0.13, 0.21, 0.07};
        double rc = std::sqrt((r + p) * (r + p) - (d / 2) * (d / 2));
        auto s = contour({{o[0] - d / 2, o[1], o[2], r}, {o[0] + d / 2, o[1], o[2], r}}, p, 0.35, 0);
        auto e = surface_error(s, [&](const V &x) -> std::optional<V> {
            double rho = std::hypot(x[1] - o[1], x[2] - o[2]);
            if (std::abs(x[0] - o[0]) > 0.6 || rho < 1e-6) return std::nullopt;
            return V{o[0], o[1] + (x[1] - o[1]) * rc / rho, o[2] + (x[2] - o[2]) * rc / rho};
        }, p);
        CHECK_GT(e.n, 50);
        CHECK_LT(e.position, 0.03);
        CHECK_LT(e.degrees, 5);
    }

    current = "a dimple between three atoms is the probe's sphere";
    {
        double r = 1.9, p = 1.4, side = 3.6, circ = side / std::sqrt(3.0);
        V o = {0.11, 0.23, 0.05};
        std::vector<atom_t> atoms;
        for (int k = 0; k < 3; k++) atoms.push_back({o[0] + circ * std::cos(2 * M_PI * k / 3), o[1] + circ * std::sin(2 * M_PI * k / 3), o[2], r});
        double height = std::sqrt((r + p) * (r + p) - circ * circ);
        auto e = surface_error(contour(atoms, p, 0.35, 0), [&](const V &x) -> std::optional<V> {
            if (std::hypot(x[0] - o[0], x[1] - o[1]) > 0.4) return std::nullopt;
            return V{o[0], o[1], o[2] + (x[2] > o[2] ? 1 : -1) * height};
        }, p);
        CHECK_GT(e.n, 8);
        CHECK_LT(e.position, 0.08);
        CHECK_LT(e.degrees, 6);
    }

    current = "the probe fills the groove between two touching atoms";
    {
        grid_t g = ses_field({{-1.6, 0, 0, 1.7}, {1.6, 0, 0, 1.7}}, 1.4, 0.2, 0);
        auto at = [&](double x, double y, double z) {
            long i = std::lround((x - g.origin[0]) / g.spacing), j = std::lround((y - g.origin[1]) / g.spacing), k = std::lround((z - g.origin[2]) / g.spacing);
            return g.field[(k * g.ny + j) * g.nx + i];
        };
        // (0, 0.8, 0) is ~1.79 A from either centre: outside both spheres, inside the SES.
        CHECK_GT(at(0, 0.8, 0), 0);
        CHECK_LT(at(0, 4, 0), 0);
    }

    current = "with no probe the van der Waals surface; on spheres of r + probe the accessible surface";
    {
        V c = {0.12, 0.27, 0.05};
        auto vdw = surface_error(contour({{c[0], c[1], c[2], 1.7}}, 0, 0.35, 0), [&](const V &) { return c; }, -1.7);
        CHECK_LT(vdw.position, 0.01);
        CHECK_LT(vdw.degrees, 3);
        auto acc = surface_error(contour({{c[0], c[1], c[2], 3.1}}, 0, 0.35, 0), [&](const V &) { return c; }, -3.1);
        CHECK_LT(acc.position, 0.01);
        // Two overlapping atoms: the crease is kept (a sharp edge marching cubes cuts across within a cell).
        auto pair = surface_error(contour({{-1, 0, 0, 1.7}, {1, 0, 0, 1.7}}, 0, 0.35, 0),
                                  [&](const V &x) { return V{x[0] < 0 ? -1.0 : 1.0, 0, 0}; }, -1.7);
        CHECK_LT(pair.position, 0.1);
    }

    current = "the opening cuts a pinched neck into two lobes and leaves a proper saddle alone";
    {
        std::vector<atom_t> pinched = {{-3, 0.1, 0.05, 2}, {3, 0.1, 0.05, 2}};
        CHECK(components(contour(pinched, 1.4, 0.3, 0)) == 1);
        auto opened = contour(pinched, 1.4, 0.3, 0, false, inf, 0.5);
        CHECK(components(opened) == 2);
        auto e = surface_error(opened, [&](const V &x) -> std::optional<V> {
            if (std::abs(x[0]) <= 3.2) return std::nullopt;
            return V{x[0] > 0 ? 3.0 : -3.0, 0.1, 0.05};
        }, -2);
        CHECK_LT(e.position, 0.02);
        std::vector<atom_t> pair = {{-1.7, 0.21, 0.07, 1.9}, {1.7, 0.21, 0.07, 1.9}};
        grid_t before = ses_field(pair, 1.4, 0.3, 0), after = ses_field(pair, 1.4, 0.3, 0, inf, 0.5);
        long changed = 0;
        for (size_t i = 0; i < before.field.size(); i++)
            if (std::abs(before.field[i]) < 0.5 && std::abs(after.field[i] - before.field[i]) > 1e-6) changed++;
        CHECK(changed == 0);
        // Healing the cuts touches nothing where nothing was cut.
        grid_t healed = ses_field(pair, 1.4, 0.3, 0, inf, 0.5, 0, true, 0.8);
        long healed_changed = 0;
        for (size_t i = 0; i < after.field.size(); i++) if (healed.field[i] != after.field[i]) healed_changed++;
        CHECK(healed_changed == 0);
        // And with it, as the app makes it (blurred, capped, healed), the pinched pair is still two lobes.
        std::vector<int32_t> residue_of = {0, 1};
        options_t o;
        CHECK(o.open_uncapped && o.heal_blur > o.sigma);
        CHECK(components(surface_from_atoms(pinched, residue_of, 1.4, o)) == 2);
    }

    current = "a vertex belongs to the atom it lies on, and in a groove is shared with the other residue";
    {
        // Two atoms of different residues and a third, far, of the first's residue.
        std::vector<atom_t> atoms = {{0, 0, 0, 1.7}, {3, 0, 0, 1.7}, {0, 0, 10, 1.5}};
        options_t o;
        auto s = surface_from_atoms(atoms, {0, 1, 0}, 1.4, o);
        int on_first = 0, shared = 0;
        for (size_t v = 0; v < vertex_count(s); v++) {
            V x = position(s, v);
            CHECK(s.atom[v] >= 0 && s.atom[v] < 3);
            CHECK(s.weight[v] >= 0.5f && s.weight[v] <= 1.0f);
            // The far side of atom 0: its own, nobody else's.
            if (x[0] < -1.5 && std::abs(x[2]) < 3) { on_first++; CHECK(s.atom[v] == 0 && s.other[v] == -1 && s.weight[v] == 1.0f); }
            // In the groove, halfway: shared with the other residue's atom, about evenly.
            if (std::abs(x[0] - 1.5) < 0.1 && std::abs(x[2]) < 3) {
                shared++;
                CHECK(s.other[v] == (s.atom[v] == 0 ? 1 : 0));
                CHECK_LT(s.weight[v], 0.6);
            }
            // The far atom is the first's residue: never anyone's other.
            CHECK(s.other[v] != 2);
            // Its nearest atoms, nearest first.
            for (int k = 1; k < colour_atoms; k++)
                if (s.near[colour_atoms * v + k] >= 0) CHECK(s.near_gap[colour_atoms * v + k] >= s.near_gap[colour_atoms * v + k - 1]);
        }
        CHECK_GT(on_first, 10);
        CHECK_GT(shared, 3);
    }

    std::vector<atom_t> protein = read_atoms(argv[1]);
    current = "no false cavities inside a protein (1df7)";
    {
        CHECK_GT(double(protein.size()), 1000);
        grid_t g = ses_field(protein, 1.4, 0.5, 0);
        std::map<std::array<long, 3>, std::vector<int>> cell;
        for (size_t n = 0; n < protein.size(); n++) cell[{long(std::floor(protein[n].x)), long(std::floor(protein[n].y)), long(std::floor(protein[n].z))}].push_back(int(n));
        long negative = 0, checked = 0;
        for (int k = 0; k < g.nz; k++) for (int j = 0; j < g.ny; j++) for (int i = 0; i < g.nx; i++) {
            V p = {g.origin[0] + i * g.spacing, g.origin[1] + j * g.spacing, g.origin[2] + k * g.spacing};
            double depth = 0;
            for (int dx = -2; dx <= 2; dx++) for (int dy = -2; dy <= 2; dy++) for (int dz = -2; dz <= 2; dz++) {
                auto it = cell.find({long(std::floor(p[0])) + dx, long(std::floor(p[1])) + dy, long(std::floor(p[2])) + dz});
                if (it == cell.end()) continue;
                for (int n : it->second) depth = std::max(depth, protein[n].r - len(sub({protein[n].x, protein[n].y, protein[n].z}, p)));
            }
            if (depth <= 0) continue;
            checked++;
            // The field stops at two grid steps in when unblurred.
            if (g.field[(long(k) * g.ny + j) * g.nx + i] < std::min(depth, 2 * g.spacing) - 0.05) negative++;
        }
        CHECK_GT(double(checked), 1000);
        CHECK(negative == 0);
    }

    current = "concave patches match a brute-force SES (1df7)";
    {
        double P = 1.4;
        auto s = contour(protein, P, 0.4, 0);
        std::vector<double> errors;
        for (size_t v = 0; v < vertex_count(s) && errors.size() < 400; v += 13) {
            V x = position(s, v);
            bool convex = false;
            for (const auto &a : protein) if (len(sub({a.x, a.y, a.z}, x)) - a.r < 0.05) { convex = true; break; }
            if (convex) continue;
            errors.push_back(std::abs(ses_truth(protein, x, P) - P));
        }
        std::sort(errors.begin(), errors.end());
        CHECK_GT(double(errors.size()), 200);
        if (!errors.empty()) {
            CHECK_LT(errors[size_t(0.95 * (errors.size() - 1))], 0.02);
            CHECK_LT(errors.back(), 0.1);
        }
    }

    std::fprintf(stderr, failures ? "%d check(s) failed\n" : "all checks passed\n", failures);
    return failures;
}
