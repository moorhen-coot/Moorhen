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
#include <mmdb2/mmdb_manager.h>
#include <sstream>
#include <iostream>
#include <iomanip>

#include "coot-utils/simple-mesh.hh"
#include "coords/graphical-bonds-container.hh"

#include "MC.h"
#include "metaballs.h"

std::map<std::string,std::array<float,4>> colLookup = {
{"AC", {0.7,0.7,0.7,1.0}},
{"AG", {0.7,0.7,0.7,1.0}},
{"AL", {0.7,0.7,0.7,1.0}},
{"AM", {0.7,0.7,0.7,1.0}},
{"AR", {0.7,0.7,0.7,1.0}},
{"AS", {0.7,0.7,0.7,1.0}},
{"AT", {0.7,0.7,0.7,1.0}},
{"AU", {0.7,0.7,0.7,1.0}},
{"B", {0.7,0.7,0.7,1.0}},
{"BA", {0.7,0.7,0.7,1.0}},
{"BE", {0.7,0.7,0.7,1.0}},
{"BH", {0.7,0.7,0.7,1.0}},//UNK
{"BI", {0.7,0.7,0.7,1.0}},
{"BK", {0.7,0.7,0.7,1.0}},//UNK
{"BR", {0.7,0.7,0.7,1.0}},
{"C", {0.2,0.2,0.2,1.0}},
{"CA", {0.7,0.7,0.7,1.0}},
{"CD", {0.7,0.7,0.7,1.0}},
{"CE", {0.7,0.7,0.7,1.0}},
{"CF", {0.7,0.7,0.7,1.0}},//UNK
{"CL", {0.7,0.7,0.7,1.0}},
{"CM", {0.7,0.7,0.7,1.0}},
{"CO", {0.7,0.7,0.7,1.0}},
{"CR", {0.7,0.7,0.7,1.0}},
{"CS", {0.7,0.7,0.7,1.0}},
{"CU", {0.7,0.7,0.7,1.0}},
{"DB", {0.7,0.7,0.7,1.0}},//UNK
{"DY", {0.7,0.7,0.7,1.0}},
{"ER", {0.7,0.7,0.7,1.0}},
{"ES", {0.7,0.7,0.7,1.0}},//UNK
{"EU", {0.7,0.7,0.7,1.0}},
{"F", {0.1,0.9,0.1,1.0}},
{"FE", {0.7,0.7,0.7,1.0}},
{"FM", {0.7,0.7,0.7,1.0}},//UNK
{"FR", {0.7,0.7,0.7,1.0}},//UNK
{"GA", {0.7,0.7,0.7,1.0}},
{"GD", {0.7,0.7,0.7,1.0}},
{"GE", {0.7,0.7,0.7,1.0}},
{"H", {0.8,0.8,0.8,1.0}},
{"HE", {0.7,0.7,0.7,1.0}},
{"HF", {0.7,0.7,0.7,1.0}},
{"HG", {0.7,0.7,0.7,1.0}},
{"HO", {0.7,0.7,0.7,1.0}},
{"HS", {0.7,0.7,0.7,1.0}},//UNK
{"I", {0.7,0.7,0.7,1.0}},
{"IN", {0.7,0.7,0.7,1.0}},
{"IR", {0.7,0.7,0.7,1.0}},
{"K", {0.7,0.7,0.7,1.0}},
{"KR", {0.7,0.7,0.7,1.0}},
{"LA", {0.7,0.7,0.7,1.0}},
{"LI", {0.7,0.7,0.7,1.0}},
{"LR", {0.7,0.7,0.7,1.0}},//UNK
{"LU", {0.7,0.7,0.7,1.0}},
{"MD", {0.7,0.7,0.7,1.0}},//UNK
{"MG", {0.7,0.7,0.7,1.0}},
{"MN", {0.7,0.7,0.7,1.0}},
{"MO", {0.7,0.7,0.7,1.0}},
{"MT", {0.7,0.7,0.7,1.0}},//UNK
{"N", {0.0,0.0,1.0,1.0}},
{"NA", {0.7,0.7,0.7,1.0}},
{"NB", {0.7,0.7,0.7,1.0}},
{"ND", {0.7,0.7,0.7,1.0}},
{"ND", {0.7,0.7,0.7,1.0}},
{"NE", {0.7,0.7,0.7,1.0}},
{"NI", {0.7,0.7,0.7,1.0}},
{"NO", {0.7,0.7,0.7,1.0}},//UNK
{"NP", {0.7,0.7,0.7,1.0}},
{"O", {1.0,0.0,0.0,1.0}},
{"OSE", {0.7,0.7,0.7,1.0}},
{"P", {1.0,0.0,1.0,1.0}},
{"PA", {0.7,0.7,0.7,1.0}},
{"PB", {0.7,0.7,0.7,1.0}},
{"PD", {0.7,0.7,0.7,1.0}},
{"PM", {0.7,0.7,0.7,1.0}},//UNK
{"PO", {0.7,0.7,0.7,1.0}},
{"PR", {0.7,0.7,0.7,1.0}},
{"PT", {0.7,0.7,0.7,1.0}},
{"PU", {0.7,0.7,0.7,1.0}},
{"PU", {0.7,0.7,0.7,1.0}},
{"RA", {0.7,0.7,0.7,1.0}},
{"RB", {0.7,0.7,0.7,1.0}},
{"RB", {0.7,0.7,0.7,1.0}},
{"RB", {0.7,0.7,0.7,1.0}},
{"RE", {0.7,0.7,0.7,1.0}},
{"RF", {0.7,0.7,0.7,1.0}},//UNK
{"RH", {0.7,0.7,0.7,1.0}},
{"RN", {0.7,0.7,0.7,1.0}},
{"RU", {0.7,0.7,0.7,1.0}},
{"S", {1.0,1.0,0.0,1.0}},
{"SB", {0.7,0.7,0.7,1.0}},
{"SC", {0.7,0.7,0.7,1.0}},
{"SE", {0.7,0.7,0.7,1.0}},
{"SG", {0.7,0.7,0.7,1.0}},//UNK
{"SI", {0.7,0.7,0.7,1.0}},
{"SM", {0.7,0.7,0.7,1.0}},
{"SN", {0.7,0.7,0.7,1.0}},
{"SR", {0.7,0.7,0.7,1.0}},
{"TA", {0.7,0.7,0.7,1.0}},
{"TB", {0.7,0.7,0.7,1.0}},
{"TC", {0.7,0.7,0.7,1.0}},
{"TE", {0.7,0.7,0.7,1.0}},
{"TH", {0.7,0.7,0.7,1.0}},
{"TI", {0.7,0.7,0.7,1.0}},
{"TL", {0.7,0.7,0.7,1.0}},
{"TM", {0.7,0.7,0.7,1.0}},
{"U", {0.7,0.7,0.7,1.0}},
{"V", {0.7,0.7,0.7,1.0}},
{"W", {0.7,0.7,0.7,1.0}},
{"XE", {0.7,0.7,0.7,1.0}},
{"Y", {0.7,0.7,0.7,1.0}},
{"YB", {0.7,0.7,0.7,1.0}},
{"ZN", {0.7,0.7,0.7,1.0}},
{"ZR", {0.7,0.7,0.7,1.0}},
};

