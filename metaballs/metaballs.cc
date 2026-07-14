#include <string>
#include <array>
#include <vector>
#include <cstdlib>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <chrono>
#include <thread>
#include <unordered_map>
#include <cmath>

#define MC_IMPLEM_ENABLE
#include "MC.h"

#include "metaballs.h"

namespace MoorhenMetaBalls {

float smoothstep(float edge0, float edge1, float x)
{
    // Scale, bias and saturate x to 0..1 range
    x = std::clamp(float((x - edge0) / (edge1 - edge0)), 0.0f, 1.0f);
    // Evaluate polynomial
    return x*x*(3 - 2 * x);
}

struct CellKey {
    int x, y, z;

    bool operator==(const CellKey& other) const {
        return x == other.x && y == other.y && z == other.z;
    }
};

struct CellKeyHash {
    std::size_t operator()(const CellKey& k) const {
        return ((std::hash<int>()(k.x) * 73856093) ^
                (std::hash<int>()(k.y) * 19349663) ^
                (std::hash<int>()(k.z) * 83492791));
    }
};

using Grid = std::unordered_map<CellKey, std::vector<unsigned>, CellKeyHash>;

Grid build_grid(
    const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points,
    float cell_size)
{
    Grid grid;
    grid.reserve(points.size());

    for (unsigned i = 0; i < points.size(); i++) {
        const auto &p = points[i].first;

        int ix = static_cast<int>(std::floor(p[0] / cell_size));
        int iy = static_cast<int>(std::floor(p[1] / cell_size));
        int iz = static_cast<int>(std::floor(p[2] / cell_size));

        grid[{ix, iy, iz}].push_back(i);
    }

    return grid;
}

inline CellKey get_cell(float x, float y, float z, float cell_size) {
    return {
        static_cast<int>(std::floor(x / cell_size)),
        static_cast<int>(std::floor(y / cell_size)),
        static_cast<int>(std::floor(z / cell_size))
    };
}

void smooth_mesh(
    const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points,
    const Grid &grid,
    float cell_size,
    int ip0, int ip1,
    float cutoff,
    moorhenMesh *mesh)
{
    const float cutoff_neg = -cutoff;

    // Reusable buffer (NO reallocations per vertex)
    std::vector<std::pair<unsigned,float>> idx_frac_pair_vec;
    idx_frac_pair_vec.reserve(64);

    for (int ii = ip0; ii < ip1; ii++) {

        float best_val = -1.0f;
        unsigned best_ip = UINT_MAX;

        const auto &v = mesh->vertices[ii];

        float x = v.x;
        float y = v.y;
        float z = v.z;

        float dx = x + 0.02f;
        float dy = y + 0.02f;
        float dz = z + 0.02f;

        float f = 0.0f;
        float f_dx = 0.0f;
        float f_dy = 0.0f;
        float f_dz = 0.0f;

        idx_frac_pair_vec.clear();

        CellKey base = get_cell(x, y, z, cell_size);

        // Only check nearby cells (27 max)
        for (int cx = -1; cx <= 1; cx++) {
            for (int cy = -1; cy <= 1; cy++) {
                for (int cz = -1; cz <= 1; cz++) {

                    CellKey key{base.x + cx, base.y + cy, base.z + cz};

                    auto it = grid.find(key);
                    if (it == grid.end()) continue;

                    const auto &cell_pts = it->second;

                    for (unsigned ip : cell_pts) {

                        const auto &pt = points[ip].first;

                        float x0 = pt[0];
                        float y0 = pt[1];
                        float z0 = pt[2];
                        float r0 = pt[3];

                        float dx0 = x - x0;
                        if (dx0 > cutoff || dx0 < cutoff_neg) continue;

                        float dy0 = y - y0;
                        if (dy0 > cutoff || dy0 < cutoff_neg) continue;

                        float dz0 = z - z0;
                        if (dz0 > cutoff || dz0 < cutoff_neg) continue;

                        float xx = dx0 * dx0;
                        float yy = dy0 * dy0;
                        float zz = dz0 * dz0;

                        float sumsq = xx + yy + zz;
                        if (sumsq >= 22.f) continue;

                        float rr = r0 * r0;

                        float inv = 1.0f / sumsq;
                        float val = rr * inv;

                        f += val;

                        if(val > best_val){
                            best_val = val;
                            best_ip = ip;
                        }

                        // gradient (reuse partial sums)
                        float yz = yy + zz;
                        float xz = xx + zz;
                        float xy = xx + yy;

                        float dxx = (dx - x0)*(dx - x0);
                        float dyy = (dy - y0)*(dy - y0);
                        float dzz = (dz - z0)*(dz - z0);

                        f_dx += rr / (dxx + yz);
                        f_dy += rr / (xx + dyy + zz);
                        f_dz += rr / (xx + yy + dzz);

                        // weight for color
                        float frac = 1.0f - smoothstep(0.3f, 2.8f, sumsq);
                        idx_frac_pair_vec.emplace_back(ip, frac);
                    }
                }
            }
        }

        // ✅ single-pass color accumulation
        float totFrac = 0.0f;
        std::array<float,4> theColor{0,0,0,0};

        for (const auto &p : idx_frac_pair_vec) {
            float w = p.second;
            totFrac += w;

            const auto &c = points[p.first].second;
            theColor[0] += w * c[0];
            theColor[1] += w * c[1];
            theColor[2] += w * c[2];
            theColor[3] += w * c[3];
        }

        if (totFrac > 1e-4f) {
            float inv = 1.0f / totFrac;
            for (int k = 0; k < 4; k++)
                theColor[k] *= inv;
        }

        MC::mcVec3f new_norm({f_dx - f, f_dy - f, f_dz - f});
        new_norm = MC::mc_internalNormalize(new_norm);

        mesh->normals[ii] = new_norm;
        mesh->colors[ii] = theColor;
        mesh->vertex_owner[ii] = best_ip;

        if(best_ip == UINT_MAX)
        {
            std::cerr << "No owner found for vertex "
                << ii
                << std::endl;
        }
    }
}

void fill_field(
    const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points,
    int ip0, int ip1,
    std::vector<MC::MC_FLOAT> &field,
    float cutoff,
    int ncell_x, int ncell_y, int ncell_z,
    float min_x, float min_y, float min_z,
    float cell_x, float cell_y, float cell_z)
{
    for (int ip = ip0; ip < ip1; ip++) {

        float x0 = points[ip].first[0];
        float y0 = points[ip].first[1];
        float z0 = points[ip].first[2];
        float r0 = points[ip].first[3];

        float rr = r0 * r0;

        // ✅ bounded grid region
        int ix_min = std::max(0, (int)((x0 - cutoff - min_x) / cell_x));
        int ix_max = std::min(ncell_x - 1, (int)((x0 + cutoff - min_x) / cell_x));

        int iy_min = std::max(0, (int)((y0 - cutoff - min_y) / cell_y));
        int iy_max = std::min(ncell_y - 1, (int)((y0 + cutoff - min_y) / cell_y));

        int iz_min = std::max(0, (int)((z0 - cutoff - min_z) / cell_z));
        int iz_max = std::min(ncell_z - 1, (int)((z0 + cutoff - min_z) / cell_z));

        for (int iz = iz_min; iz <= iz_max; iz++) {
            float z = min_z + iz * cell_z;
            float dz = z - z0;
            float zz = dz * dz;

            int idx_z = iz * ncell_x * ncell_y;

            for (int iy = iy_min; iy <= iy_max; iy++) {
                float y = min_y + iy * cell_y;
                float dy = y - y0;
                float yy = dy * dy;

                int idx_y = iy * ncell_x;

                for (int ix = ix_min; ix <= ix_max; ix++) {
                    float x = min_x + ix * cell_x;
                    float dx = x - x0;
                    float xx = dx * dx;

                    float d2 = xx + yy + zz;

                    // optional: skip very small distances
                    if (d2 < 1e-6f) continue;

                    float s = smoothstep(0.0f, 12.0f, d2);
                    float inv = 1.0f / (s * 30.0f);

                    int idx = idx_z + idx_y + ix;
                    field[idx] += rr * inv;
                }
            }
        }
    }
}

moorhenMesh GenerateMeshFromPoints(const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points, float isoLevel, float gridSize, int n_threads){

    auto t_start = std::chrono::high_resolution_clock::now();

    moorhenMesh mesh;

    float padding = 4.0f;

    float min_x =  1e8;
    float max_x = -1e8;
    float min_y =  1e8;
    float max_y = -1e8;
    float min_z =  1e8;
    float max_z = -1e8;

    for(unsigned ip=0;ip<points.size();ip++){
        float x = points[ip].first[0];
        float y = points[ip].first[1];
        float z = points[ip].first[2];
        if(x<min_x) min_x = x;
        if(x>max_x) max_x = x;
        if(y<min_y) min_y = y;
        if(y>max_y) max_y = y;
        if(z<min_z) min_z = z;
        if(z>max_z) max_z = z;
    }

    min_x -= (padding/isoLevel+gridSize);
    min_y -= (padding/isoLevel+gridSize);
    min_z -= (padding/isoLevel+gridSize);
    max_x += (padding/isoLevel+gridSize);
    max_y += (padding/isoLevel+gridSize);
    max_z += (padding/isoLevel+gridSize);

    std::cout << "orig x range:" << min_x << " " << max_x << std::endl;
    std::cout << "orig y range:" << min_y << " " << max_y << std::endl;
    std::cout << "orig z range:" << min_z << " " << max_z << std::endl;

    int ncell_x = (max_x - min_x) / gridSize;
    int ncell_y = (max_y - min_y) / gridSize;
    int ncell_z = (max_z - min_z) / gridSize;

    float cell_x = gridSize;
    float cell_y = gridSize;
    float cell_z = gridSize;

    std::cout << "cell_x" << " " << "cell_y" << " " << "cell_z" << std::endl;
    std::cout << cell_x << " " << cell_y << " " << cell_z << std::endl;
    std::cout << "ncell_x" << " " << "ncell_y" << " " << "ncell_z" << std::endl;
    std::cout << ncell_x << " " << ncell_y << " " << ncell_z << std::endl;

    auto t_min_max = std::chrono::high_resolution_clock::now();

    // First compute a scalar field
    std::vector<MC::MC_FLOAT> field(ncell_x * ncell_y * ncell_z);

    unsigned np = points.size();

    float mIsoLevel = -isoLevel;
    std::fill(field.begin(), field.end(), mIsoLevel);
    auto t_field_fill = std::chrono::high_resolution_clock::now();

    float cutoff = 5.0f;

    if(np>20&&n_threads>1){
        std::vector<std::thread> fill_threads;
        for(int i=0;i<n_threads;i++){
            int start =     i * np / n_threads;
            int end   = (i+1) * np / n_threads;
            fill_threads.push_back(std::thread(fill_field, std::cref(points), start, end, std::ref(field), cutoff, ncell_x, ncell_y, ncell_z, min_x, min_y, min_z, cell_x, cell_y, cell_z));
        }
        for(int i=0;i<n_threads;i++){
            fill_threads[i].join();
        }
    } else {
        fill_field(points, 0, np, field, cutoff, ncell_x, ncell_y, ncell_z, min_x, min_y, min_z, cell_x, cell_y, cell_z);
    }

    auto t_field = std::chrono::high_resolution_clock::now();

    // Compute isosurface using marching cube
    MC::marching_cube(field.data(), ncell_x, ncell_y, ncell_z, mesh);

    auto t_march = std::chrono::high_resolution_clock::now();

// new smooth f(x-eps,y,z)-f(x+eps,y,z) to get normal x, same for y,z.
// Compute field at these points!!!?? A tad expensive?!

    for(unsigned iv=0;iv<mesh.vertices.size();iv++){
        mesh.vertices[iv].x *= cell_x;
        mesh.vertices[iv].x += min_x;
        mesh.vertices[iv].y *= cell_y;
        mesh.vertices[iv].y += min_y;
        mesh.vertices[iv].z *= cell_z;
        mesh.vertices[iv].z += min_z;
        //std::cout << mesh.vertices[iv].x << " " << mesh.vertices[iv].y << " " << mesh.vertices[iv].z << std::endl;
    }
    std::cout << "vertices: " << mesh.vertices.size() << std::endl;
    std::cout << "normals: " << mesh.normals.size() << std::endl;
    std::cout << "indices: " << mesh.indices.size() << std::endl;

    auto t_mesh = std::chrono::high_resolution_clock::now();

    //Smooth the mesh by computing normals based on field gradient

    float cell_size = cutoff;
    Grid grid = build_grid(points, cell_size);

    int np_smooth = mesh.vertices.size();
    std::array<float,4> theColor{0.5,0.5,0.5,1.0};
    mesh.colors.resize(np_smooth,theColor);
    mesh.vertex_owner.resize(mesh.vertices.size());
    if(np_smooth>20&&n_threads>1){
        std::vector<std::thread> smooth_threads;
        for(int i=0;i<n_threads;i++){
            int start =     i * np_smooth / n_threads;
            int end   = (i+1) * np_smooth / n_threads;
            smooth_threads.push_back(std::thread(smooth_mesh, std::cref(points), grid, cell_size, start, end, cutoff, &mesh));
        }
        for(int i=0;i<n_threads;i++){
            smooth_threads[i].join();
        }
    } else {
        smooth_mesh(points, grid, cell_size, 0, np_smooth, cutoff, &mesh);
    }

    auto t_smooth = std::chrono::high_resolution_clock::now();

    mesh.point_triangles.resize(points.size());

    for(unsigned tri = 0; tri < mesh.indices.size(); tri += 3) {
        unsigned i0 = mesh.indices[tri];
        unsigned i1 = mesh.indices[tri + 1];
        unsigned i2 = mesh.indices[tri + 2];

        unsigned p0 = mesh.vertex_owner[i0];
        unsigned p1 = mesh.vertex_owner[i1];
        unsigned p2 = mesh.vertex_owner[i2];

        unsigned owner;

        if(p0 == p1 || p0 == p2)
            owner = p0;
        else if(p1 == p2)
            owner = p1;
        else
            owner = p0;

        mesh.point_triangles[owner].push_back(tri / 3);
    }

    /*
    for(auto& pt : mesh.point_triangles){
        std::cout << pt.size() << std::endl;
    }
    */

    auto t_associate = std::chrono::high_resolution_clock::now();

    auto t_total = std::chrono::duration_cast<std::chrono::microseconds>(t_associate - t_start).count();
    auto t1 = std::chrono::duration_cast<std::chrono::microseconds>(t_min_max-t_start).count();
    auto t2 = std::chrono::duration_cast<std::chrono::microseconds>(t_field_fill-t_min_max).count();
    auto t3 = std::chrono::duration_cast<std::chrono::microseconds>(t_field-t_field_fill).count();
    auto t4 = std::chrono::duration_cast<std::chrono::microseconds>(t_march-t_field).count();
    auto t5 = std::chrono::duration_cast<std::chrono::microseconds>(t_mesh-t_march).count();
    auto t6 = std::chrono::duration_cast<std::chrono::microseconds>(t_smooth-t_mesh).count();
    auto t7 = std::chrono::duration_cast<std::chrono::microseconds>(t_associate-t_smooth).count();
    auto p1 = 100.* t1 / t_total;
    auto p2 = 100.* t2 / t_total;
    auto p3 = 100.* t3 / t_total;
    auto p4 = 100.* t4 / t_total;
    auto p5 = 100.* t5 / t_total;
    auto p6 = 100.* t6 / t_total;
    auto p7 = 100.* t7 / t_total;

    std::cout << std::fixed;
    std::cout << std::setprecision(2);

    std::cout << "Time to get min max "      << t1 << " (" << p1 << "%)" << std::endl;
    std::cout << "Time to initialize field " << t2 << " (" << p2 << "%)" << std::endl;
    std::cout << "Time to make field "       << t3 << " (" << p3 << "%)" << std::endl;
    std::cout << "Time to get surface "      << t4 << " (" << p4 << "%)" << std::endl;
    std::cout << "Time to rebase mesh "      << t5 << " (" << p5 << "%)" << std::endl;
    std::cout << "Time to smooth mesh "      << t6 << " (" << p6 << "%)" << std::endl;
    std::cout << "Time to associate triangles "      << t7 << " (" << p7 << "%)" << std::endl;
    std::cout << "Total time "               << t_total << std::endl;

    return mesh;
}

}
