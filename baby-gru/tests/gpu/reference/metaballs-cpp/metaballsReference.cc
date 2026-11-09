// The C++ reference for tests/gpu/cases/metaballs.case.ts: runs Moorhen's MetaBalls
// (metaballs/metaballs.cc, GenerateMeshFromPoints) on points written by makePoints.mjs and writes
// the mesh in the layout described in tests/gpu/README.md ("Reference data"), with the influences
// packed as DrawMoorhenMetaBalls packs them (an end offset per vertex).
//
// Build and run from baby-gru (see tests/gpu/README.md):
//   c++ -O2 -std=c++17 -I ../metaballs -o /tmp/metaballsReference \
//       tests/gpu/reference/metaballs-cpp/metaballsReference.cc ../metaballs/metaballs.cc -lpthread
//   /tmp/metaballsReference points.bin mesh.bin
#include <array>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <utility>
#include <vector>
#include "MC.h"
#include "metaballs.h"

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: %s points.bin mesh.bin\n", argv[0]);
        return 1;
    }
    FILE *in = fopen(argv[1], "rb");
    if (!in) { perror(argv[1]); return 1; }
    unsigned n = 0;
    if (fread(&n, 4, 1, in) != 1) { fprintf(stderr, "%s: no point count\n", argv[1]); return 1; }
    std::vector<float> p(n * 4), c(n * 4);
    if (fread(p.data(), 4, n * 4, in) != n * 4 || fread(c.data(), 4, n * 4, in) != n * 4) {
        fprintf(stderr, "%s: short\n", argv[1]);
        return 1;
    }
    fclose(in);
    std::vector<std::pair<std::array<float, 4>, std::array<float, 4>>> points(n);
    for (unsigned i = 0; i < n; i++) {
        points[i].first = {p[4 * i], p[4 * i + 1], p[4 * i + 2], p[4 * i + 3]};
        points[i].second = {c[4 * i], c[4 * i + 1], c[4 * i + 2], c[4 * i + 3]};
    }
    // Iso level 1.8, grid 0.2 A, as getMetaBallBuffers asks; one thread, so the output is fixed.
    auto m = MoorhenMetaBalls::GenerateMeshFromPoints(points, 1.8f, 0.2f, 1);
    std::vector<unsigned> ends, atoms;
    std::vector<float> weights;
    unsigned total = 0;
    for (auto &influences : m.influences) {
        for (auto &a : influences) { atoms.push_back(a.first); weights.push_back(a.second); }
        total += influences.size();
        ends.push_back(total);
    }
    FILE *out = fopen(argv[2], "wb");
    if (!out) { perror(argv[2]); return 1; }
    unsigned header[3] = {(unsigned)m.vertices.size(), (unsigned)m.indices.size(), total};
    fwrite(header, 4, 3, out);
    fwrite(m.vertices.data(), 12, m.vertices.size(), out);
    fwrite(m.normals.data(), 12, m.normals.size(), out);
    fwrite(m.colors.data(), 16, m.colors.size(), out);
    fwrite(m.indices.data(), 4, m.indices.size(), out);
    fwrite(ends.data(), 4, ends.size(), out);
    fwrite(atoms.data(), 4, atoms.size(), out);
    fwrite(weights.data(), 4, weights.size(), out);
    fclose(out);
    fprintf(stderr, "%u vertices, %u triangles, %u influences\n", header[0], header[1] / 3, total);
    return 0;
}
