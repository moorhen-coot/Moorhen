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
#include <set>
#include <stdlib.h>
#include "Cartesian.h"
#include <vector>
#include <utility>
#include <algorithm>
#include <map>
#include <math.h>
#include <string>
#include <string.h>
#include <stdlib.h>
#include <mmdb2/mmdb_manager.h>
#include <sstream>
#include <iostream>
#include <iomanip>

#include "coot-utils/simple-mesh.hh"

#include "MC.h"
#include "metaballs.h"

coot::simple_mesh_t GenerateMoorhenMetaBalls(mmdb::Manager *molHnd, const std::string &cid_str, int gridSize) {

    coot::simple_mesh_t coot_mesh;

    coot_mesh.status = 0;

    int n = gridSize;
    float r = 0.45f;
    float isoLevel = 1.0;
    
    if(!molHnd) return coot_mesh;

    const char * cid = cid_str.c_str();
    int selHnd = molHnd->NewSelection();
    molHnd->Select(selHnd, mmdb::STYPE_ATOM, cid, mmdb::SKEY_NEW);

    mmdb::Atom** HetAtoms;
    int nHetAtoms;
    molHnd->GetSelIndex(selHnd,HetAtoms,nHetAtoms);

    if(nHetAtoms==0) return coot_mesh;

    std::vector<std::array<float,4>> points;

    //FIXME - alt locs...
    //FIXME - double
    for(int i=0;i<nHetAtoms;i++){
        if(HetAtoms[i]->Het){
            if(strncmp(HetAtoms[i]->residue->name,"HOH",3)!=0){
                std::array<float,4> point{float(HetAtoms[i]->x),float(HetAtoms[i]->y),float(HetAtoms[i]->z),r};
                points.push_back(point);
            }
        }
    }

    MC::mcMesh mesh = MoorhenMetaBalls::GenerateMeshFromPoints(points, isoLevel, n);

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
            coot_mesh.vertices.push_back(coot::api::vnc_vertex(v, n, col));
        }
    }

    return coot_mesh;

}
