/*
 * Tests for bloboids.cc, natively (no MMDB, no Coot, no wasm):
 *
 *   g++ -std=c++17 -O2 -o bloboids-test bloboids-test.cc bloboids.cc && ./bloboids-test
 *
 * The eigen-decomposition against the matrices CCP4MG's solver got wrong and random ones; the
 * ellipsoid of point clouds of known shape, turned and moved; and the mesh's winding and normals.
 */
#include "bloboids.hh"

#include <cmath>
#include <cstdio>
#include <random>
#include <string>
#include <vector>

using namespace moorhen_bloboids;

static int failures = 0;
static void check(bool ok, const std::string &what) {
    if (!ok) {
        failures++;
        std::printf("FAIL: %s\n", what.c_str());
    }
}

static double dot(const Vec3 &a, const Vec3 &b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Largest of |A v - lambda v| / largest |lambda|, |v| - 1, v_i . v_j, and the handedness. */
static double eigen_error(const double a[3][3], const double values[3], const Vec3 vectors[3]) {
    double scale = std::max(std::fabs(values[0]), std::max(std::fabs(values[1]), std::fabs(values[2])));
    if (scale == 0) scale = 1;
    double err = 0;
    for (int k = 0; k < 3; k++) {
        double r = 0;
        for (int i = 0; i < 3; i++) {
            double ai = 0;
            for (int j = 0; j < 3; j++) ai += a[i][j] * vectors[k][j];
            r += (ai - values[k] * vectors[k][i]) * (ai - values[k] * vectors[k][i]);
        }
        err = std::max(err, std::sqrt(r) / scale);
        err = std::max(err, std::fabs(std::sqrt(dot(vectors[k], vectors[k])) - 1));
        for (int l = k + 1; l < 3; l++) err = std::max(err, std::fabs(dot(vectors[k], vectors[l])));
    }
    if (values[0] < values[1] || values[1] < values[2]) err = std::max(err, 1.0);
    Vec3 c = {vectors[0][1] * vectors[1][2] - vectors[0][2] * vectors[1][1],
              vectors[0][2] * vectors[1][0] - vectors[0][0] * vectors[1][2],
              vectors[0][0] * vectors[1][1] - vectors[0][1] * vectors[1][0]};
    err = std::max(err, std::fabs(dot(c, vectors[2]) - 1));
    return std::isfinite(err) ? err : 1e9;
}

static void test_eigen() {
    // The structured matrices CCP4MG's matrix::Eigen got wrong, and some simple ones.
    std::mt19937 rng(3);
    std::uniform_real_distribution<double> u(0.1, 2);
    int bad = 0, n = 0;
    for (int kind = 0; kind < 4; kind++) {
        for (int t = 0; t < 20000; t++) {
            double a = u(rng) + 2, b = u(rng) - 1, c = u(rng) - 1, d = u(rng) + 2, f = u(rng) - 1;
            double m[4][3][3] = {
                {{a, b, b}, {b, a, b}, {b, b, a}},
                {{a, b, c}, {b, a, c}, {c, c, d}},
                {{a, b, c}, {b, a, f}, {c, f, d}},
                {{a, 0, 0}, {0, d, 0}, {0, 0, a}},
            };
            double values[3];
            Vec3 vectors[3];
            symmetric_eigen3(m[kind], values, vectors);
            n++;
            if (eigen_error(m[kind], values, vectors) > 1e-10) bad++;
        }
    }
    check(bad == 0, "structured symmetric matrices: " + std::to_string(bad) + " of " + std::to_string(n) + " wrong");

    double line[3][3] = {{1, 1, 1}, {1, 1, 1}, {1, 1, 1}};
    double values[3];
    Vec3 vectors[3];
    symmetric_eigen3(line, values, vectors);
    check(eigen_error(line, values, vectors) < 1e-12 && std::fabs(values[0] - 3) < 1e-12, "rank one");
    double zero[3][3] = {{0, 0, 0}, {0, 0, 0}, {0, 0, 0}};
    symmetric_eigen3(zero, values, vectors);
    check(eigen_error(zero, values, vectors) < 1e-12, "zero matrix");

    // Random covariance-like matrices over many scales, some off-diagonals exactly zero.
    bad = 0;
    std::uniform_real_distribution<double> s(-1, 1);
    for (int t = 0; t < 200000; t++) {
        double scale = std::pow(10, 4 * s(rng));
        double x = s(rng), y = s(rng), z = s(rng);
        if (t & 1) x = 0;
        if (t & 2) y = 0;
        if (t & 4) z = 0;
        double B[3][3] = {{s(rng), x, y}, {0, s(rng), z}, {0, 0, s(rng)}};
        double C[3][3];
        for (int i = 0; i < 3; i++)
            for (int j = 0; j < 3; j++) {
                C[i][j] = 0;
                for (int k = 0; k < 3; k++) C[i][j] += B[k][i] * B[k][j] * scale;
            }
        symmetric_eigen3(C, values, vectors);
        if (eigen_error(C, values, vectors) > 1e-10) bad++;
    }
    check(bad == 0, "random covariances: " + std::to_string(bad) + " of 200000 wrong");
}

static void test_ellipsoid() {
    // A cloud with standard deviations 6, 3 and 1 along known axes, turned and moved: the
    // ellipsoid's axes along those, its semi-axes about 2 sigma + 0.7, its centre the mean.
    std::mt19937 rng(11);
    std::normal_distribution<double> g(0, 1);
    const double sigma[3] = {6, 3, 1};
    const double c = std::cos(0.7), s = std::sin(0.7);
    const Vec3 axes[3] = {{c, s, 0}, {-s * 0.6, c * 0.6, 0.8}, {s * 0.8, -c * 0.8, 0.6}};
    const Vec3 offset = {120, -40, 75};
    std::vector<Vec3> points;
    for (int i = 0; i < 200000; i++) {
        Vec3 p = offset;
        for (int k = 0; k < 3; k++) {
            double l = sigma[k] * g(rng);
            for (int j = 0; j < 3; j++) p[j] += l * axes[k][j];
        }
        points.push_back(p);
    }
    Ellipsoid e = ellipsoid_of_points(points);
    for (int k = 0; k < 3; k++) {
        check(std::fabs(std::fabs(dot(e.axes[k], axes[k])) - 1) < 1e-3, "axis " + std::to_string(k) + " along the cloud's");
        check(std::fabs(e.semi_axes[k] - (2 * sigma[k] + 0.7)) < 0.05 * sigma[k], "semi-axis " + std::to_string(k));
        check(std::fabs(e.centre[k] - offset[k]) < 0.1, "centre " + std::to_string(k));
    }

    // One point: a sphere of 0.7 there. Two: a cigar through them. A straight line of points:
    // no NaN, the smallest semi-axes just the padding.
    Ellipsoid one = ellipsoid_of_points({{1, 2, 3}});
    check(one.centre[0] == 1 && one.centre[1] == 2 && one.centre[2] == 3 && one.semi_axes[0] == 0.7 && one.semi_axes[2] == 0.7, "one point");
    Ellipsoid two = ellipsoid_of_points({{0, 0, 0}, {4, 0, 0}});
    check(std::fabs(std::fabs(two.axes[0][0]) - 1) < 1e-12 && std::fabs(two.semi_axes[1] - 0.7) < 1e-12, "two points");
    std::vector<Vec3> straight;
    for (int i = 0; i < 10; i++) straight.push_back({double(i), double(i), double(i)});
    Ellipsoid line = ellipsoid_of_points(straight);
    check(std::isfinite(line.semi_axes[2]) && std::fabs(line.semi_axes[2] - 0.7) < 1e-6, "a straight line");
    check(ellipsoid_of_points({}).semi_axes[0] == 0, "no points");
}

static void test_mesh() {
    Ellipsoid e;
    e.centre = {10, -5, 2};
    e.semi_axes = {5, 2, 1};
    const double c = std::cos(0.3), s = std::sin(0.3);
    e.axes[0] = {c, s, 0};
    e.axes[1] = {-s, c, 0};
    e.axes[2] = {0, 0, 1};
    Mesh mesh;
    append_ellipsoid(e, {0.2f, 0.4f, 0.6f, 1.0f}, 3, mesh);
    const size_t nv = mesh.positions.size() / 3, nt = mesh.indices.size() / 3;
    check(nt == 8 * 64, "triangle count");
    check(mesh.colours.size() == 4 * nv && mesh.normals.size() == 3 * nv, "a normal and colour per vertex");

    // Every vertex on the ellipsoid; the signed volume positive (anticlockwise from outside)
    // and close to 4/3 pi abc; every normal pointing out, perpendicular to the surface.
    double volume = 0, worst_surface = 0, worst_normal = 0;
    bool outward = true;
    auto at = [&](unsigned int i) {
        return Vec3{mesh.positions[3 * i] - e.centre[0], mesh.positions[3 * i + 1] - e.centre[1], mesh.positions[3 * i + 2] - e.centre[2]};
    };
    for (size_t i = 0; i < nv; i++) {
        Vec3 p = at(i);
        double f = 0;
        Vec3 grad = {0, 0, 0};
        for (int k = 0; k < 3; k++) {
            double l = dot(p, e.axes[k]) / e.semi_axes[k];
            f += l * l;
            for (int j = 0; j < 3; j++) grad[j] += l / e.semi_axes[k] * e.axes[k][j];
        }
        worst_surface = std::max(worst_surface, std::fabs(f - 1));
        double gl = std::sqrt(dot(grad, grad));
        Vec3 n = {mesh.normals[3 * i], mesh.normals[3 * i + 1], mesh.normals[3 * i + 2]};
        worst_normal = std::max(worst_normal, std::fabs(dot(n, grad) / gl - 1));
        if (dot(n, p) <= 0) outward = false;
    }
    for (size_t t = 0; t < nt; t++) {
        Vec3 a = at(mesh.indices[3 * t]), b = at(mesh.indices[3 * t + 1]), d = at(mesh.indices[3 * t + 2]);
        Vec3 bxd = {b[1] * d[2] - b[2] * d[1], b[2] * d[0] - b[0] * d[2], b[0] * d[1] - b[1] * d[0]};
        volume += dot(a, bxd) / 6;
    }
    const double exact = 4.0 / 3.0 * M_PI * 5 * 2 * 1;
    check(worst_surface < 1e-5, "vertices on the ellipsoid");
    check(worst_normal < 1e-5, "normals are the ellipsoid's");
    check(outward, "normals point out");
    check(volume > 0.95 * exact && volume < exact, "wound anticlockwise from outside, volume " + std::to_string(volume) + " of " + std::to_string(exact));

    // A second ellipsoid's indices follow the first's vertices.
    append_ellipsoid(e, {1, 1, 1, 1}, 1, mesh);
    check(mesh.indices.back() < mesh.positions.size() / 3 && mesh.indices[3 * nt] >= nv, "a second ellipsoid after the first");
}

int main() {
    test_eigen();
    test_ellipsoid();
    test_mesh();
    if (failures == 0) std::printf("bloboids: all tests passed\n");
    return failures == 0 ? 0 : 1;
}
