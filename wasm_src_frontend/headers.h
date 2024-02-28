/*
     pygl/mapview/headers.h: CCP4MG Molecular Graphics Program
     Copyright (C) 2001-2004 University of York, CCLRC

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

#ifndef _CCP4MG_MAP_HEADERS_
#define _CCP4MG_MAP_HEADERS_
#include <clipper/clipper.h>
#include <clipper/ccp4/ccp4_mtz_io.h>
#include <map>
#include <string>
#include <vector>

class header_info{
  std::vector< clipper::String > cols;
  std::vector< clipper::String > paths;
 public:
  header_info(char *filename);
   int GetNumberCols(const std::string &label);
   int GetNumberFCols();
   int GetNumberPhiCols();
   int GetNumberWCols();
   char* GetColLabel(const std::string &label,int i);
   char* GetFColLabel(int i);
   char* GetPhiColLabel(int i);
   char* GetWColLabel(int i);
   char** GetColLabels(const std::string &label);
   char** GetFColLabels();
   char** GetPhiColLabels();
   char** GetWColLabels();
   std::vector<std::string> GetColTypes();
   std::vector<std::vector<std::string> > GetUnsortedHeadersAndTypes();
};

#endif
