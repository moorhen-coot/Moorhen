#include <string>
#include <array>
#include <vector>
#include <cstdlib>
#include <iostream>
#include <algorithm>

#define MC_IMPLEM_ENABLE
#include "MC.h"

namespace MoorhenMetaBalls {
MC::mcMesh GenerateMeshFromPoints(const std::vector<std::array<float,4>> &points, float isoLevel, unsigned int n){

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

    min_x -= r;
    min_y -= r;
    min_z -= r;
    max_x += r;
    max_y += r;
    max_z += r;

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

    // First compute a scalar field
    MC::MC_FLOAT* field = new MC::MC_FLOAT[n * n * n];

    int maxIdx = 0;
    for(unsigned iz=0;iz<n;iz++){
        float z = min_z + iz * cell_z;
        for(unsigned iy=0;iy<n;iy++){
            float y = min_y + iy * cell_y;
            for(unsigned ix=0;ix<n;ix++){
                float x = min_x + ix * cell_x;
                float f = 0.0f;
                for(unsigned ip=0;ip<points.size();ip++){
                    float x0 = points[ip][0];
                    float y0 = points[ip][1];
                    float z0 = points[ip][2];
                    float r0 = points[ip][3];
                    f += (r0 * r0) / ( (x - x0)*(x - x0) + (y - y0)*(y - y0) + (z - z0)*(z - z0));

                }
                field[maxIdx++] = f-isoLevel;
            }
        }
    }

    std::cout << maxIdx << std::endl;

    // Compute isosurface using marching cube
    MC::marching_cube(field, n, n, n, mesh);

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

    return mesh;
}

}
