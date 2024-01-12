/*
     pygl/mapview/headers.cc: CCP4MG Molecular Graphics Program
     Copyright (C) 2001-2008 University of York, CCLRC
     Copyright (C) 2012 STFC

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

#include "headers.h"
#include <iostream>
#include <string.h>

#if defined (_WIN32)
#define NOMINMAX
#include <windows.h>
#undef AddAtom
#endif
#if defined (sgi)
#include <time.h>
#endif

header_info::header_info(char *filename){
  clipper::HKL_info myhkl; 
  clipper::CCP4MTZfile f;

  try {
    f.open_read(filename);

    f.import_hkl_info(myhkl);
    cols = f.column_labels();
    paths = f.column_paths();

    f.close_read();
  } catch (...) {
    std::cerr << "Error reading MTZ data from file " << filename << "\n";
  }
}

int header_info::GetNumberCols(const std::string &label){
  //std::cout << " in routine " << "GetNumberCols "<< std::endl;
  int num = 0;
  for(unsigned i=0;i<paths.size();i++){
    unsigned last_dot = paths[i].rfind(' ')+1;
    clipper::String sub = paths[i].substr(last_dot);
    if(sub==label)
      num++;
  }
  return num;
}


int header_info::GetNumberFCols(){
  //std::cout << " in routine " << "GetNumberFCols "<< std::endl;
  return GetNumberCols("F");
}

int header_info::GetNumberPhiCols(){
  //std::cout << " in routine " << "GetNumberPhiCols "<< std::endl;
  return GetNumberCols("PHI");
}

int header_info::GetNumberWCols(){
  //std::cout << " in routine " << "GetNumberWCols "<< std::endl;
  return GetNumberCols("W");
}

char* header_info::GetColLabel(const std::string &label,int j){
  //std::cout << " in routine " << "GetColLabel "<< std::endl;
  int num = -1;
  for(unsigned i=0;i<paths.size()&&num!=j;i++){
    unsigned last_dot = paths[i].rfind(' ')+1;
    clipper::String sub = paths[i].substr(last_dot);
    if(sub==label)
      num = j;
  }
  char *result = new char[strlen(cols[num].c_str())+1];
  strcpy(result, cols[num].c_str());
  return result;
}

char* header_info::GetFColLabel(int i){
  //std::cout << " in routine " << "GetFColLabel "<< std::endl;
  return GetColLabel("F",i);
}

char* header_info::GetPhiColLabel(int i){
  //std::cout << " in routine " << "GetPhiColLabel "<< std::endl;
  return GetColLabel("PHI",i);
}

char* header_info::GetWColLabel(int i){
  //std::cout << " in routine " << "GetWColLabel "<< std::endl;
  return GetColLabel("W",i);
}

char** header_info::GetColLabels(const std::string &label){
  //std::cout << " in routine " << "GetColLabels "<< std::endl;
  int ncols = GetNumberCols(label);
  char **ret = new char*[ncols];
  for(int i=0;i<ncols;i++){
    char *lab = GetColLabel(label,i);
    ret[i] = new char[strlen(lab)+1];
    strcpy(ret[i],lab);
  }
  return ret;
}

char**header_info::GetFColLabels(){
  //std::cout << " in routine " << "GetFColLabels "<< std::endl;
  return GetColLabels("F");
}

char**header_info::GetPhiColLabels(){
  //std::cout << " in routine " << "GetPhiColLabels "<< std::endl;
  return GetColLabels("PHI");
}

char**header_info::GetWColLabels(){
  //std::cout << " in routine " << "GetWColLabels "<< std::endl;
  return GetColLabels("W");
}

std::vector<std::string> header_info::GetColTypes(){
  //std::cout << " in routine " << "GetColTypes "<< std::endl;
  std::vector<std::string> *result = new std::vector<std::string>(0);
  for (unsigned i=0; i<paths.size(); i++){
    unsigned last_dot = paths[i].rfind(' ')+1;
    clipper::String sub = paths[i].substr(last_dot);
    result->push_back( sub );
  }
  return *result;
}

std::vector<std::vector<std::string> > header_info::GetUnsortedHeadersAndTypes(){
  //std::cout << " in routine " << "GetUnsortedHeadersAndTypes "<< std::endl;
  std::vector<std::vector<std::string> > *result = new std::vector<std::vector<std::string> >(0);
  for (unsigned i=0; i<paths.size(); i++){
    std::vector<std::string> headerAndType(0);

    unsigned last_space = paths[i].rfind(' ')+1;
    clipper::String sub = paths[i].substr(last_space);
    headerAndType.push_back(sub);

    unsigned last_slash = paths[i].rfind('/')+1;
    last_space = paths[i].rfind(' ');
    sub = paths[i].substr(last_slash, last_space-last_slash);

    headerAndType.push_back(sub);

    result->push_back(headerAndType);
  }
  return *result;
}