std::map<std::string,float> multLookup = { 
{"AC", 1.95},
{"AG", 1.72},
{"AL", 1.25},
{"AM", 1.75},
{"AR", 1.88},
{"AS", 1.85},
{"AT", 1.80},
{"AU", 1.66},
{"B", 1.9},
{"BA", 2.53},
{"BE", 1.12},
{"BH", 2.0},//UNK
{"BI", 1.8},
{"BK", 2.0},//UNK
{"BR", 1.85},
{"C", 1.700},
{"CA", 1.94},
{"CD", 1.58},
{"CE", 1.85},
{"CF", 2.0},//UNK
{"CL", 1.75},
{"CM", 2.0},
{"CO", 1.35},
{"CR", 1.40},
{"CS", 2.98},
{"CU", 1.40},
{"DB", 2.0},//UNK
{"DY", 1.75},
{"ER", 1.75},
{"ES", 2.0},//UNK
{"EU", 1.85},
{"F", 1.47},
{"FE", 1.40},
{"FM", 2.0},//UNK
{"FR", 2.0},//UNK
{"GA", 1.87},
{"GD", 1.80},
{"GE", 2.10},
{"H", 1.200},
{"HE", 1.40},
{"HF", 1.55},
{"HG", 1.55},
{"HO", 1.75},
{"HS", 2.0},//UNK
{"I", 1.98},
{"IN", 1.93},
{"IR", 1.35},
{"K", 2.75},
{"KR", 2.02},
{"LA", 1.95},
{"LI", 1.82},
{"LR", 2.0},//UNK
{"LU", 1.75},
{"MD", 2.0},//UNK
{"MG", 1.73},
{"MN", 1.40},
{"MO", 1.45},
{"MT", 2.0},//UNK
{"N", 1.550},
{"NA", 2.27},
{"NB", 1.45},
{"ND", 1.85},
{"ND", 1.85},
{"NE", 1.54},
{"NI", 1.63},
{"NO", 2.0},//UNK
{"NP", 1.75},
{"O", 1.520},
{"OSE", 1.30},
{"P", 1.800},
{"PA", 1.80},
{"PB", 2.02},
{"PD", 1.63},
{"PM", 2.0},//UNK
{"PO", 2.0},
{"PR", 1.85},
{"PT", 1.75},
{"PU", 1.75},
{"PU", 1.75},
{"RA", 2.15},
{"RB", 2.00},
{"RB", 2.00},
{"RB", 2.00},
{"RE", 1.35},
{"RF", 2.0},//UNK
{"RH", 1.35},
{"RN", 2.20},
{"RU", 1.30},
{"S", 1.800},
{"SB", 1.8},
{"SC", 1.60},
{"SE", 1.90},
{"SG", 2.0},//UNK
{"SI", 2.10},
{"SM", 1.85},
{"SN", 2.17},
{"SR", 2.19},
{"TA", 1.45},
{"TB", 1.75},
{"TC", 1.35},
{"TE", 2.06},
{"TH", 1.80},
{"TI", 1.40},
{"TL", 1.96},
{"TM", 1.75},
{"U", 1.86},
{"V", 1.35},
{"W", 1.35},
{"XE", 2.16},
{"Y", 1.80},
{"YB", 1.75},
{"ZN", 1.39},
{"ZR", 1.55},
};

