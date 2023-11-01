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

void mergeLastTwoGroupsIfNecessary(std::vector<std::vector<std::array<float,4>>> &all_points){

    std::vector<std::array<float,4>> last   = all_points[all_points.size()-1];
    std::vector<std::array<float,4>> &penult = all_points[all_points.size()-2];

    bool connected = false;

    for(unsigned ii=0;ii<last.size();ii++){
        std::array<float,4> &pl = last[ii];
        for(unsigned jj=0;jj<penult.size();jj++){
            std::array<float,4> &pp = penult[jj];
            float distsq = (pl[0]-pp[0])*(pl[0]-pp[0]) + (pl[1]-pp[1])*(pl[1]-pp[1]) + (pl[2]-pp[2])*(pl[2]-pp[2]);
            if(distsq<6.7) {
                connected = true;
                break;
            }
        }
    }

    if(connected){
        //std::cout << "Merging ..." << std::endl;
        penult.insert(penult.end(),last.begin(),last.end());
        all_points.pop_back();
    }

}

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

    std::vector<std::vector<std::array<float,4>>> all_points;
    std::vector<std::array<float,4>> points;

    //TODO - double?
    //TODO - Be cleverer about box size/orientation.

    //TODO - Be more clever with no-contiguous sets of atoms, i.e. two separate ligands.
    //      - This requires making multiple grids and then combining into one big mesh.
    //      - But how do we cluster them in the first place?
    mmdb::Residue *currentResidue = 0;
    for(int i=0;i<nHetAtoms;i++){
        if(HetAtoms[i]->Het){
            if(strncmp(HetAtoms[i]->residue->name,"HOH",3)!=0){
                std::array<float,4> point{float(HetAtoms[i]->x),float(HetAtoms[i]->y),float(HetAtoms[i]->z),r};
                if(HetAtoms[i]->residue!=currentResidue){
                    //std::cout << "New residue!" << std::endl;
                    currentResidue = HetAtoms[i]->residue;
                    if(points.size()>0){
                        //std::cout << "There are " << points.size() << " points" << std::endl;
                        all_points.push_back(points);
                        points.clear();
                    }
                    if(all_points.size()>1){
                        //Compare previous 2
                        mergeLastTwoGroupsIfNecessary(all_points);
                    }
                }
                //std::cout << "Adding atom " << HetAtoms[i]->residue->name << " / " << HetAtoms[i]->name << std::endl;
                points.push_back(point);
            }
        }
    }

    //std::cout << "There are " << points.size() << " points" << std::endl;
    if(points.size()>0){
        all_points.push_back(points);
    }

    if(all_points.size()==0){
        return coot_mesh;
    }

    if(all_points.size()>1){
        //Compare last 2
        mergeLastTwoGroupsIfNecessary(all_points);
    }

    int totVert = 0;
    for(unsigned imesh=0;imesh<all_points.size();imesh++){
        MC::mcMesh mesh = MoorhenMetaBalls::GenerateMeshFromPoints(all_points[imesh], isoLevel, n);

        //FIXME - colours.
        glm::vec4 col = glm::vec4(0.6f, 0.6f, 0.2f, 1.0f);

        if(mesh.vertices.size()>0&&mesh.normals.size()==mesh.vertices.size()&&mesh.indices.size()>0){
            coot_mesh.status = 1;
            coot_mesh.name = "Metaballs";
            for(unsigned ii=0;ii<mesh.indices.size();ii+=3){
                coot_mesh.triangles.push_back(g_triangle(mesh.indices[ii]+totVert,mesh.indices[ii+1]+totVert,mesh.indices[ii+2]+totVert));
            }
            std::vector<coot::api::vnc_vertex> vertices;
            for(unsigned iv=0;iv<mesh.vertices.size();iv++){
                glm::vec3 v(mesh.vertices[iv].x,mesh.vertices[iv].y,mesh.vertices[iv].z);
                glm::vec3 n(mesh.normals[iv].x,mesh.normals[iv].y,mesh.normals[iv].z);
                coot_mesh.vertices.push_back(coot::api::vnc_vertex(v, n, col));
            }
            totVert += mesh.vertices.size();
        }
    }

    return coot_mesh;

}
