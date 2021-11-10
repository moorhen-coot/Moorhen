// $Id: superpose.cpp $
//  =================================================================
//
//   SUPERPOSE: Protein structure superposition based on SSM
//   algorithm. Please cite:
//
//   For pairwise alignment:
//     E. Krissinel & K. Henrick (2004) Acta Cryst. D60, 2256-2268.
//
//   For multiple alignment:
//     Krissinel, E. and Henrick, K.
//     Multiple Alignment of Protein Structures in Three Dimensions.
//     Computational Life Sciences, First International Symposium,
//     CompLife 2005, Konstanz, Germany, September 25-27, 2005, 67-78.
//     Proceedings Editors: Michael R. Berthold, Robert C. Glen,
//     Kay Diederichs, Oliver Kohlbacher, Ingrid Fischer.
//     ISBN: 978-3-540-29104-6 (Print) 978-3-540-31726-5
//
//   Copyright (C) Eugene Krissinel 2002-2013.
//
//   This library is free software: you can redistribute it and/or
//   modify it under the terms of the GNU Lesser General Public
//   License version 3, modified in accordance with the provisions
//   of the license to address the requirements of UK law.
//
//   You should have received a copy of the modified GNU Lesser
//   General Public License along with this library. If not, copies
//   may be downloaded from http://www.ccp4.ac.uk/ccp4license.php
//
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU Lesser General Public License for more details.
//
// =================================================================
//
//    18.09.13   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  ----------------------------------------------------------------
//
//  **** Module  :  Superpose <implementation>
//       ~~~~~~~~~
//  **** Project :  SUPERPOSE
//       ~~~~~~~~~
//  **** Functions:  main
//       ~~~~~~~~~~  printInstructions
//
//  E. Krissinel, 2003-2013
//
// =================================================================
//

#include <vector>
#include <string>

#include <string.h>

#include "ssm/ssm_align.h"
#include "sup_pairwise.h"
#include "sup_multiple.h"
#include "sup_defs.h"

#ifdef _ccp4_

#include "ccp4/ccp4_parser.h"
#include "ccp4/ccp4_general.h"
#include "ccp4/ccp4_program.h"

using namespace CCP4;

#endif

#include <emscripten.h>

#ifdef _emulate_ccp4_

void ccp4ProgramName ( cpstr ) {}

void ccp4_banner() {
printf (
"<B><FONT COLOR=\"#FF0000\"><!--SUMMARY_BEGIN-->\n"
"<html> <!-- CCP4 HTML LOGFILE -->\n"
"<hr>\n"
"<!--SUMMARY_END--></FONT></B>\n"
"<B><FONT COLOR=\"#FF0000\"><!--SUMMARY_BEGIN-->\n"
"<pre>\n"
"\n"
" ###############################################################\n"
" ###############################################################\n"
" ###############################################################\n"
" ### CCP4 6.3: SUPERPOSE                version 6.3 :         ##\n"
" ###############################################################\n"
" User: Eugene  Run date: 21/10/2012 Run time: 06:53:30 \n"
"\n"
"\n"
" Please reference: Collaborative Computational Project, Number 4. 1994.\n"
" \"The CCP4 Suite: Programs for Protein Crystallography\". Acta Cryst. D50, 760-763.\n"
" as well as any specific reference in the program write-up.\n"
"\n"
"<!--SUMMARY_END--></FONT></B>\n"
"\n" );
}

void ccperror ( int, cpstr ) {}

#define _ccp4_

#endif

int readCoorFile ( mmdb::pstr FName, mmdb::RPManager MMDB );
int selectAtoms ( mmdb::PManager M, char ** argv, int & argNo,
                  mmdb::pstr & sel, int & selHnd );

void printInstructions ( char *argv0 )  {

  printf (
    "\n"
#ifdef _ccp4_
    "$TEXT:Warning: $$ Wrong or no input $$\n"
#endif
    " Protein Structure Superposition\n"
    " -------------------------------\n"
    " v." superpose_version " from " superpose_date " built with SSM v.%i.%i.%i, "
    "MMDB v.%i.%i.%i\n"
    "\n"
    " USAGE:\n"
    "\n"
    " %s q.pdb [-s CIDQ] t1.pdb [-s CID1] ... tN.pdb [-s CIDN] [-o foo_out.pdb]\n"
    "\n"
    " where  q.pdb  is the Query structure to which transformation applied,\n"
    "        ti.pdb is the ith fixed Target structure,\n"
    "        [-s CIDi] are optional selection strings in MMDB convention, and\n"
    "        [-o foo_out.pdb] is optional output file specification.\n"
    " If more than one target is specified, multiple structure alignment\n"
    " is calculated.\n"
    "   Instead of using asterisks '*' for selecting all atoms, '-all'\n"
    " may be used, such that\n"
    "\n"
    " %s q.pdb -s * t.pdb -s * foo_out.pdb\n"
    "\n"
    " and \n"
    "\n"
    " %s q.pdb -s -all t.pdb -s -all foo_out.pdb\n"
    "\n"
    " are equivalent.\n"
#ifdef _ccp4_
    "$$\n"
#endif
    ,ssm::MAJOR_VERSION,ssm::MINOR_VERSION,ssm::MICRO_VERSION,
     mmdb::MAJOR_VERSION,mmdb::MINOR_VERSION,mmdb::MICRO_VERSION,
     argv0,argv0,argv0
   );

}