// trim from start (in place)
static inline void ltrim(std::string &s) {
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) {
        return !std::isspace(ch);
    }));
}

// trim from end (in place)
static inline void rtrim(std::string &s) {
    s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) {
        return !std::isspace(ch);
    }).base(), s.end());
}

// trim from both ends (in place)
static inline void trim(std::string &s) {
    rtrim(s);
    ltrim(s);
}

// trim from start (copying)
static inline std::string ltrim_copy(std::string s) {
    ltrim(s);
    return s;
}

// trim from end (copying)
static inline std::string rtrim_copy(std::string s) {
    rtrim(s);
    return s;
}

// trim from both ends (copying)
static inline std::string trim_copy(std::string s) {
    trim(s);
    return s;
}

void mergeLastTwoGroupsIfNecessary(std::vector<std::vector<std::pair<std::array<float,4>,std::array<float,4>>>> &all_points){

    std::vector<std::pair<std::array<float,4>,std::array<float,4>>> last   = all_points[all_points.size()-1];
    std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &penult = all_points[all_points.size()-2];

    bool connected = false;

    for(unsigned ii=0;ii<last.size();ii++){
        std::array<float,4> &pl = last[ii].first;
        for(unsigned jj=0;jj<penult.size();jj++){
            std::array<float,4> &pp = penult[jj].first;
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

coot::simple_mesh_t GenerateMoorhenMetaBalls(mmdb::Manager *molHnd, const std::string &cid_str, float gridSize, float r, float isoLevel) {

    coot::simple_mesh_t coot_mesh;

    coot_mesh.status = 0;

    if(!molHnd) return coot_mesh;

    const char * cid = cid_str.c_str();
    int selHnd = molHnd->NewSelection();
    molHnd->Select(selHnd, mmdb::STYPE_ATOM, cid, mmdb::SKEY_NEW);

    mmdb::Atom** HetAtoms;
    int nHetAtoms;
    molHnd->GetSelIndex(selHnd,HetAtoms,nHetAtoms);

    if(nHetAtoms==0) return coot_mesh;

    std::vector<std::vector<std::pair<std::array<float,4>,std::array<float,4>>>> all_points;
    std::vector<std::pair<std::array<float,4>,std::array<float,4>>> points;

    mmdb::Residue *currentResidue = 0;
    for(int i=0;i<nHetAtoms;i++){
        if(true||HetAtoms[i]->Het){
            std::string element = std::string(HetAtoms[i]->element);
            trim(element);
            std::transform(element.begin(), element.end(), element.begin(), ::toupper);
            float atomMult = multLookup[element];
            if(strncmp(HetAtoms[i]->residue->name,"HOH",3)!=0){
                //std::cout << element << " " << atomMult << std::endl;
                std::array<float,4> point{float(HetAtoms[i]->x),float(HetAtoms[i]->y),float(HetAtoms[i]->z),r*atomMult/1.7f};
                std::array<float,4> atomCol = colLookup[element];
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
                std::pair<std::array<float,4>,std::array<float,4>> point_col;
                point_col.first = point;
                point_col.second = atomCol;
                points.push_back(point_col);
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
        moorhenMesh mesh = MoorhenMetaBalls::GenerateMeshFromPoints(all_points[imesh], isoLevel, gridSize);

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
                col[0] = mesh.colors[iv][0];
                col[1] = mesh.colors[iv][1];
                col[2] = mesh.colors[iv][2];
                col[3] = 1.0;
                coot_mesh.vertices.push_back(coot::api::vnc_vertex(v, n, col));
            }
            totVert += mesh.vertices.size();
        }
    }

    return coot_mesh;

}
