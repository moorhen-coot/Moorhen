#include <string>
#include <array>
#include <vector>
#include <cstdlib>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <chrono>

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

moorhenMesh GenerateMeshFromPoints(const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points, float isoLevel, float gridSize){

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
    for(unsigned ip=0;ip<np;ip++){
        float x0 = points[ip].first[0];
        float y0 = points[ip].first[1];
        float z0 = points[ip].first[2];
        float r0 = points[ip].first[3];
        float rr = r0 * r0;
        for(unsigned iz=0;iz<ncell_z;iz++){
            float z = min_z + iz * cell_z;
            if(fabs(z-z0)>cutoff) continue;
            int idx_z = iz*ncell_x*ncell_y;
            float zz = (z - z0)*(z - z0);
            for(unsigned iy=0;iy<ncell_y;iy++){
                float y = min_y + iy * cell_y;
                if(fabs(y-y0)>cutoff) continue;
                int idx_y = iy*ncell_x;
                float yy = (y - y0)*(y - y0);
                for(unsigned ix=0;ix<ncell_x;ix++){
                    float x = min_x + ix * cell_x;
                    if(fabs(x-x0)>cutoff) continue;
                    float xx = (x - x0)*(x - x0);
                    int newIdx = idx_z + idx_y + ix;
                    //Potential cutoff and obscure fudge factor.
                    float d2 = (xx + yy + zz);
                    d2 = smoothstep(0.0f,12.0f,d2) * 30.0;
                    field[newIdx] += rr / d2;
                    /*
                    field[newIdx] += rr / (xx + yy + zz);
                    */
                }
            }
        }
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

    for(unsigned ii=0;ii<mesh.vertices.size();ii++){
        float x = mesh.vertices[ii].x;
        float y = mesh.vertices[ii].y;
        float z = mesh.vertices[ii].z;

        float dx = mesh.vertices[ii].x+.02;
        float dy = mesh.vertices[ii].y+.02;
        float dz = mesh.vertices[ii].z+.02;

        float f = 0.0;
        float f_dx = 0.0;
        float f_dy = 0.0;
        float f_dz = 0.0;

        std::vector<std::pair<unsigned,float>> idx_frac_pair_vec;

        for(unsigned ip=0;ip<np;ip++){
            float x0 = points[ip].first[0];
            float y0 = points[ip].first[1];
            float z0 = points[ip].first[2];
            float r0 = points[ip].first[3];

            float rr = r0 * r0;

            float xx = (x - x0)*(x - x0);
            float yy = (y - y0)*(y - y0);
            float zz = (z - z0)*(z - z0);

            float sumsq = xx+yy+zz;
            if(sumsq<22.){
                float frac = 1.0-smoothstep(0.3,2.8,sumsq);
                std::pair<unsigned,float> idx_frac_pair;
                idx_frac_pair.first = ip;
                idx_frac_pair.second = frac;
                idx_frac_pair_vec.push_back(idx_frac_pair);
            }

            float dxx = (dx - x0)*(dx - x0);
            float dyy = (dy - y0)*(dy - y0);
            float dzz = (dz - z0)*(dz - z0);

            f_dx += rr / (dxx + yy + zz);
            f_dy += rr / (xx + dyy + zz);
            f_dz += rr / (xx + yy + dzz);

            f += rr / (xx + yy + zz);
        }

        float totFrac = 0.0;
        for(unsigned ip=0;ip<idx_frac_pair_vec.size();ip++){
            totFrac += idx_frac_pair_vec[ip].second;
        }
        std::array<float,4> theColor{0.0,0.0,0.0,0.0};
        if(idx_frac_pair_vec.size()>0 && fabs(totFrac)>1e-4){
            for(unsigned ip=0;ip<idx_frac_pair_vec.size();ip++){
                theColor[0] += idx_frac_pair_vec[ip].second * points[idx_frac_pair_vec[ip].first].second[0] / totFrac;
                theColor[1] += idx_frac_pair_vec[ip].second * points[idx_frac_pair_vec[ip].first].second[1] / totFrac;
                theColor[2] += idx_frac_pair_vec[ip].second * points[idx_frac_pair_vec[ip].first].second[2] / totFrac;
                theColor[3] += idx_frac_pair_vec[ip].second * points[idx_frac_pair_vec[ip].first].second[3] / totFrac;
            }
        }

        MC::mcVec3f new_norm({f_dx-f,f_dy-f,f_dz-f});
        new_norm = MC::mc_internalNormalize(new_norm);
        mesh.normals[ii] = new_norm;
        mesh.colors.push_back(theColor);
    }

    auto t_smooth = std::chrono::high_resolution_clock::now();

    auto t_total = std::chrono::duration_cast<std::chrono::microseconds>(t_smooth - t_start).count();
    auto t1 = std::chrono::duration_cast<std::chrono::microseconds>(t_min_max-t_start).count();
    auto t2 = std::chrono::duration_cast<std::chrono::microseconds>(t_field_fill-t_min_max).count();
    auto t3 = std::chrono::duration_cast<std::chrono::microseconds>(t_field-t_field_fill).count();
    auto t4 = std::chrono::duration_cast<std::chrono::microseconds>(t_march-t_field).count();
    auto t5 = std::chrono::duration_cast<std::chrono::microseconds>(t_mesh-t_march).count();
    auto t6 = std::chrono::duration_cast<std::chrono::microseconds>(t_smooth-t_mesh).count();
    auto p1 = 100.* t1 / t_total; 
    auto p2 = 100.* t2 / t_total;
    auto p3 = 100.* t3 / t_total;
    auto p4 = 100.* t4 / t_total;
    auto p5 = 100.* t5 / t_total;
    auto p6 = 100.* t6 / t_total;

    std::cout << std::fixed;
    std::cout << std::setprecision(2);

    std::cout << "Time to get min max "      << t1 << " (" << p1 << "%)" << std::endl;
    std::cout << "Time to initialize field " << t2 << " (" << p2 << "%)" << std::endl;
    std::cout << "Time to make field "       << t3 << " (" << p3 << "%)" << std::endl;
    std::cout << "Time to get surface "      << t4 << " (" << p4 << "%)" << std::endl;
    std::cout << "Time to rebase mesh "      << t5 << " (" << p5 << "%)" << std::endl;
    std::cout << "Time to smooth mesh "      << t6 << " (" << p6 << "%)" << std::endl;

    return mesh;
}

}
