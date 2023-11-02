#include <string>
#include <array>
#include <vector>
#include <cstdlib>
#include <iostream>
#include <algorithm>
#include <chrono>

#define MC_IMPLEM_ENABLE
#include "MC.h"

namespace MoorhenMetaBalls {

MC::mcMesh GenerateMeshFromPoints(const std::vector<std::array<float,4>> &points, float isoLevel, unsigned int n){

    auto t_start = std::chrono::high_resolution_clock::now();

    MC::mcMesh mesh;

    float r = 0.45f;

    float min_x =  1e8;
    float max_x = -1e8;
    float min_y =  1e8;
    float max_y = -1e8;
    float min_z =  1e8;
    float max_z = -1e8;

    for(unsigned ip=0;ip<points.size();ip++){
        float x = points[ip][0];
        float y = points[ip][1];
        float z = points[ip][2];
        if(x<min_x) min_x = x;
        if(x>max_x) max_x = x;
        if(y<min_y) min_y = y;
        if(y>max_y) max_y = y;
        if(z<min_z) min_z = z;
        if(z>max_z) max_z = z;
    }

    min_x -= (r+isoLevel);
    min_y -= (r+isoLevel);
    min_z -= (r+isoLevel);
    max_x += (r+isoLevel);
    max_y += (r+isoLevel);
    max_z += (r+isoLevel);

    std::cout << "orig x range:" << min_x << " " << max_x << std::endl;
    std::cout << "orig y range:" << min_y << " " << max_y << std::endl;
    std::cout << "orig z range:" << min_z << " " << max_z << std::endl;

    min_x = std::min(min_x,min_y);
    max_x = std::max(max_x,max_y);
    min_x = std::min(min_x,min_z);
    max_x = std::max(max_x,max_z);
    min_y = min_z = min_x;
    max_y = max_z = max_x;

    std::cout << min_x << " " << max_x << std::endl;
    std::cout << min_y << " " << max_y << std::endl;
    std::cout << min_z << " " << max_z << std::endl;

    float cell_x = (max_x - min_x) / n;
    float cell_y = (max_y - min_y) / n;
    float cell_z = (max_z - min_z) / n;

    std::cout << "n" << " " << "cell_x" << " " << "cell_y" << " " << "cell_z" << std::endl;
    std::cout << n << " " << cell_x << " " << cell_y << " " << cell_z << std::endl;

    auto t_min_max = std::chrono::high_resolution_clock::now();

    // First compute a scalar field
    MC::MC_FLOAT* field = new MC::MC_FLOAT[n * n * n];

    unsigned np = points.size();

    float mIsoLevel = -isoLevel;
    std::fill(field, field+n * n * n, mIsoLevel);
    auto t_field_fill = std::chrono::high_resolution_clock::now();

    for(unsigned ip=0;ip<np;ip++){
        int newIdx = 0;
        float x0 = points[ip][0];
        float y0 = points[ip][1];
        float z0 = points[ip][2];
        float r0 = points[ip][3];
        float rr = r0 * r0;
        for(unsigned iz=0;iz<n;iz++){
            float z = min_z + iz * cell_z;
            float zz = (z - z0)*(z - z0);
            for(unsigned iy=0;iy<n;iy++){
                float y = min_y + iy * cell_y;
                float yy = (y - y0)*(y - y0);
                for(unsigned ix=0;ix<n;ix++){
                    float x = min_x + ix * cell_x;
                    float xx = (x - x0)*(x - x0);
                    field[newIdx++] += rr / (xx + yy + zz);
                }
            }
        }
    }

    auto t_field = std::chrono::high_resolution_clock::now();

    // Compute isosurface using marching cube
    MC::marching_cube(field, n, n, n, mesh);

    delete [] field;

    auto t_march = std::chrono::high_resolution_clock::now();

    for(unsigned iv=0;iv<mesh.vertices.size();iv++){
        mesh.vertices[iv].x *= cell_x;
        mesh.vertices[iv].x += min_x;
        mesh.vertices[iv].y *= cell_y;
        mesh.vertices[iv].y += min_y;
        mesh.vertices[iv].z *= cell_z;
        mesh.vertices[iv].z += min_z;
        //std::cout << mesh.vertices[iv].x << " " << mesh.vertices[iv].y << " " << mesh.vertices[iv].z << std::endl;
    }
    std::cout << mesh.vertices.size() << std::endl;
    std::cout << mesh.normals.size() << std::endl;
    std::cout << mesh.indices.size() << std::endl;

    auto t_mesh = std::chrono::high_resolution_clock::now();

    std::cout << "Time to get min max " << std::chrono::duration_cast<std::chrono::microseconds>(t_min_max-t_start).count() << std::endl;
    std::cout << "Time to initialize field " << std::chrono::duration_cast<std::chrono::microseconds>(t_field_fill-t_min_max).count() << std::endl;
    std::cout << "Time to make field " << std::chrono::duration_cast<std::chrono::microseconds>(t_field-t_field_fill).count() << std::endl;
    std::cout << "Time to get surface " << std::chrono::duration_cast<std::chrono::microseconds>(t_march-t_field).count() << std::endl;
    std::cout << "Time to make mesh " << std::chrono::duration_cast<std::chrono::microseconds>(t_mesh-t_march).count() << std::endl;

    return mesh;
}

}
