 /*
   metaballs-mmdb.cc: Moorhen (WebCoot) Molecular Graphics Program
   Copyright (C) 2023 STFC

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

#ifdef _WIN32
#define NOMINMAX
#include <windows.h>
#undef AddAtom
#endif

#include <iostream>
#include <algorithm>
#include <set>
#include <stdlib.h>
#include "cartesian.h"
#include <vector>
#include <utility>
#include <map>
#include <math.h>
#include <string>
#include <string.h>
#include <stdlib.h>
#include <sstream>
#include <iostream>
#include <iomanip>

#include "coot-utils/simple-mesh.hh"
#include "coords/graphical-bonds-container.hh"
#include "api/instancing.hh"

#include "MC.h"
#include "metaballs.h"

std::pair<coot::simple_mesh_t,std::vector<std::vector<unsigned>>> GenerateMoorhenMetaBallsCootInstancedMesh(const coot::instanced_mesh_t &spheres_mesh, float gridSize, float r, float isoLevel, int n_threads) {

    coot::simple_mesh_t coot_mesh;

    std::vector<std::pair<std::array<float,4>,std::array<float,4>>> points;

    const auto geom = spheres_mesh.geom;
    for(const auto &inst : geom){
        const auto &As = inst.instancing_data_A;
        for(const auto &inst_data : As){
            const auto &instDataPosition = inst_data.position;
            const auto &instDataColour = inst_data.colour;
            const float atomMult = inst_data.size[0];
            std::array<float,4> point{instDataPosition[0],instDataPosition[1],instDataPosition[2],r*atomMult/1.7f};
            std::array<float,4> atomCol{instDataColour[0],instDataColour[1],instDataColour[2],instDataColour[3]};
            std::pair<std::array<float,4>,std::array<float,4>> point_col;
            point_col.first = point;
            point_col.second = atomCol;
            points.push_back(point_col);
        }
    }

    moorhenMesh mesh = MoorhenMetaBalls::GenerateMeshFromPoints(points, isoLevel, gridSize, n_threads);

    //FIXME - colours.
    glm::vec4 col = glm::vec4(0.6f, 0.6f, 0.2f, 1.0f);

    if(mesh.vertices.size()>0&&mesh.normals.size()==mesh.vertices.size()&&mesh.indices.size()>0){
        coot_mesh.status = 1;
        coot_mesh.name = "Metaballs";
        for(unsigned ii=0;ii<mesh.indices.size();ii+=3){
            coot_mesh.triangles.push_back(g_triangle(mesh.indices[ii],mesh.indices[ii+1],mesh.indices[ii+2]));
        }
        std::vector<coot::api::vnc_vertex> vertices;
        for(unsigned iv=0;iv<mesh.vertices.size();iv++){
            glm::vec3 v(mesh.vertices[iv].x,mesh.vertices[iv].y,mesh.vertices[iv].z);
            glm::vec3 n(mesh.normals[iv].x,mesh.normals[iv].y,mesh.normals[iv].z);
            col[0] = mesh.colors[iv][0];
            col[1] = mesh.colors[iv][1];
            col[2] = mesh.colors[iv][2];
            col[3] = mesh.colors[iv][3];
            coot_mesh.vertices.push_back(coot::api::vnc_vertex(v, n, col));
        }
    }

    std::pair<coot::simple_mesh_t,std::vector<std::vector<unsigned>>> retval;
    retval.first = coot_mesh;
    retval.second = mesh.point_triangles;
    return retval;

}
