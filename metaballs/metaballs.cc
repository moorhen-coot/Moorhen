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

    float min_d = std::min(min_x,min_y);
    float max_d = std::max(max_x,max_y);
    min_d = std::min(min_d,min_z);
    max_d = std::max(max_d,max_z);

    std::cout << min_d << " " << max_d << std::endl;

    float cell_x = (max_d - min_d) / n;
    float cell_y = (max_d - min_d) / n;
    float cell_z = (max_d - min_d) / n;

    std::cout << "n" << " " << "cell_x" << " " << "cell_y" << " " << "cell_z" << std::endl;
    std::cout << n << " " << cell_x << " " << cell_y << " " << cell_z << std::endl;

    auto t_min_max = std::chrono::high_resolution_clock::now();

    // First compute a scalar field
    std::vector<MC::MC_FLOAT> field(n * n * n);

    unsigned np = points.size();

    float mIsoLevel = -isoLevel;
    std::fill(field.begin(), field.end(), mIsoLevel);
    auto t_field_fill = std::chrono::high_resolution_clock::now();

    for(unsigned ip=0;ip<np;ip++){
        float x0 = points[ip][0];
        float y0 = points[ip][1];
        float z0 = points[ip][2];
        float r0 = points[ip][3];
        float rr = r0 * r0;
        for(unsigned iz=0;iz<n;iz++){
            float z = min_d + iz * cell_z;
            if(z>max_z||z<min_z) continue;
            int idx_z = iz*n*n;
            float zz = (z - z0)*(z - z0);
            for(unsigned iy=0;iy<n;iy++){
                float y = min_d + iy * cell_y;
                if(y>max_y||y<min_y) continue;
                int idx_y = iy*n;
                float yy = (y - y0)*(y - y0);
                for(unsigned ix=0;ix<n;ix++){
                    float x = min_d + ix * cell_x;
                    if(x>max_x||x<min_x) continue;
                    float xx = (x - x0)*(x - x0);
                    int newIdx = idx_z + idx_y + ix;
                    field[newIdx] += rr / (xx + yy + zz);
                }
            }
        }
    }

    auto t_field = std::chrono::high_resolution_clock::now();

    // Compute isosurface using marching cube
    MC::marching_cube(field.data(), n, n, n, mesh);

    auto t_march = std::chrono::high_resolution_clock::now();

    for(unsigned iv=0;iv<mesh.vertices.size();iv++){
        mesh.vertices[iv].x *= cell_x;
        mesh.vertices[iv].x += min_d;
        mesh.vertices[iv].y *= cell_y;
        mesh.vertices[iv].y += min_d;
        mesh.vertices[iv].z *= cell_z;
        mesh.vertices[iv].z += min_d;
        //std::cout << mesh.vertices[iv].x << " " << mesh.vertices[iv].y << " " << mesh.vertices[iv].z << std::endl;
    }
    std::cout << mesh.vertices.size() << std::endl;
    std::cout << mesh.normals.size() << std::endl;
    std::cout << mesh.indices.size() << std::endl;

    auto t_mesh = std::chrono::high_resolution_clock::now();

    //Smooth the mesh by averaging positions and normals of close vertices.
    std::vector<MC::mcVec3f> old_vertices = mesh.vertices;

    for(unsigned ii=0;ii<mesh.vertices.size();ii++){
        std::vector<int> hits;

        for(unsigned jj=ii+1;jj<mesh.vertices.size();jj++){
                if(((mesh.vertices[ii].x-mesh.vertices[jj].x)*(mesh.vertices[ii].x-mesh.vertices[jj].x)+(mesh.vertices[ii].y-mesh.vertices[jj].y)*(mesh.vertices[ii].y-mesh.vertices[jj].y)+(mesh.vertices[ii].z-mesh.vertices[jj].z)*(mesh.vertices[ii].z-mesh.vertices[jj].z))<1e-2){
                    hits.push_back(jj);
                }
        }
        if(hits.size()>0){
            float n_x = mesh.normals[ii].x;
            float n_y = mesh.normals[ii].y;
            float n_z = mesh.normals[ii].z;
            float v_x = mesh.vertices[ii].x;
            float v_y = mesh.vertices[ii].y;
            float v_z = mesh.vertices[ii].z;
            for(unsigned ih=0;ih<hits.size();ih++){
                n_x +=  mesh.normals[hits[ih]].x;
                n_y +=  mesh.normals[hits[ih]].y;
                n_z +=  mesh.normals[hits[ih]].z;
                v_x +=  mesh.vertices[hits[ih]].x;
                v_y +=  mesh.vertices[hits[ih]].y;
                v_z +=  mesh.vertices[hits[ih]].z;
            }
            mesh.normals[ii].x = n_x / (hits.size()+1);
            mesh.normals[ii].y = n_y / (hits.size()+1);
            mesh.normals[ii].z = n_z / (hits.size()+1);
            mesh.vertices[ii].x = v_x / (hits.size()+1);
            mesh.vertices[ii].y = v_y / (hits.size()+1);
            mesh.vertices[ii].z = v_z / (hits.size()+1);
            for(unsigned ih=0;ih<hits.size();ih++){
                mesh.normals[hits[ih]] = mesh.normals[ii];
                mesh.vertices[hits[ih]] = mesh.vertices[ii];
            }
        }
    }

    auto t_smooth = std::chrono::high_resolution_clock::now();

    // Deal with cases where winding has changed because of vertex smoothing.
    std::vector<unsigned> new_indices;
    for(unsigned ii=0;ii<mesh.indices.size();ii+=3){
        int idx1 = mesh.indices[ii];
        int idx2 = mesh.indices[ii+1];
        int idx3 = mesh.indices[ii+2];
        MC::mcVec3f v1 = mesh.vertices[idx1];
        MC::mcVec3f v2 = mesh.vertices[idx2];
        MC::mcVec3f v3 = mesh.vertices[idx3];
        MC::mcVec3f o_v1 = old_vertices[idx1];
        MC::mcVec3f o_v2 = old_vertices[idx2];
        MC::mcVec3f o_v3 = old_vertices[idx3];
        MC::mcVec3f n1 = MC::mc_internalCross(MC::mc_internalNormalize(v2-v1),MC::mc_internalNormalize(v3-v1));
        MC::mcVec3f o_n1 = MC::mc_internalCross(MC::mc_internalNormalize(o_v2-o_v1),MC::mc_internalNormalize(o_v3-o_v1));
        MC::mcVec3f n2 = MC::mc_internalCross(MC::mc_internalNormalize(v3-v2),MC::mc_internalNormalize(v1-v2));
        MC::mcVec3f o_n2 = MC::mc_internalCross(MC::mc_internalNormalize(o_v3-o_v2),MC::mc_internalNormalize(o_v1-o_v2));
        MC::mcVec3f n3 = MC::mc_internalCross(MC::mc_internalNormalize(v2-v3),MC::mc_internalNormalize(v1-v3));
        MC::mcVec3f o_n3 = MC::mc_internalCross(MC::mc_internalNormalize(o_v2-o_v3),MC::mc_internalNormalize(o_v1-o_v3));
        float d1 = n1.x * o_n1.x + n1.y * o_n1.y + n1.z * o_n1.z;
        float d2 = n2.x * o_n2.x + n2.y * o_n2.y + n2.z * o_n2.z;
        float d3 = n3.x * o_n3.x + n3.y * o_n3.y + n3.z * o_n3.z;
        int iflip = 0;
        if(d1<0.0) iflip++;
        if(d2<0.0) iflip++;
        if(d3<0.0) iflip++;
        if(iflip%2==1){
            new_indices.push_back(idx1);
            new_indices.push_back(idx3);
            new_indices.push_back(idx2);
        } else {
            new_indices.push_back(idx1);
            new_indices.push_back(idx2);
            new_indices.push_back(idx3);
        }
    }
    mesh.indices = new_indices;

    auto t_rewind = std::chrono::high_resolution_clock::now();

    std::cout << "Time to get min max " << std::chrono::duration_cast<std::chrono::microseconds>(t_min_max-t_start).count() << std::endl;
    std::cout << "Time to initialize field " << std::chrono::duration_cast<std::chrono::microseconds>(t_field_fill-t_min_max).count() << std::endl;
    std::cout << "Time to make field " << std::chrono::duration_cast<std::chrono::microseconds>(t_field-t_field_fill).count() << std::endl;
    std::cout << "Time to get surface " << std::chrono::duration_cast<std::chrono::microseconds>(t_march-t_field).count() << std::endl;
    std::cout << "Time to rebase mesh " << std::chrono::duration_cast<std::chrono::microseconds>(t_mesh-t_march).count() << std::endl;
    std::cout << "Time to smooth mesh " << std::chrono::duration_cast<std::chrono::microseconds>(t_smooth-t_mesh).count() << std::endl;
    std::cout << "Time to fix wind errors " << std::chrono::duration_cast<std::chrono::microseconds>(t_rewind-t_smooth).count() << std::endl;

    return mesh;
}

}
