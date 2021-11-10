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
//  **** Functions: readCoorFile 
//                  selectAtoms
//       ~~~~~~~~~~ 
//
//  E. Krissinel, 2003-2013
//
// =================================================================
//

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

#ifdef _emulate_ccp4_

#define _ccp4_

#endif

int  readCoorFile ( mmdb::pstr FName, mmdb::RPManager MMDB )  {
char              S[500];
int               lcount;
mmdb::ERROR_CODE  rc;

  if (!MMDB)  MMDB = new mmdb::Manager();

  MMDB->SetFlag ( mmdb::MMDBF_PrintCIFWarnings       |
                  mmdb::MMDBF_IgnoreNonCoorPDBErrors |
                  mmdb::MMDBF_IgnoreDuplSeqNum );

  rc = MMDB->ReadCoorFile ( FName );
  MMDB->PDBCleanup ( mmdb::PDBCLEAN_ELEMENT_STRONG );

  if (rc) {
    printf ( " ***** ERROR #%i READ:\n\n %s\n\n",
             rc,mmdb::GetErrorDescription(rc) );
    MMDB->GetInputBuffer ( S,lcount );
    if (lcount>=0)
      printf ( "       LINE #%i:\n%s\n\n",lcount,S );
    else if (lcount==-1)
      printf ( "       CIF ITEM: %s\n\n",S );
    delete MMDB;
    MMDB = NULL;
    return 1;
  } else  {
    switch (MMDB->GetFileType())  {
      case mmdb::MMDB_FILE_PDB    : printf ( " PDB"         );  break;
      case mmdb::MMDB_FILE_CIF    : printf ( " mmCIF"       );  break;
      case mmdb::MMDB_FILE_Binary : printf ( " MMDB binary" );  break;
      default : printf ( " Unknown (report as a bug!)" );
    }
    printf ( " file %s has been read in.\n",FName );
  }

  return 0;

}

int selectAtoms ( mmdb::PManager M, char ** argv, int & argNo,
                  mmdb::pstr & sel, int & selHnd )  {
int  nSel;

  selHnd = 0;
  sel    = NULL;

  if (!strcasecmp(argv[argNo],"-s"))  {
    argNo++;
    mmdb::CreateCopy ( sel,argv[argNo] );
    if (!strcmp(sel,"-all"))
      mmdb::CreateCopy ( sel,"*" );
    selHnd = M->NewSelection();
    M->Select ( selHnd,mmdb::STYPE_ATOM,sel,mmdb::SKEY_NEW );
    nSel = M->GetSelLength ( selHnd );
    if (nSel<=0)  {
      printf ( " *** Selection string '%s' does not cover "
               "any atoms.\n",argv[argNo] );
      return 1;
    }
    printf ( " ... %i atoms selected using CID '%s'\n",
             nSel,argv[argNo] );
    argNo++;
  } else
    mmdb::CreateCopy ( sel,"*" );

  return 0;

}