int superpose_main(const std::vector<std::string> &files, const std::vector<std::string> &selections)  {

mmdb::PPManager M;
mmdb::psvector  name;
mmdb::psvector  selstring;
mmdb::pstr      fileout;
mmdb::ivector   selHnd;
int             argNo,i,nStructures,rc;

#ifdef _ccp4_
  ccp4ProgramName ( "SUPERPOSE" );
  ccp4_banner();
#endif

  int argc = files.size() + 1;

  if (argc<=1)  {
#ifdef _ccp4_
    printf ( "<!--SUMMARY_BEGIN-->\n" );
#endif
    const char *progName =  "web_superpose";
    printInstructions ( (char*)progName );
#ifdef _ccp4_
    printf ( "<!--SUMMARY_END-->\n" );
    ccperror ( 1,"No input" );
#endif
    return 1;
  }

  printf ( "\n"
    " Superpose v." superpose_version " from " superpose_date " "
                                        "(based on SSM algorithm)\n"
    " ---------------------------------------------------------\n\n"
   );

  mmdb::InitMatType();
  ssm::InitGraph();

  printf (
  " ================================================================\n"
         );

  M = new mmdb::PManager[argc];
  mmdb::GetVectorMemory ( name     ,argc,0 );
  mmdb::GetVectorMemory ( selstring,argc,0 );
  mmdb::GetVectorMemory ( selHnd   ,argc,0 );
  for (i=0;i<argc;i++)  {
    M        [i] = NULL;
    name     [i] = NULL;
    selstring[i] = NULL;
    selHnd   [i] = 0;
  }
  fileout     = NULL;
  nStructures = 0;

  printf("%d\n",argc);

  argNo = 1;
  rc    = 0;
  while ((argNo<argc) && (!rc))  {
      /*
    if (!strcasecmp(argv[argNo],"-o"))  {
      argNo++;
      if (argNo<argc)
        mmdb::CreateCopy ( fileout,argv[argNo++] );
    } else  {
        */
      char *fn = (char*)files[argNo-1].c_str();
      mmdb::CreateCopy ( name[nStructures],fn );
      argNo++;

      if (readCoorFile(fn ,M[nStructures]))
        rc = 3;
        /*
      else if (argNo<argc)  {
        if (selectAtoms(M[nStructures],argv,argNo,
                selstring[nStructures],selHnd[nStructures]))
          rc = 4;
      } else
        mmdb::CreateCopy ( selstring[nStructures],"*" );
        */
      nStructures++;
      /*
    }
    */
  }

  printf("%d\n",nStructures);
  if (!rc)  {

    printf (
  " ================================================================\n"
      "\n" );

#ifdef _ccp4_
    printf ( "<!--SUMMARY_END-->\n" );
#endif

    if (nStructures<2)  {
      printf ( " *** too few structures on input (%i).\n",nStructures );
#ifdef _ccp4_
      ccperror ( rc,"Wrong input" );
#endif
    } else if (nStructures==2)
      rc = pairwise_superposition ( M,name,selHnd,fileout );
    else
      rc = multiple_superposition ( M,selstring,name,selHnd,
                                    nStructures,fileout );

  }
#ifdef _ccp4_
    else  {
      printf ( "<!--SUMMARY_END-->\n" );
      ccperror ( rc,"Wrong input" );
  }
#endif

  for (i=0;i<argc;i++)  {
    if (M[i])          delete   M[i];
    if (selstring[i])  delete[] selstring[i];
    if (name[i])       delete[] name[i];
  }
  delete[] M;
  mmdb::FreeVectorMemory ( selstring,0 );
  mmdb::FreeVectorMemory ( name     ,0 );
  mmdb::FreeVectorMemory ( selHnd   ,0 );
  if (fileout)  delete[] fileout;

#ifdef _ccp4_
  if (nStructures<=2)
    printf ( "$TEXT:Reference: $$Please cite$$\n"
    " E. Krissinel and K. Henrick (2004). Secondary-structure matching (SSM),\n"
    " a new tool for fast protein structure alignment in three dimensions.\n"
    " Acta Cryst. D60, 2256-2268.\n"
    "<a href=\"http://www.ebi.ac.uk/msd-srv/ssm/papers/ssm_reprint.pdf\">"
    "PDF</a>\n$$\n" );
  else
    printf ( "$TEXT:Reference: $$Please cite$$\n"
    " E. Krissinel and K. Henrick (2005). Multiple Alignment of Protein\n"
    " Structures in Three Dimensions. In: M.R. Berthold et.al. (Eds.):\n"
    " CompLife 2005, LNBI 3695, 67-78. Springer-Verlag Berlin Heidelberg.\n"
    "<a href=\"http://www.ebi.ac.uk/msd-srv/ssm/papers/ssm-ma.pdf\">"
    "PDF</a>\n$$\n" );
  ccperror ( 0,"Normal termination" );
#else
  printf ( "\n"
  " ----------------------------------------------------------------\n"
    "\n"
    " Please cite:\n" );
  if (nStructures<=2)
    printf (
    " E. Krissinel and K. Henrick (2004). Secondary-structure matching (SSM),\n"
    " a new tool for fast protein structure alignment in three dimensions.\n"
    " Acta Cryst. D60, 2256-2268.\n\n" );
  else
    printf (
    " E. Krissinel and K. Henrick (2005). Multiple Alignment of Protein\n"
    " Structures in Three Dimensions. In: M.R. Berthold et.al. (Eds.):\n"
    " CompLife 2005, LNBI 3695, 67-78. Springer-Verlag Berlin Heidelberg.\n\n"
           );
#endif

  return 0;

}

