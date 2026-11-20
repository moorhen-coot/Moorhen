/*
   smooth-surface.cc: Moorhen (WebCoot) Molecular Graphics Program
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

// Moorhen's smooth surface: what each step does and why is in smooth-surface.hh. The functions keep
// the names of the TypeScript they were ported from (featureTransform3d, exposedSas, sesField, ...).

#include "smooth-surface.hh"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <system_error>
#include <thread>
#include <type_traits>

namespace smooth_surface {

namespace {

#include "smooth-surface-mc-table.inc"

using clock_type = std::chrono::steady_clock;

double ms_since(clock_type::time_point &mark) {
    auto now = clock_type::now();
    double ms = std::chrono::duration<double, std::milli>(now - mark).count();
    mark = now;
    return ms;
}

constexpr long max_grid_points = 24000000;

int resolve_threads(int requested) {
    if (requested > 0) return requested;
    unsigned h = std::thread::hardware_concurrency();
    return int(std::max(1u, std::min(h ? h : 1u, 8u)));
}

// work(begin, end) over [0, n), split in contiguous ranges, one per thread; each range is done as it
// would be alone, so the result is the same whatever the thread count. A thread that cannot be
// started (the WASM pthread pool full) leaves its range to this one.
// Free a vector's memory now (clear() keeps it).
template <typename T>
void release(std::vector<T> &v) { std::vector<T>().swap(v); }

template <typename F>
void parallel_for(int threads, long n, F &&work) {
    if (n <= 0) return;
    int t = int(std::min<long>(threads, n));
    if (t <= 1) { work(0L, n); return; }
    long chunk = (n + t - 1) / t;
    std::vector<std::thread> pool;
    try {
        for (int k = 1; k < t; k++) {
            long b = k * chunk, e = std::min(n, b + chunk);
            if (b >= e) break;
            pool.emplace_back([&work, b, e] { work(b, e); });
        }
    } catch (const std::system_error &) {
        // fewer threads: the rest of the ranges below
    }
    work(0L, std::min(n, chunk));
    for (long b = (long(pool.size()) + 1) * chunk; b < n; b += chunk) work(b, std::min(n, b + chunk));
    for (auto &th : pool) th.join();
}
constexpr double edt_inf = 1e20;
constexpr double two_pi = 2 * M_PI;
constexpr double inf = std::numeric_limits<double>::infinity();

// ---------------------------------------------------------------------------------------------
// Feature transform (edt1dFeature, featureTransform3d)

void edt1d_feature(const double *f, double *d, int32_t *src, int n, int32_t *v, double *z) {
    int k = 0;
    v[0] = 0;
    z[0] = -inf;
    z[1] = inf;
    for (int q = 1; q < n; q++) {
        double s = ((f[q] + double(q) * q) - (f[v[k]] + double(v[k]) * v[k])) / (2.0 * q - 2.0 * v[k]);
        while (s <= z[k]) {
            k--;
            s = ((f[q] + double(q) * q) - (f[v[k]] + double(v[k]) * v[k])) / (2.0 * q - 2.0 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = inf;
    }
    k = 0;
    for (int q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        double dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
        src[q] = v[k];
    }
}

// `scratch` is float (the field's own storage): the squared distances round to it.
void feature_transform_3d(std::vector<int32_t> &feature, std::vector<float> &scratch, int nx, int ny, int nz, int threads) {
    for (size_t i = 0; i < feature.size(); i++) scratch[i] = feature[i] >= 0 ? 0.0f : float(edt_inf);
    int n = std::max({nx, ny, nz});
    long plane = long(nx) * ny;
    // One pass along each axis; within a pass every line is independent.
    auto pass = [&](long lines, auto start_of, int len, long stride) {
        parallel_for(threads, lines, [&](long begin, long end) {
            std::vector<double> f(n), d(n), z(n + 1);
            std::vector<int32_t> src(n), line_feature(n), v(n);
            for (long l = begin; l < end; l++) {
                long start = start_of(l);
                for (int i = 0; i < len; i++) {
                    f[i] = scratch[start + i * stride];
                    line_feature[i] = feature[start + i * stride];
                }
                edt1d_feature(f.data(), d.data(), src.data(), len, v.data(), z.data());
                for (int i = 0; i < len; i++) {
                    scratch[start + i * stride] = float(d[i]);
                    feature[start + i * stride] = line_feature[src[i]];
                }
            }
        });
    };
    pass(long(nz) * ny, [&](long l) { return (l / ny) * plane + (l % ny) * nx; }, nx, 1);
    pass(long(nz) * nx, [&](long l) { return (l / nx) * plane + (l % nx); }, ny, nx);
    pass(long(ny) * nx, [&](long l) { return (l / nx) * nx + (l % nx); }, nz, plane);
}

// ---------------------------------------------------------------------------------------------
// Atoms as flat arrays (SasAtoms), binned (binAtoms)

struct sas_atoms_t {
    std::vector<double> x, y, z, R;
};

class atom_bins_t {
public:
    // centres `cx/cy/cz`, cells of `size`; `max_r` the largest radius near() will be asked about
    atom_bins_t(const std::vector<double> &cx, const std::vector<double> &cy, const std::vector<double> &cz,
                double size, double max_r) : size(size), max_r(max_r) {
        double high[3] = {-inf, -inf, -inf};
        for (int k = 0; k < 3; k++) low[k] = inf;
        size_t n = cx.size();
        for (size_t i = 0; i < n; i++) {
            low[0] = std::min(low[0], cx[i]); low[1] = std::min(low[1], cy[i]); low[2] = std::min(low[2], cz[i]);
            high[0] = std::max(high[0], cx[i]); high[1] = std::max(high[1], cy[i]); high[2] = std::max(high[2], cz[i]);
        }
        for (int k = 0; k < 3; k++) dims[k] = n ? int(std::floor((high[k] - low[k]) / size)) + 1 : 1;
        long cells = long(dims[0]) * dims[1] * dims[2];
        start.assign(cells + 1, 0);
        std::vector<int32_t> cell_of_atom(n);
        for (size_t i = 0; i < n; i++) {
            long c = (long(cell_of(cz[i], 2)) * dims[1] + cell_of(cy[i], 1)) * dims[0] + cell_of(cx[i], 0);
            cell_of_atom[i] = int32_t(c);
            start[c + 1]++;
        }
        for (long c = 0; c < cells; c++) start[c + 1] += start[c];
        std::vector<int32_t> fill(start.begin(), start.end() - 1);
        members.resize(n);
        for (size_t i = 0; i < n; i++) members[fill[cell_of_atom[i]]++] = int32_t(i);
    }
    // Into `out`, every atom in the cells around (x, y, z) whose radius R reaches within `gap` of it.
    void near(double x, double y, double z, const std::vector<double> &ax, const std::vector<double> &ay,
              const std::vector<double> &az, const std::vector<double> &R, double gap, std::vector<int32_t> &out) const {
        out.clear();
        int ci = cell_of(x, 0), cj = cell_of(y, 1), ck = cell_of(z, 2);
        int span = std::max(1, int(std::ceil((max_r + gap) / size)));
        for (int k = std::max(0, ck - span); k <= std::min(dims[2] - 1, ck + span); k++) {
            for (int j = std::max(0, cj - span); j <= std::min(dims[1] - 1, cj + span); j++) {
                for (int i = std::max(0, ci - span); i <= std::min(dims[0] - 1, ci + span); i++) {
                    long c = (long(k) * dims[1] + j) * dims[0] + i;
                    for (int32_t m = start[c]; m < start[c + 1]; m++) {
                        int32_t a = members[m];
                        double dx = x - ax[a], dy = y - ay[a], dz = z - az[a];
                        double reach = R[a] + gap;
                        if (dx * dx + dy * dy + dz * dz < reach * reach) out.push_back(a);
                    }
                }
            }
        }
    }
private:
    int cell_of(double v, int k) const { return int(std::floor((v - low[k]) / size)); }
    double size, max_r;
    double low[3];
    int dims[3];
    std::vector<int32_t> start, members;
};

// The first of near[from, to), other than a, b and c, whose expanded sphere q is inside; -1 if none.
int buried_by(const double *q, const int32_t *near, int from, int to, int a, int b, const sas_atoms_t &atoms, int c = -1) {
    for (int k = from; k < to; k++) {
        int c2 = near[k];
        if (c2 == a || c2 == b || c2 == c) continue;
        double dx = q[0] - atoms.x[c2], dy = q[1] - atoms.y[c2], dz = q[2] - atoms.z[c2];
        double R = atoms.R[c2] - 1e-4;
        if (dx * dx + dy * dy + dz * dz < R * R) return c2;
    }
    return -1;
}

// What a seed records: the point, the atom, the other atom of a circle, the circle id.
struct found_t {
    double x = 0, y = 0, z = 0;
    int a = -1, b = -1, circle = -1;
};

// nearestSphere
bool nearest_sphere(double px, double py, double pz, const std::vector<int32_t> &near, const sas_atoms_t &atoms, found_t &out) {
    double best = inf, best_distance = 0;
    int best_atom = -1;
    for (int32_t a : near) {
        double distance = std::hypot(px - atoms.x[a], py - atoms.y[a], pz - atoms.z[a]);
        double gap = distance - atoms.R[a];
        if (gap < best) { best = gap; best_atom = a; best_distance = distance; }
    }
    if (best_atom < 0 || best_distance < 1e-9) return false;
    double scale = atoms.R[best_atom] / best_distance;
    out.x = atoms.x[best_atom] + (px - atoms.x[best_atom]) * scale;
    out.y = atoms.y[best_atom] + (py - atoms.y[best_atom]) * scale;
    out.z = atoms.z[best_atom] + (pz - atoms.z[best_atom]) * scale;
    out.a = best_atom; out.b = -1; out.circle = -1;
    return true;
}

// ---------------------------------------------------------------------------------------------
// The exposed SAS (ExposedSas, exposedSas)

struct exposed_sas_t {
    std::vector<uint8_t> exposed;
    std::vector<int32_t> circle_start, circle_ids;
    std::vector<int32_t> atom_circle_start, atom_circle_ids;
    std::vector<int32_t> neighbour_start, neighbour_ids;
    std::vector<int32_t> other;
    std::vector<double> centre, axis, e1, e2, radius;
    std::vector<int32_t> arc_start;
    std::vector<double> arc_from, arc_length;
};

// One atom's share of the exposed SAS: its neighbours, whether it is inside one, and the circles it
// is the lower-numbered atom of, with their exposed arcs.
struct atom_circles_t {
    std::vector<int32_t> neighbours;
    bool contained = false;
    std::vector<int32_t> other;
    std::vector<double> centre, axis, e1, e2, radius;
    std::vector<int32_t> arc_count;
    std::vector<double> arc_from, arc_length;
};

// Atom a's circles; `circle_count` is shared (atomic) since both
// atoms of a pair count it.
void circles_of_atom(int a, const sas_atoms_t &sas, const std::vector<int32_t> &near, std::vector<std::atomic<int32_t>> &circle_count,
                     atom_circles_t &out, std::vector<double> &lo, std::vector<double> &hi, std::vector<int> &order, std::vector<double> &arcs) {
    const auto &x = sas.x, &y = sas.y, &z = sas.z, &R = sas.R;
    for (int32_t b : near) if (b != a) out.neighbours.push_back(b);
    for (int32_t b : near) {
        if (b == a) continue;
        double ux0 = x[b] - x[a], uy0 = y[b] - y[a], uz0 = z[b] - z[a];
        double d = std::hypot(ux0, uy0, uz0);
        if (d + R[a] <= R[b] && (d > 1e-9 || R[a] < R[b] || a > b)) out.contained = true;
        if (b < a || d < 1e-6 || d >= R[a] + R[b]) continue;
        double t = (d * d + R[a] * R[a] - R[b] * R[b]) / (2 * d);
        double r2 = R[a] * R[a] - t * t;
        if (r2 <= 0) continue;
        circle_count[a]++; circle_count[b]++;
        double rc = std::sqrt(r2);
        double ux = ux0 / d, uy = uy0 / d, uz = uz0 / d;
        double cx = x[a] + t * ux, cy = y[a] + t * uy, cz = z[a] + t * uz;
        double px = 0, py = 0, pz = 0;
        if (std::abs(ux) <= std::abs(uy) && std::abs(ux) <= std::abs(uz)) px = 1;
        else if (std::abs(uy) <= std::abs(uz)) py = 1;
        else pz = 1;
        double along = px * ux + py * uy + pz * uz;
        double ax1 = px - along * ux, ay1 = py - along * uy, az1 = pz - along * uz;
        double l1 = std::hypot(ax1, ay1, az1);
        ax1 /= l1; ay1 /= l1; az1 /= l1;
        double ax2 = uy * az1 - uz * ay1, ay2 = uz * ax1 - ux * az1, az2 = ux * ay1 - uy * ax1;
        lo.clear(); hi.clear();
        bool whole = false;
        for (int32_t c : near) {
            if (c == a || c == b) continue;
            double wx = cx - x[c], wy = cy - y[c], wz = cz - z[c];
            double A = 2 * rc * (wx * ax1 + wy * ay1 + wz * az1);
            double B = 2 * rc * (wx * ax2 + wy * ay2 + wz * az2);
            double Rc = R[c] - 1e-4;
            double K = Rc * Rc - (wx * wx + wy * wy + wz * wz) - r2;
            double M = std::hypot(A, B);
            if (K <= -M) continue;
            if (K > M) { whole = true; break; }
            double half = M_PI - std::acos(K / M);
            double mid = std::atan2(B, A) + M_PI;
            if (mid >= two_pi) mid -= two_pi;
            double from = mid - half, to = mid + half;
            if (from < 0) { lo.push_back(from + two_pi); lo.push_back(0); hi.push_back(two_pi); hi.push_back(to); }
            else if (to > two_pi) { lo.push_back(from); lo.push_back(0); hi.push_back(two_pi); hi.push_back(to - two_pi); }
            else { lo.push_back(from); hi.push_back(to); }
        }
        if (whole) continue;
        order.resize(lo.size());
        for (size_t k = 0; k < lo.size(); k++) order[k] = int(k);
        // Stable, as JS's sort is.
        std::stable_sort(order.begin(), order.end(), [&](int p, int q) { return lo[p] < lo[q]; });
        arcs.clear();
        double reached = 0;
        for (int k : order) {
            if (lo[k] > reached) { arcs.push_back(reached); arcs.push_back(lo[k] - reached); }
            reached = std::max(reached, hi[k]);
        }
        if (reached < two_pi) { arcs.push_back(reached); arcs.push_back(two_pi - reached); }
        if (arcs.empty()) continue;
        if (arcs.size() >= 4 && arcs[0] == 0 && arcs[arcs.size() - 2] + arcs[arcs.size() - 1] >= two_pi) {
            arcs[arcs.size() - 1] += arcs[1];
            arcs.erase(arcs.begin(), arcs.begin() + 2);
        }
        out.other.push_back(b);
        out.centre.insert(out.centre.end(), {cx, cy, cz});
        out.axis.insert(out.axis.end(), {ux, uy, uz});
        out.e1.insert(out.e1.end(), {ax1, ay1, az1});
        out.e2.insert(out.e2.end(), {ax2, ay2, az2});
        out.radius.push_back(rc);
        out.arc_count.push_back(int32_t(arcs.size() / 2));
        for (size_t k = 0; k < arcs.size(); k += 2) { out.arc_from.push_back(arcs[k]); out.arc_length.push_back(arcs[k + 1]); }
    }
}

// exposedSas, each atom's circles in parallel and then joined in atom order: circle ids as if serial.
template <typename Neighbours>
exposed_sas_t exposed_sas(const sas_atoms_t &sas, Neighbours neighbours, int threads) {
    int n = int(sas.x.size());
    std::vector<atom_circles_t> per_atom(n);
    std::vector<std::atomic<int32_t>> circle_count(n);
    for (auto &c : circle_count) c = 0;
    parallel_for(threads, n, [&](long begin, long end) {
        std::vector<int32_t> near;
        std::vector<double> lo, hi, arcs;
        std::vector<int> order;
        for (long a = begin; a < end; a++) {
            neighbours(int(a), near);
            circles_of_atom(int(a), sas, near, circle_count, per_atom[a], lo, hi, order, arcs);
        }
    });
    exposed_sas_t e;
    e.exposed.assign(n, 0);
    e.neighbour_start.assign(n + 1, 0);
    e.arc_start.push_back(0);
    std::vector<int32_t> circle_owner;
    for (int a = 0; a < n; a++) {
        auto &p = per_atom[a];
        e.neighbour_ids.insert(e.neighbour_ids.end(), p.neighbours.begin(), p.neighbours.end());
        e.neighbour_start[a + 1] = int32_t(e.neighbour_ids.size());
        size_t arc = 0;
        for (size_t k = 0; k < p.other.size(); k++) {
            int32_t b = p.other[k];
            e.exposed[a] = 1; e.exposed[b] = 1;
            circle_owner.push_back(a); e.other.push_back(b);
            e.centre.insert(e.centre.end(), p.centre.begin() + 3 * k, p.centre.begin() + 3 * k + 3);
            e.axis.insert(e.axis.end(), p.axis.begin() + 3 * k, p.axis.begin() + 3 * k + 3);
            e.e1.insert(e.e1.end(), p.e1.begin() + 3 * k, p.e1.begin() + 3 * k + 3);
            e.e2.insert(e.e2.end(), p.e2.begin() + 3 * k, p.e2.begin() + 3 * k + 3);
            e.radius.push_back(p.radius[k]);
            for (int32_t m = 0; m < p.arc_count[k]; m++, arc++) { e.arc_from.push_back(p.arc_from[arc]); e.arc_length.push_back(p.arc_length[arc]); }
            e.arc_start.push_back(int32_t(e.arc_from.size()));
        }
        p = atom_circles_t();
    }
    for (int a = 0; a < n; a++) if (circle_count[a] == 0 && !per_atom[a].contained) e.exposed[a] = 1;
    size_t circles = circle_owner.size();
    e.circle_start.assign(n + 1, 0);
    for (int32_t a : circle_owner) e.circle_start[a + 1]++;
    for (int a = 0; a < n; a++) e.circle_start[a + 1] += e.circle_start[a];
    std::vector<int32_t> fill(e.circle_start.begin(), e.circle_start.end() - 1);
    e.circle_ids.resize(circles);
    for (size_t id = 0; id < circles; id++) e.circle_ids[fill[circle_owner[id]]++] = int32_t(id);
    e.atom_circle_start.assign(n + 1, 0);
    for (size_t id = 0; id < circles; id++) { e.atom_circle_start[circle_owner[id] + 1]++; e.atom_circle_start[e.other[id] + 1]++; }
    for (int a = 0; a < n; a++) e.atom_circle_start[a + 1] += e.atom_circle_start[a];
    std::vector<int32_t> atom_fill(e.atom_circle_start.begin(), e.atom_circle_start.end() - 1);
    e.atom_circle_ids.resize(2 * circles);
    for (size_t id = 0; id < circles; id++) {
        e.atom_circle_ids[atom_fill[circle_owner[id]]++] = int32_t(id);
        e.atom_circle_ids[atom_fill[e.other[id]]++] = int32_t(id);
    }
    return e;
}

// nearestOnArcs: the squared distance to the nearest exposed point of circle `id`, the point into q.
double nearest_on_arcs(double px, double py, double pz, const exposed_sas_t &exp, int id, double bound, double *q) {
    double cx = exp.centre[3 * id], cy = exp.centre[3 * id + 1], cz = exp.centre[3 * id + 2];
    double wx = px - cx, wy = py - cy, wz = pz - cz;
    double along = wx * exp.axis[3 * id] + wy * exp.axis[3 * id + 1] + wz * exp.axis[3 * id + 2];
    double u = wx * exp.e1[3 * id] + wy * exp.e1[3 * id + 1] + wz * exp.e1[3 * id + 2];
    double v = wx * exp.e2[3 * id] + wy * exp.e2[3 * id + 1] + wz * exp.e2[3 * id + 2];
    double s = std::hypot(u, v), rc = exp.radius[id];
    double nearest = along * along + (s - rc) * (s - rc);
    if (nearest >= bound) return nearest;
    double theta = std::atan2(v, u);
    if (theta < 0) theta += two_pi;
    double chosen = theta, gap_angle = inf;
    for (int m = exp.arc_start[id]; m < exp.arc_start[id + 1]; m++) {
        double into = theta - exp.arc_from[m];
        if (into < 0) into += two_pi;
        double length = exp.arc_length[m];
        if (into <= length) { chosen = theta; gap_angle = 0; break; }
        double past_end = into - length, before_start = two_pi - into;
        if (past_end < gap_angle) { gap_angle = past_end; chosen = exp.arc_from[m] + length; }
        if (before_start < gap_angle) { gap_angle = before_start; chosen = exp.arc_from[m]; }
    }
    double d2 = along * along + s * s + rc * rc - 2 * s * rc * std::cos(gap_angle);
    if (d2 >= bound) return d2;
    double cos_c = std::cos(chosen), sin_c = std::sin(chosen);
    q[0] = cx + rc * (cos_c * exp.e1[3 * id] + sin_c * exp.e2[3 * id]);
    q[1] = cy + rc * (cos_c * exp.e1[3 * id + 1] + sin_c * exp.e2[3 * id + 1]);
    q[2] = cz + rc * (cos_c * exp.e1[3 * id + 2] + sin_c * exp.e2[3 * id + 2]);
    return d2;
}

// nearestExposedPoint
bool nearest_exposed_point(double px, double py, double pz, const std::vector<int32_t> &candidates, const exposed_sas_t &exp,
                           const sas_atoms_t &atoms, double within, found_t &out) {
    double limit = within * within * (1 + 1e-12);
    double best = limit;
    double q[3];
    for (int32_t a : candidates) {
        double dx = px - atoms.x[a], dy = py - atoms.y[a], dz = pz - atoms.z[a];
        double dist = std::hypot(dx, dy, dz);
        double gap = std::abs(dist - atoms.R[a]);
        if (gap * gap >= best) continue;
        if (dist > 1e-9) {
            q[0] = atoms.x[a] + atoms.R[a] * dx / dist; q[1] = atoms.y[a] + atoms.R[a] * dy / dist; q[2] = atoms.z[a] + atoms.R[a] * dz / dist;
            if (buried_by(q, exp.neighbour_ids.data(), exp.neighbour_start[a], exp.neighbour_start[a + 1], a, -1, atoms) < 0) {
                best = gap * gap;
                out.x = q[0]; out.y = q[1]; out.z = q[2]; out.a = a; out.b = -1; out.circle = -1;
            }
        }
        for (int k = exp.circle_start[a]; k < exp.circle_start[a + 1]; k++) {
            int id = exp.circle_ids[k];
            double d2 = nearest_on_arcs(px, py, pz, exp, id, best, q);
            if (d2 >= best) continue;
            best = d2;
            out.x = q[0]; out.y = q[1]; out.z = q[2]; out.a = a; out.b = exp.other[id]; out.circle = id;
        }
    }
    return best < limit;
}

// gaussianBlur3d: separable, sigma in grid units, edges clamp.
template <typename T>
void gaussian_blur_3d(std::vector<T> &field, int nx, int ny, int nz, double sigma, int threads) {
    if (sigma <= 0) return;
    int radius = std::max(1, int(std::ceil(3 * sigma)));
    std::vector<double> kernel(2 * radius + 1);
    double total = 0;
    for (int i = -radius; i <= radius; i++) {
        kernel[i + radius] = std::exp(-(double(i) * i) / (2 * sigma * sigma));
        total += kernel[i + radius];
    }
    for (auto &k : kernel) k /= total;
    int n = std::max({nx, ny, nz});
    long plane = long(nx) * ny;
    auto pass = [&](long lines, auto start_of, int len, long stride) {
        parallel_for(threads, lines, [&](long begin, long end) {
            std::vector<double> line(n);
            for (long l = begin; l < end; l++) {
                long start = start_of(l);
                for (int i = 0; i < len; i++) line[i] = field[start + i * stride];
                for (int i = 0; i < len; i++) {
                    double sum = 0;
                    for (int k = -radius; k <= radius; k++) {
                        int j = std::min(len - 1, std::max(0, i + k));
                        sum += kernel[k + radius] * line[j];
                    }
                    if constexpr (std::is_same_v<T, float>) field[start + i * stride] = float(sum);
                    else field[start + i * stride] = T(std::lround(std::min(255.0, std::max(0.0, sum))));
                }
            }
        });
    };
    pass(long(nz) * ny, [&](long l) { return (l / ny) * plane + (l % ny) * nx; }, nx, 1);
    pass(long(nz) * nx, [&](long l) { return (l / nx) * plane + (l % nx); }, ny, nx);
    pass(long(ny) * nx, [&](long l) { return (l / nx) * nx + (l % nx); }, nz, plane);
}

// levelEnclosing: the level above which `target` of the field's values lie.
double level_enclosing(const std::vector<float> &field, long target, double range) {
    const int bins = 8192;
    std::vector<uint32_t> histogram(bins, 0);
    double scale = bins / (2 * range);
    for (float value : field) {
        long b = long(std::floor((value + range) * scale));
        histogram[b < 0 ? 0 : b >= bins ? bins - 1 : b]++;
    }
    long above = 0;
    for (int b = bins - 1; b >= 0; b--) {
        if (above + long(histogram[b]) >= target) {
            double fraction = histogram[b] > 0 ? double(target - above) / histogram[b] : 0;
            return -range + (b + 1 - fraction) / scale;
        }
        above += histogram[b];
    }
    return -range;
}

// ---------------------------------------------------------------------------------------------
// Contour (contourOnCpu, edgeNormals, fieldSampler, refineContour, finishContour)

const int edge_points[12][4] = {
    {0, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 1, 0}, {0, 1, 1, 0},
    {0, 0, 0, 1}, {1, 0, 0, 1}, {0, 0, 1, 1}, {1, 0, 1, 1},
    {0, 0, 0, 2}, {1, 0, 0, 2}, {0, 1, 0, 2}, {1, 1, 0, 2},
};

struct contour_t {
    std::vector<float> positions;
    std::vector<uint32_t> indices;
    std::vector<uint32_t> keys;
};

struct mesh_t {
    std::vector<float> positions, normals;
    std::vector<uint32_t> indices;
};

contour_t contour_on_cpu(const std::vector<float> &field, const grid_t &grid) {
    int nx = grid.nx, ny = grid.ny, nz = grid.nz;
    double h = grid.spacing;
    long plane = long(nx) * ny;
    // The vertex made on each grid edge so far, for the two planes of points the current layer of
    // cubes touches (edges keyed by the point they start from): a cube's edges start on its own plane
    // or the next, so a plane's entries are dropped once the cubes have moved past it. Two planes
    // rather than the whole grid (3 int32 per point); the vertices come out in the same order.
    std::vector<int32_t> edge_vertex(2 * 3 * plane, -1);
    contour_t out;
    auto vertex_on = [&](int px, int py, int pz, int axis) -> uint32_t {
        long p = pz * plane + long(py) * nx + px;
        long key = 3 * p + axis;
        int32_t &cached = edge_vertex[3 * ((pz & 1) * plane + long(py) * nx + px) + axis];
        if (cached >= 0) return uint32_t(cached);
        double a = field[p];
        double b = field[p + (axis == 0 ? 1 : axis == 1 ? nx : plane)];
        double t = a / (a - b);
        out.positions.push_back(float(grid.origin[0] + (px + (axis == 0 ? t : 0)) * h));
        out.positions.push_back(float(grid.origin[1] + (py + (axis == 1 ? t : 0)) * h));
        out.positions.push_back(float(grid.origin[2] + (pz + (axis == 2 ? t : 0)) * h));
        out.keys.push_back(uint32_t(key));
        cached = int32_t(out.keys.size() - 1);
        return uint32_t(out.keys.size() - 1);
    };
    for (int cz = 0; cz < nz - 1; cz++) {
        // Plane cz + 1 takes the slot plane cz - 1 had.
        if (cz > 0) std::fill(edge_vertex.begin() + 3 * ((cz + 1) & 1) * plane, edge_vertex.begin() + 3 * (((cz + 1) & 1) + 1) * plane, -1);
        for (int cy = 0; cy < ny - 1; cy++) {
            for (int cx = 0; cx < nx - 1; cx++) {
                int config = 0;
                for (int c = 0; c < 8; c++) {
                    float v = field[(cz + ((c >> 2) & 1)) * plane + long(cy + ((c >> 1) & 1)) * nx + cx + (c & 1)];
                    if (v < 0) config |= 1 << c;
                }
                if (config == 0 || config == 255) continue;
                uint32_t lo = mc_triangle_table[2 * config], hi = mc_triangle_table[2 * config + 1];
                auto nibble = [&](int i) -> int {
                    int bit = 4 * i;
                    return int(((bit >= 32 ? hi : lo) >> (bit & 31)) & 15u);
                };
                int triangles = nibble(0);
                for (int t = 0; t < triangles; t++) {
                    uint32_t tri[3];
                    for (int k = 0; k < 3; k++) {
                        const int *e = edge_points[nibble(1 + 3 * t + k)];
                        tri[k] = vertex_on(cx + e[0], cy + e[1], cz + e[2], e[3]);
                    }
                    out.indices.insert(out.indices.end(), {tri[0], tri[1], tri[2]});
                }
            }
        }
    }
    return out;
}

double catmull_rom(double p0, double p1, double p2, double p3, double t) {
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}
double catmull_rom_slope(double p0, double p1, double p2, double p3, double t) {
    return 0.5 * ((p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (3 * p1 - p0 - 3 * p2 + p3) * t * t);
}

std::vector<float> edge_normals(const std::vector<float> &field, const grid_t &grid, const std::vector<uint32_t> &keys) {
    int nx = grid.nx, ny = grid.ny, nz = grid.nz;
    long plane = long(nx) * ny;
    const int dims[3] = {nx, ny, nz};
    const long strides[3] = {1, nx, plane};
    std::vector<float> normals(3 * keys.size());
    int coord[3] = {0, 0, 0};
    auto value_at = [&](int d, int step) -> double {
        long i = 0;
        for (int k = 0; k < 3; k++) {
            int c = std::min(dims[k] - 1, std::max(0, coord[k] + (k == d ? step : 0)));
            i += c * strides[k];
        }
        return field[i];
    };
    auto derivative_at = [&](int d, int step, int e) -> double {
        int saved = coord[d];
        coord[d] += step;
        double fp1 = value_at(e, 1), fm1 = value_at(e, -1), fp2 = value_at(e, 2), fm2 = value_at(e, -2);
        coord[d] = saved;
        return (-fp2 + 8 * fp1 - 8 * fm1 + fm2) / 12;
    };
    double g[3];
    for (size_t v = 0; v < keys.size(); v++) {
        int axis = int(keys[v] % 3);
        long p = (long(keys[v]) - axis) / 3;
        coord[2] = int(p / plane);
        coord[1] = int((p - coord[2] * plane) / nx);
        coord[0] = int(p - coord[2] * plane - long(coord[1]) * nx);
        double f0 = value_at(axis, -1), f1 = value_at(axis, 0), f2 = value_at(axis, 1), f3 = value_at(axis, 2);
        double t = f1 == f2 ? 0.5 : f1 / (f1 - f2);
        for (int e = 0; e < 3; e++) {
            g[e] = e == axis
                ? catmull_rom_slope(f0, f1, f2, f3, t)
                : catmull_rom(derivative_at(axis, -1, e), derivative_at(axis, 0, e), derivative_at(axis, 1, e), derivative_at(axis, 2, e), t);
        }
        double len = std::hypot(g[0], g[1], g[2]);
        if (len == 0) len = 1;
        normals[3 * v] = float(g[0] / len);
        normals[3 * v + 1] = float(g[1] / len);
        normals[3 * v + 2] = float(g[2] / len);
    }
    return normals;
}

void catmull_rom_weights(double t, double *w) {
    double t2 = t * t, t3 = t2 * t;
    w[0] = 0.5 * (-t + 2 * t2 - t3);
    w[1] = 0.5 * (2 - 5 * t2 + 3 * t3);
    w[2] = 0.5 * (t + 4 * t2 - 3 * t3);
    w[3] = 0.5 * (-t2 + t3);
}

// fieldSampler: Catmull-Rom tricubic of the field, and of its fourth-order differences (kept as float)
// for the gradient. The differences are worked out first (prepare), for every grid point within
// `band` of the surface, all in parallel, so that sampling only reads and can be done from many
// threads. A point outside the band is worked out on the spot, rounded the same way: the same values
// either way.
class field_sampler_t {
public:
    field_sampler_t(const std::vector<float> &field, const grid_t &grid)
        : field(field), nx(grid.nx), ny(grid.ny), nz(grid.nz), h(grid.spacing), plane(long(grid.nx) * grid.ny) {
        origin[0] = grid.origin[0]; origin[1] = grid.origin[1]; origin[2] = grid.origin[2];
        dims[0] = nx; dims[1] = ny; dims[2] = nz;
        strides[0] = 1; strides[1] = nx; strides[2] = plane;
    }
    // The differences of every grid point whose value is within `band` of 0 (the surface), in grid
    // order. Which points have them is a bit per point, with the count before each 64-point word, so
    // a point's place among them is that count and the bits before it in its word.
    void prepare(double band, int threads) {
        long count = long(field.size());
        long words = (count + 63) / 64;
        in_band.assign(words, 0);
        before.assign(words + 1, 0);
        parallel_for(threads, words, [&](long begin, long end) {
            for (long w = begin; w < end; w++) {
                uint64_t bits = 0;
                for (long i = 64 * w; i < std::min(count, 64 * w + 64); i++) if (std::abs(field[i]) < band) bits |= uint64_t(1) << (i - 64 * w);
                in_band[w] = bits;
            }
        });
        for (long w = 0; w < words; w++) before[w + 1] = before[w] + uint32_t(__builtin_popcountll(in_band[w]));
        derivatives.assign(3 * size_t(before[words]), 0.0f);
        parallel_for(threads, words, [&](long begin, long end) {
            for (long w = begin; w < end; w++) {
                uint32_t next = before[w];
                for (uint64_t bits = in_band[w]; bits; bits &= bits - 1) {
                    long i = 64 * w + __builtin_ctzll(bits);
                    int z = int(i / plane), y = int((i - z * plane) / nx), x = int(i - z * plane - long(y) * nx);
                    compute(i, x, y, z, &derivatives[3 * size_t(next)]);
                    next++;
                }
            }
        });
    }
    // The value at (x, y, z), and into `gradient` its gradient, per A.
    double sample(double x, double y, double z, double *gradient) const {
        double wx[4], wy[4], wz[4], local[3];
        double u = (x - origin[0]) / h, v = (y - origin[1]) / h, w = (z - origin[2]) / h;
        int i = int(std::floor(u)), j = int(std::floor(v)), k = int(std::floor(w));
        catmull_rom_weights(u - i, wx);
        catmull_rom_weights(v - j, wy);
        catmull_rom_weights(w - k, wz);
        double value = 0, gx = 0, gy = 0, gz = 0;
        if (i >= 1 && j >= 1 && k >= 1 && i + 2 < nx && j + 2 < ny && k + 2 < nz) {
            long base = (k - 1) * plane + long(j - 1) * nx + (i - 1);
            for (int c = 0; c < 4; c++) {
                for (int b = 0; b < 4; b++) {
                    double wyz = wy[b] * wz[c];
                    long row = base + c * plane + long(b) * nx;
                    for (int a = 0; a < 4; a++) {
                        double weight = wx[a] * wyz;
                        long index = row + a;
                        value += weight * field[index];
                        const double *d = derivatives_at(index, i - 1 + a, j - 1 + b, k - 1 + c, local);
                        gx += weight * d[0]; gy += weight * d[1]; gz += weight * d[2];
                    }
                }
            }
        } else {
            for (int c = 0; c < 4; c++) {
                for (int b = 0; b < 4; b++) {
                    double wyz = wy[b] * wz[c];
                    if (wyz == 0) continue;
                    for (int a = 0; a < 4; a++) {
                        double weight = wx[a] * wyz;
                        if (weight == 0) continue;
                        int gi = clamp_to(i - 1 + a, 0), gj = clamp_to(j - 1 + b, 1), gk = clamp_to(k - 1 + c, 2);
                        long index = gk * plane + long(gj) * nx + gi;
                        value += weight * field[index];
                        const double *d = derivatives_at(index, gi, gj, gk, local);
                        gx += weight * d[0]; gy += weight * d[1]; gz += weight * d[2];
                    }
                }
            }
        }
        gradient[0] = gx / h; gradient[1] = gy / h; gradient[2] = gz / h;
        return value;
    }
private:
    int clamp_to(int c, int d) const { return std::min(dims[d] - 1, std::max(0, c)); }
    // The three fourth-order differences at grid point (x, y, z) = index, in grid units, as float.
    void compute(long index, int x, int y, int z, float *out) const {
        int c[3] = {x, y, z};
        for (int e = 0; e < 3; e++) {
            long s = strides[e];
            if (c[e] >= 2 && c[e] < dims[e] - 2) {
                out[e] = float((-double(field[index + 2 * s]) + 8.0 * field[index + s] - 8.0 * field[index - s] + field[index - 2 * s]) / 12);
            } else {
                int lo = -c[e], hi = dims[e] - 1 - c[e];
                auto at = [&](int step) -> double { return field[index + s * std::min(hi, std::max(lo, step))]; };
                out[e] = float((-at(2) + 8 * at(1) - 8 * at(-1) + at(-2)) / 12);
            }
        }
    }
    // The prepared differences, or worked out into `local`.
    const double *derivatives_at(long index, int x, int y, int z, double *local) const {
        float d[3];
        uint64_t bits = in_band.empty() ? 0 : in_band[index >> 6];
        uint64_t bit = uint64_t(1) << (index & 63);
        if (bits & bit) {
            const float *p = &derivatives[3 * size_t(before[index >> 6] + uint32_t(__builtin_popcountll(bits & (bit - 1))))];
            d[0] = p[0]; d[1] = p[1]; d[2] = p[2];
        } else {
            compute(index, x, y, z, d);
        }
        local[0] = d[0]; local[1] = d[1]; local[2] = d[2];
        return local;
    }
    const std::vector<float> &field;
    int nx, ny, nz;
    double h;
    long plane;
    double origin[3];
    int dims[3];
    long strides[3];
    std::vector<uint64_t> in_band;
    std::vector<uint32_t> before;
    std::vector<float> derivatives;
};

// Takes (and frees) the contour's positions and its triangles, so that they are gone before the
// sampler is made.
mesh_t refine_contour(const std::vector<float> &field, const grid_t &grid, std::vector<float> &&positions,
                      std::vector<uint32_t> &&indices, int threads) {
    uint32_t vertex_count = uint32_t(positions.size() / 3);
    // Each edge's midpoint, kept with the edge's lower vertex: per vertex, a row of (other end,
    // midpoint) as long as the edges it is the lower end of, counted first (twice over for an edge
    // two triangles share - a row is never more than half full in a closed mesh, but it is small).
    std::vector<uint32_t> row_start(size_t(vertex_count) + 1, 0);
    for (size_t t = 0; t + 2 < indices.size(); t += 3) {
        for (int e = 0; e < 3; e++) {
            uint32_t a = indices[t + e], b = indices[t + (e + 1) % 3];
            row_start[size_t(std::min(a, b)) + 1]++;
        }
    }
    for (size_t v = 0; v < vertex_count; v++) row_start[v + 1] += row_start[v];
    std::vector<uint32_t> row_end(row_start.begin(), row_start.end() - 1);
    std::vector<uint32_t> other_end(row_start[vertex_count]), midpoint_of(row_start[vertex_count]);
    mesh_t mesh;
    // A closed mesh has 3/2 edges per triangle: room for that many midpoints.
    mesh.positions.reserve(positions.size() + 3 * (indices.size() / 2 + 1));
    mesh.positions.assign(positions.begin(), positions.end());
    auto midpoint = [&](uint32_t a, uint32_t b) -> uint32_t {
        uint32_t lo = std::min(a, b), hi = std::max(a, b);
        for (uint32_t k = row_start[lo]; k < row_end[lo]; k++) if (other_end[k] == hi) return midpoint_of[k];
        uint32_t m = uint32_t(mesh.positions.size() / 3);
        mesh.positions.push_back(float(0.5 * (double(positions[3 * a]) + positions[3 * b])));
        mesh.positions.push_back(float(0.5 * (double(positions[3 * a + 1]) + positions[3 * b + 1])));
        mesh.positions.push_back(float(0.5 * (double(positions[3 * a + 2]) + positions[3 * b + 2])));
        other_end[row_end[lo]] = hi;
        midpoint_of[row_end[lo]++] = m;
        return m;
    };
    mesh.indices.reserve(4 * indices.size());
    for (size_t t = 0; t + 2 < indices.size(); t += 3) {
        uint32_t a = indices[t], b = indices[t + 1], c = indices[t + 2];
        uint32_t ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
        mesh.indices.insert(mesh.indices.end(), {a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca});
    }
    release(row_start); release(row_end); release(other_end); release(midpoint_of);
    release(positions); release(indices);
    mesh.normals.resize(mesh.positions.size());
    field_sampler_t sampler(field, grid);
    // Vertices move at most four half-voxel steps, and the cubic reaches two points further: six
    // voxels of field (a distance, so about as many A) covers every grid point they read.
    sampler.prepare(6 * grid.spacing, threads);
    double max_step = 0.5 * grid.spacing;
    long n = long(mesh.positions.size() / 3);
    parallel_for(threads, n, [&](long begin, long end) {
        double g[3];
        for (long v = begin; v < end; v++) {
            double x = mesh.positions[3 * v], y = mesh.positions[3 * v + 1], z = mesh.positions[3 * v + 2];
            for (int iteration = 0; iteration < 4; iteration++) {
                double f = sampler.sample(x, y, z, g);
                double g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
                if (g2 < 1e-20) break;
                double s = f / g2;
                double length = std::abs(s) * std::sqrt(g2);
                if (length > max_step) s *= max_step / length;
                x -= s * g[0]; y -= s * g[1]; z -= s * g[2];
                if (std::abs(f) < 1e-5 * grid.spacing) break;
            }
            sampler.sample(x, y, z, g);
            double len = std::hypot(g[0], g[1], g[2]);
            if (len == 0) len = 1;
            mesh.positions[3 * v] = float(x); mesh.positions[3 * v + 1] = float(y); mesh.positions[3 * v + 2] = float(z);
            mesh.normals[3 * v] = float(g[0] / len); mesh.normals[3 * v + 1] = float(g[1] / len); mesh.normals[3 * v + 2] = float(g[2] / len);
        }
    });
    return mesh;
}

// windingAgrees, orientTriangles
double winding_agrees(const mesh_t &mesh, size_t t) {
    const auto &p = mesh.positions, &nm = mesh.normals;
    uint32_t a = mesh.indices[3 * t], b = mesh.indices[3 * t + 1], c = mesh.indices[3 * t + 2];
    double ux = double(p[3 * b]) - p[3 * a], uy = double(p[3 * b + 1]) - p[3 * a + 1], uz = double(p[3 * b + 2]) - p[3 * a + 2];
    double vx = double(p[3 * c]) - p[3 * a], vy = double(p[3 * c + 1]) - p[3 * a + 1], vz = double(p[3 * c + 2]) - p[3 * a + 2];
    double cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    double nx = double(nm[3 * a]) + nm[3 * b] + nm[3 * c];
    double ny = double(nm[3 * a + 1]) + nm[3 * b + 1] + nm[3 * c + 1];
    double nz = double(nm[3 * a + 2]) + nm[3 * b + 2] + nm[3 * c + 2];
    return cx * nx + cy * ny + cz * nz;
}

void orient_triangles(mesh_t &mesh, bool ccw) {
    for (size_t t = 0; t < mesh.indices.size() / 3; t++) {
        bool agrees = winding_agrees(mesh, t) >= 0;
        if (agrees != ccw) std::swap(mesh.indices[3 * t + 1], mesh.indices[3 * t + 2]);
    }
}

// Takes (and frees) the contour.
mesh_t finish_contour(const std::vector<float> &field, const grid_t &grid, contour_t &&contour, bool refine, int threads) {
    std::vector<uint32_t> indices;
    indices.reserve(contour.indices.size());
    for (size_t t = 0; t + 2 < contour.indices.size(); t += 3) {
        uint32_t a = contour.indices[t], b = contour.indices[t + 1], c = contour.indices[t + 2];
        if (a == b || b == c || a == c) continue;
        indices.insert(indices.end(), {a, b, c});
    }
    release(contour.indices);
    mesh_t mesh;
    if (refine) {
        release(contour.keys);
        mesh = refine_contour(field, grid, std::move(contour.positions), std::move(indices), threads);
    } else {
        mesh.positions = contour.positions;
        mesh.normals = edge_normals(field, grid, contour.keys);
        mesh.indices = std::move(indices);
    }
    orient_triangles(mesh, true);
    return mesh;
}

} // namespace

// ---------------------------------------------------------------------------------------------
// sesField

grid_t ses_field_unblurred(const std::vector<atom_t> &atoms, double probe, double spacing, double sigma, double max_shift,
                           double open_radius, int threads, bool open_uncapped, double heal_blur) {
    threads = resolve_threads(threads);
    grid_t grid;
    if (atoms.empty()) return grid;
    double r_max = 0;
    double low[3] = {inf, inf, inf}, high[3] = {-inf, -inf, -inf};
    for (const auto &a : atoms) {
        r_max = std::max(r_max, a.r);
        low[0] = std::min(low[0], a.x); low[1] = std::min(low[1], a.y); low[2] = std::min(low[2], a.z);
        high[0] = std::max(high[0], a.x); high[1] = std::max(high[1], a.y); high[2] = std::max(high[2], a.z);
    }
    double h = spacing;
    double pad = 0;
    long nx = 0, ny = 0, nz = 0;
    for (;;) {
        pad = r_max + probe + 3 * sigma + 3 * h;
        nx = long(std::ceil((high[0] - low[0] + 2 * pad) / h)) + 1;
        ny = long(std::ceil((high[1] - low[1] + 2 * pad) / h)) + 1;
        nz = long(std::ceil((high[2] - low[2] + 2 * pad) / h)) + 1;
        if (nx * ny * nz <= max_grid_points) break;
        h *= 1.15;
    }
    const double origin[3] = {low[0] - pad, low[1] - pad, low[2] - pad};
    long plane = nx * ny;
    long count = plane * nz;
    auto mark = clock_type::now();

    // 1. SAS occupancy, and the points deeper than a voxel diagonal inside some sphere.
    std::vector<uint8_t> exterior(count, 1), deep(count, 0);
    double diagonal = std::sqrt(3.0) * h;
    for (const auto &a : atoms) {
        double R = a.r + probe, R2 = R * R;
        double inner = std::max(0.0, R - diagonal), inner2 = inner * inner;
        long x0 = std::max(0L, long(std::floor((a.x - R - origin[0]) / h))), x1 = std::min(nx - 1, long(std::ceil((a.x + R - origin[0]) / h)));
        long y0 = std::max(0L, long(std::floor((a.y - R - origin[1]) / h))), y1 = std::min(ny - 1, long(std::ceil((a.y + R - origin[1]) / h)));
        long z0 = std::max(0L, long(std::floor((a.z - R - origin[2]) / h))), z1 = std::min(nz - 1, long(std::ceil((a.z + R - origin[2]) / h)));
        for (long iz = z0; iz <= z1; iz++) {
            double dz = origin[2] + iz * h - a.z, dz2 = dz * dz;
            if (dz2 > R2) continue;
            for (long iy = y0; iy <= y1; iy++) {
                double dy = origin[1] + iy * h - a.y, dyz2 = dy * dy + dz2;
                if (dyz2 > R2) continue;
                long row = iz * plane + iy * nx;
                for (long ix = x0; ix <= x1; ix++) {
                    double dx = origin[0] + ix * h - a.x, d2 = dx * dx + dyz2;
                    if (d2 <= R2) {
                        exterior[row + ix] = 0;
                        if (d2 < inner2) deep[row + ix] = 1;
                    }
                }
            }
        }
    }
    grid.timings.sas = ms_since(mark);

    // 2. Seeds.
    double window = 3 * h;
    double clamp = std::max(3 * sigma, open_radius > 0 ? open_radius + 2 * h : 0.0) + 2 * h;
    sas_atoms_t sas;
    for (const auto &a : atoms) { sas.x.push_back(a.x); sas.y.push_back(a.y); sas.z.push_back(a.z); sas.R.push_back(a.r + probe); }
    atom_bins_t atom_bins(sas.x, sas.y, sas.z, r_max + probe + std::max(window, clamp + h), r_max + probe);
    exposed_sas_t exposure = exposed_sas(sas, [&](int a, std::vector<int32_t> &out) {
        atom_bins.near(sas.x[a], sas.y[a], sas.z[a], sas.x, sas.y, sas.z, sas.R, sas.R[a], out);
    }, threads);
    std::vector<int32_t> exposed_ids;
    for (size_t a = 0; a < atoms.size(); a++) if (exposure.exposed[a]) exposed_ids.push_back(int32_t(a));
    sas_atoms_t exposed_sas_atoms;
    for (int32_t a : exposed_ids) {
        exposed_sas_atoms.x.push_back(sas.x[a]); exposed_sas_atoms.y.push_back(sas.y[a]);
        exposed_sas_atoms.z.push_back(sas.z[a]); exposed_sas_atoms.R.push_back(sas.R[a]);
    }
    atom_bins_t exposed_bins(exposed_sas_atoms.x, exposed_sas_atoms.y, exposed_sas_atoms.z, r_max + probe + diagonal, r_max + probe);
    std::vector<int32_t> feature(count, -1);
    // Seeds plane by plane, each plane's in order, numbered after: as the one loop over the grid.
    struct seed_t { long i; found_t found; };
    std::vector<std::vector<seed_t>> plane_seeds(nz);
    parallel_for(threads, nz - 2, [&](long begin, long end) {
        std::vector<int32_t> exposed_near, exposed_candidates, near;
        found_t found;
        for (long iz = begin + 1; iz < end + 1; iz++) {
            auto &seeds_here = plane_seeds[iz];
            for (long iy = 1; iy < ny - 1; iy++) {
                for (long ix = 1; ix < nx - 1; ix++) {
                    long i = iz * plane + iy * nx + ix;
                    double px = origin[0] + ix * h, py = origin[1] + iy * h, pz = origin[2] + iz * h;
                    if (exterior[i]) {
                        if (exterior[i - 1] && exterior[i + 1] && exterior[i - nx] && exterior[i + nx] && exterior[i - plane] && exterior[i + plane]) continue;
                        atom_bins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, window, near);
                        if (!nearest_sphere(px, py, pz, near, sas, found)) {
                            found.x = px; found.y = py; found.z = pz; found.a = -1; found.b = -1; found.circle = -1;
                        }
                    } else {
                        if (deep[i]) continue;
                        bool outside_near = false;
                        for (int dz = -1; dz <= 1 && !outside_near; dz++)
                            for (int dy = -1; dy <= 1 && !outside_near; dy++)
                                for (int dx = -1; dx <= 1; dx++)
                                    if (exterior[i + dz * plane + dy * nx + dx]) { outside_near = true; break; }
                        if (outside_near) continue;
                        exposed_bins.near(px, py, pz, exposed_sas_atoms.x, exposed_sas_atoms.y, exposed_sas_atoms.z, exposed_sas_atoms.R,
                                          diagonal, exposed_near);
                        if (exposed_near.empty()) continue;
                        exposed_candidates.clear();
                        for (int32_t e : exposed_near) exposed_candidates.push_back(exposed_ids[e]);
                        if (!nearest_exposed_point(px, py, pz, exposed_candidates, exposure, sas, diagonal, found)) continue;
                    }
                    seeds_here.push_back({i, found});
                }
            }
        }
    });
    release(deep);
    std::vector<double> seed_points;
    std::vector<int32_t> seed_a, seed_circle;
    for (const auto &seeds_here : plane_seeds) {
        for (const auto &seed : seeds_here) {
            feature[seed.i] = int32_t(seed_a.size());
            seed_points.insert(seed_points.end(), {seed.found.x, seed.found.y, seed.found.z});
            seed_a.push_back(seed.found.a);
            seed_circle.push_back(seed.found.circle);
        }
    }
    plane_seeds.clear();
    plane_seeds.shrink_to_fit();

    // 3. Each point's nearest seed, then the field.
    std::vector<float> field(count);
    grid.timings.seeds = ms_since(mark);
    feature_transform_3d(feature, field, int(nx), int(ny), int(nz), threads);
    grid.timings.transform = ms_since(mark);
    double exact_low = probe - clamp - h, exact_high = probe + clamp + h;
    std::atomic<long> interior_count{0};
    parallel_for(threads, nz, [&](long begin, long end) {
        double q[3];
        double px = 0, py = 0, pz = 0, best = inf;
        std::vector<int32_t> around;
        std::vector<int32_t> tried;
        long interior_here = 0;
        auto try_circle = [&](int id) {
            if (std::find(tried.begin(), tried.end(), -id - 1) != tried.end()) return;
            tried.push_back(-id - 1);
            double d2 = nearest_on_arcs(px, py, pz, exposure, id, best, q);
            if (d2 < best) best = d2;
        };
        auto try_sphere = [&](int a) {
            if (std::find(tried.begin(), tried.end(), a) != tried.end()) return;
            tried.push_back(a);
            double dx = px - sas.x[a], dy = py - sas.y[a], dz = pz - sas.z[a];
            double distance = std::hypot(dx, dy, dz);
            double gap = std::abs(distance - sas.R[a]);
            if (gap * gap >= best) return;
            if (distance > 1e-9) {
                double scale = sas.R[a] / distance;
                q[0] = sas.x[a] + dx * scale; q[1] = sas.y[a] + dy * scale; q[2] = sas.z[a] + dz * scale;
                if (buried_by(q, exposure.neighbour_ids.data(), exposure.neighbour_start[a], exposure.neighbour_start[a + 1], a, -1, sas) < 0) {
                    best = gap * gap;
                    return;
                }
            }
            for (int k = exposure.atom_circle_start[a]; k < exposure.atom_circle_start[a + 1]; k++) try_circle(exposure.atom_circle_ids[k]);
        };
        int32_t candidates[7], neighbours[7];
        for (long iz = begin; iz < end; iz++) {
            for (long iy = 0; iy < ny; iy++) {
                for (long ix = 0; ix < nx; ix++) {
                    long i = iz * plane + iy * nx + ix;
                    px = origin[0] + ix * h; py = origin[1] + iy * h; pz = origin[2] + iz * h;
                    if (exterior[i] || feature[i] < 0) {
                        field[i] = float(-(probe + clamp));
                        int32_t f = feature[i];
                        if (f < 0) continue;
                        double rough = std::hypot(seed_points[3 * f] - px, seed_points[3 * f + 1] - py, seed_points[3 * f + 2] - pz);
                        if (rough > clamp + h) continue;
                        atom_bins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, clamp + h, around);
                        double gap = clamp;
                        for (int32_t a : around) gap = std::min(gap, std::hypot(px - sas.x[a], py - sas.y[a], pz - sas.z[a]) - sas.R[a]);
                        field[i] = float(-(probe + std::max(0.0, gap)));
                        continue;
                    }
                    neighbours[0] = feature[i];
                    neighbours[1] = ix > 0 ? feature[i - 1] : -1;
                    neighbours[2] = ix < nx - 1 ? feature[i + 1] : -1;
                    neighbours[3] = iy > 0 ? feature[i - nx] : -1;
                    neighbours[4] = iy < ny - 1 ? feature[i + nx] : -1;
                    neighbours[5] = iz > 0 ? feature[i - plane] : -1;
                    neighbours[6] = iz < nz - 1 ? feature[i + plane] : -1;
                    int n = 0;
                    for (int m = 0; m < 7; m++) {
                        int32_t f = neighbours[m];
                        if (f < 0) continue;
                        bool seen = false;
                        for (int k = 0; k < n; k++) if (candidates[k] == f) { seen = true; break; }
                        if (!seen) candidates[n++] = f;
                    }
                    best = inf;
                    for (int k = 0; k < n; k++) {
                        int32_t f = candidates[k];
                        double ex = seed_points[3 * f] - px, ey = seed_points[3 * f + 1] - py, ez = seed_points[3 * f + 2] - pz;
                        double d2 = ex * ex + ey * ey + ez * ez;
                        if (d2 < best) best = d2;
                    }
                    double approximate = std::sqrt(best);
                    if (approximate > exact_low && approximate < exact_high) {
                        tried.clear();
                        for (int k = 0; k < n; k++) {
                            int32_t f = candidates[k];
                            if (seed_circle[f] >= 0) try_circle(seed_circle[f]);
                            else if (seed_a[f] >= 0) try_sphere(seed_a[f]);
                        }
                    }
                    double value = std::sqrt(best) - probe;
                    if (value > 0) interior_here++;
                    field[i] = float(std::min(value, clamp));
                }
            }
        }
        interior_count += interior_here;
    });
    release(exterior); release(feature); release(seed_points); release(seed_a); release(seed_circle);

    // 3b. Opening: a ball of radius open_radius rolled inside, so necks thinner than twice that are
    // cut. Each point's distance to where the ball's centre can be is found by climbing the field's
    // gradient to the level open_radius. A neck cut where it met a lobe leaves the lobe the saddle's
    // concave footprint: a dent, the scar. Round the cuts - `weight`, 1 at the points the opening
    // changed and fading to 0 over about an A - the blur's cap is lifted (open_uncapped) and the field
    // blurred more (heal_blur), below.
    std::vector<uint8_t> weight;
    if (open_radius > 0) {
        bool want_weight = open_uncapped || heal_blur > sigma;
        if (want_weight) weight.assign(count, 0);
        double reach = -(3 * sigma + 2 * h);
        double half = h / 2;
        double allowance = (h * h) / 4;
        {
            double t = open_radius;
            double floor_value = -(probe + clamp);
            std::vector<float> original = field;
            auto sample = [&](double x, double y, double z) -> double {
                double fx = std::min(nx - 1.001, std::max(0.0, (x - origin[0]) / h));
                double fy = std::min(ny - 1.001, std::max(0.0, (y - origin[1]) / h));
                double fz = std::min(nz - 1.001, std::max(0.0, (z - origin[2]) / h));
                long i = long(std::floor(fx)), j = long(std::floor(fy)), k = long(std::floor(fz));
                double u = fx - i, v = fy - j, w = fz - k;
                long c = k * plane + j * nx + i;
                double c00 = original[c] + u * (double(original[c + 1]) - original[c]);
                double c10 = original[c + nx] + u * (double(original[c + nx + 1]) - original[c + nx]);
                double c01 = original[c + plane] + u * (double(original[c + plane + 1]) - original[c + plane]);
                double c11 = original[c + plane + nx] + u * (double(original[c + plane + nx + 1]) - original[c + plane + nx]);
                double c0 = c00 + v * (c10 - c00), c1 = c01 + v * (c11 - c01);
                return c0 + w * (c1 - c0);
            };
            parallel_for(threads, nz, [&](long begin, long end) {
                for (long iz = begin; iz < end; iz++) {
                    for (long iy = 0; iy < ny; iy++) {
                        for (long ix = 0; ix < nx; ix++) {
                            long i = iz * plane + iy * nx + ix;
                            double f = original[i];
                            if (!(f < t && f > reach)) continue;
                            double x = origin[0] + ix * h, y = origin[1] + iy * h, z = origin[2] + iz * h;
                            double value = f, length = 0;
                            for (int step = 0; step < 8 && value < t - 1e-3; step++) {
                                double gx = sample(x + half, y, z) - sample(x - half, y, z);
                                double gy = sample(x, y + half, z) - sample(x, y - half, z);
                                double gz = sample(x, y, z + half) - sample(x, y, z - half);
                                double g = std::hypot(gx, gy, gz);
                                if (g < 1e-6) break;
                                double move = t - value;
                                x += move * gx / g; y += move * gy / g; z += move * gz / g;
                                length += move;
                                value = sample(x, y, z);
                            }
                            double distance = length + std::max(0.0, t - value);
                            double opened = t - distance + allowance;
                            if (opened < f) {
                                field[i] = float(std::max(opened, floor_value));
                                if (want_weight) weight[i] = 255;
                            }
                        }
                    }
                }
            });
        }
        long interior = 0;
        for (long i = 0; i < count; i++) if (field[i] > 0) interior++;
        interior_count = interior;
    }
    grid.timings.distance = ms_since(mark);

    grid.field = std::move(field);
    grid.changed = std::move(weight);
    grid.interior = interior_count.load();
    grid.clamp = clamp;
    grid.nx = int(nx); grid.ny = int(ny); grid.nz = int(nz);
    grid.origin[0] = origin[0]; grid.origin[1] = origin[1]; grid.origin[2] = origin[2];
    grid.spacing = h;
    return grid;
}

void blur_field(grid_t &grid, double sigma, double max_shift, bool open_uncapped, double heal_blur, int threads) {
    threads = resolve_threads(threads);
    if (grid.field.empty()) return;
    auto mark = clock_type::now();
    long nx = grid.nx, ny = grid.ny, nz = grid.nz;
    long count = nx * ny * nz;
    double h = grid.spacing;
    std::vector<float> &field = grid.field;
    // The cuts' weight: the points the opening changed, spread over about an A, then full strength
    // wherever the spread is a third or more.
    std::vector<uint8_t> &weight = grid.changed;
    if (!weight.empty()) {
        gaussian_blur_3d(weight, int(nx), int(ny), int(nz), 1.0 / h, threads);
        for (auto &w : weight) w = uint8_t(std::min(255, 3 * int(w)));
    }

    // 4. Blur, the cap, and the level that keeps the enclosed volume.
    bool capped = sigma > 0 && std::isfinite(max_shift) && max_shift > 0;
    std::vector<float> exact;
    if (capped) exact = field;
    gaussian_blur_3d(field, int(nx), int(ny), int(nz), sigma / h, threads);
    if (capped) {
        bool lift = open_uncapped && !weight.empty();
        for (long i = 0; i < count; i++) {
            double capped_value = exact[i] + max_shift * std::tanh((double(field[i]) - exact[i]) / max_shift);
            // open_uncapped: the plain blur round the cuts, faded in by the weight.
            double share = lift ? weight[i] / 255.0 : 0;
            field[i] = float(capped_value + share * (double(field[i]) - capped_value));
        }
        release(exact);
    }
    // heal_blur: round the cuts further - the field blurred again, to heal_blur in all, faded in by
    // the weight. (Too wide makes dents of its own where the weight fades: 1.3 A did.)
    if (heal_blur > sigma && !weight.empty()) {
        std::vector<float> wider = field;
        gaussian_blur_3d(wider, int(nx), int(ny), int(nz), std::sqrt(heal_blur * heal_blur - sigma * sigma) / h, threads);
        for (long i = 0; i < count; i++) {
            double share = weight[i] / 255.0;
            if (share > 0) field[i] = float(field[i] + share * (double(wider[i]) - field[i]));
        }
    }
    release(weight);
    grid.iso = sigma > 0 ? level_enclosing(field, grid.interior, grid.clamp) : 0;
    grid.timings.blur = ms_since(mark);
}

grid_t ses_field(const std::vector<atom_t> &atoms, double probe, double spacing, double sigma, double max_shift, double open_radius,
                 int threads, bool open_uncapped, double heal_blur) {
    grid_t grid = ses_field_unblurred(atoms, probe, spacing, sigma, max_shift, open_radius, threads, open_uncapped, heal_blur);
    blur_field(grid, sigma, max_shift, open_uncapped, heal_blur, threads);
    return grid;
}

// ---------------------------------------------------------------------------------------------
// vertexAtoms, and the whole (smoothSurfaceFromAtomsSync)

namespace {

void vertex_atoms(surface_t &s, const std::vector<atom_t> &atoms, const std::vector<int32_t> &residue_of, double band, int threads) {
    size_t n = s.positions.size() / 3;
    s.atom.assign(n, -1); s.other.assign(n, -1); s.weight.assign(n, 1.0f);
    s.near.assign(colour_atoms * n, -1); s.near_gap.assign(colour_atoms * n, 0.0f);
    if (atoms.empty()) return;
    double r_max = 0;
    std::vector<double> ax, ay, az, ar;
    for (const auto &a : atoms) { r_max = std::max(r_max, a.r); ax.push_back(a.x); ay.push_back(a.y); az.push_back(a.z); ar.push_back(a.r); }
    atom_bins_t bins(ax, ay, az, r_max + band, r_max);
    parallel_for(threads, long(n), [&](long begin, long end) {
    std::vector<int32_t> near;
    for (long v = begin; v < end; v++) {
        double x = s.positions[3 * v], y = s.positions[3 * v + 1], z = s.positions[3 * v + 2];
        bins.near(x, y, z, ax, ay, az, ar, band, near);
        int best = -1;
        double g1 = inf;
        for (int32_t a : near) {
            double g = std::hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (g < g1) { g1 = g; best = a; }
        }
        if (best < 0) {
            for (size_t a = 0; a < atoms.size(); a++) {
                double g = std::hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
                if (g < g1) { g1 = g; best = int(a); }
            }
            s.atom[v] = best;
            s.near[colour_atoms * v] = best; s.near_gap[colour_atoms * v] = float(g1);
            continue;
        }
        s.atom[v] = best;
        size_t base = colour_atoms * v;
        int kept = 0;
        for (int32_t a : near) {
            double g = std::hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (kept == colour_atoms && g >= s.near_gap[base + kept - 1]) continue;
            int k = std::min(kept, colour_atoms - 1);
            while (k > 0 && s.near_gap[base + k - 1] > g) { s.near[base + k] = s.near[base + k - 1]; s.near_gap[base + k] = s.near_gap[base + k - 1]; k--; }
            s.near[base + k] = a; s.near_gap[base + k] = float(g);
            if (kept < colour_atoms) kept++;
        }
        int32_t residue = residue_of[best];
        int second = -1;
        double g2 = inf;
        for (int32_t a : near) {
            if (residue_of[a] == residue) continue;
            double g = std::hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (g < g2) { g2 = g; second = a; }
        }
        if (second < 0 || g2 > band) continue;
        double d1 = std::max(0.0, g1), d2 = std::max(0.0, g2);
        s.other[v] = second;
        s.weight[v] = float(d1 + d2 > 0 ? d2 / (d1 + d2) : 0.5);
    }
    });
}

} // namespace

surface_t surface_from_atoms(const std::vector<atom_t> &atoms, const std::vector<int32_t> &residue_of, double probe, const options_t &options) {
    surface_t surface;
    int threads = resolve_threads(options.threads);
    grid_t grid = ses_field(atoms, probe, options.spacing, options.sigma, options.max_shift, options.open_radius, threads,
                            options.open_uncapped, options.heal_blur);
    surface.timings = grid.timings;
    if (grid.field.empty()) return surface;
    auto mark = clock_type::now();
    // contourInput: negative inside, the surface at 0 (float) - in
    // place, as nothing needs the field as it was.
    std::vector<float> &input = grid.field;
    for (size_t i = 0; i < input.size(); i++) input[i] = float(grid.iso - input[i]);
    mesh_t mesh = finish_contour(input, grid, contour_on_cpu(input, grid), options.refine, threads);
    release(grid.field);
    surface.timings.contour = ms_since(mark);
    if (mesh.indices.empty()) return surface;
    surface.positions = std::move(mesh.positions);
    surface.normals = std::move(mesh.normals);
    surface.indices = std::move(mesh.indices);
    vertex_atoms(surface, atoms, residue_of, ownership_band(probe), threads);
    surface.timings.atoms = ms_since(mark);
    surface.nx = grid.nx; surface.ny = grid.ny; surface.nz = grid.nz;
    surface.spacing = grid.spacing;
    return surface;
}

} // namespace smooth_surface
