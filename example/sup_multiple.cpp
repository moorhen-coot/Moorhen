// $Id: sup_multiple.cpp $
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
//  **** Module  :  SUP_Multiple <implementation>
//       ~~~~~~~~~
//  **** Project :  SUPERPOSE
//       ~~~~~~~~~
//  **** Functions:  multiple_superposition
//       ~~~~~~~~~~
//
//  E. Krissinel, 2003-2013
//
// =================================================================
//

#include <string.h>

#include "sup_multiple.h"
#include "sup_pairwise.h"
#include "ssm/ssm_malign.h"
#include "ssm/ssm_align.h"


void print_matrix ( mmdb::cpstr name, mmdb::rmatrix m,
                    mmdb::cpstr fmt, ssm::PPGraph G,
                    int nStructures )  {
char S[100];
int  i,j,n,k;

  printf ( "\n   " );
  for (i=0;i<(int)strlen(name);i++)
    printf ( "_" );
  printf ( "\n"
           "   %s\n\n",name );

  k = strlen(G[0]->GetGraphName());
  n = k + 2;
  for (i=0;i<nStructures;i++)
    for (j=0;j<nStructures;j++)  {
      sprintf ( S,fmt,m[i][j] );
      n = mmdb::IMax ( n,strlen(S) );
    }

  printf ( "      " );
  for (i=0;i<k;i++)
    printf ( " " );
  n -= k;
  for (i=0;i<nStructures;i++)  {
    for (j=0;j<n;j++)
      printf ( " " );
    printf ( " %s ",G[i]->GetGraphName() );
  }
  printf ( "\n" );

  printf ( "      " );
  for (i=0;i<k-1;i++)
    printf ( " " );
  printf ( "." );
  for (i=0;i<nStructures;i++)  {
    for (j=0;j<n+k+2;j++)
      printf ( "-" );
  }
  printf ( "\n" );

  for (i=0;i<nStructures;i++)  {
    printf ( "     %s| ",G[i]->GetGraphName() );
    for (j=0;j<nStructures;j++)  {
      sprintf ( S,fmt,m[i][j] );
      printf  ( " %s",S );
      for (k=0;k<n;k++)
        printf ( " " );
    }
    printf ( "\n" );
  }


}

int multiple_superposition ( mmdb::PPManager M,
                             mmdb::psvector  selstring,
                             mmdb::psvector  name,
                             mmdb::ivector   selHnd,
                             int             nStructures,
                             mmdb::pstr      fileout  )  {
mmdb::io::File  f;
ssm::PMultAlign multAlign;
ssm::PPGraph    G;
mmdb::rmatrix   m_rmsd,m_Qscore,m_seqId;
mmdb::rvector   cons_x,cons_y,cons_z;
mmdb::mat44     T;
mmdb::realtype  rmsd,Qscore;
int             i,j,nc,n_align,n_SSEs,cons_len,rc;

  printf ( "\n Performing Multiple Structure Alignment"
           "\n ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n" );

  multAlign = NULL;
  rc        = ssm::MALIGN_Ok;

  G  = new ssm::PGraph[nStructures];
  nc = 0;
  for (i=0;i<nStructures;i++)  {
    G[i] = NULL;
    nc   = mmdb::IMax ( nc,strlen(name[i])+strlen(selstring[i]) );
  }

  for (i=0;(i<nStructures) && (rc==ssm::MALIGN_Ok);i++)  {
    G[i] = ssm::GetSSGraph ( M[i],selHnd[i],rc );
    if ((rc!=ssm::MALIGN_Ok) || (!G[i]))
      rc = ssm::MALIGN_NoGraph + i;
  }

  if (rc==ssm::MALIGN_Ok)  {

    multAlign = new ssm::MultAlign();
    rc = multAlign->align ( M,selstring,G,nStructures );

    if (rc==ssm::MALIGN_Ok)  {

#ifdef _ccp4_
      printf ( "$TEXT:Alignment results: $$ $$\n" );
#endif

      printf ( " Structures\n\n"
               "    Ref. |  Nres  | File (selection)\n"
               "   ------+--------+-----" );
      for (i=0;i<nc;i++)
        printf ( "-" );
      printf ( "\n" );
      for (i=0;i<nStructures;i++)
        printf ( "    %4s | %5i  | %s (%s)\n",
                 G[i]->GetGraphName(),multAlign->getNres(i),
                 name[i],selstring[i] );
      printf ( "\n have been aligned and superposed.\n\n" );

      printf ( "\n"
        " ===== Superposition matrices:\n" );

      for (i=0;i<nStructures;i++)  {

        multAlign->getTMatrix ( T,i );

        printf ( "\n"
                 "   ____________________________" );
        for (j=0;j<nc;j++)  printf ( "_" );
        printf ( "\n"
                 "   (o) For structure %s [%s(%s)]:\n\n"
                 "        Rx         Ry         Rz           T\n"
                 " %10.3f %10.3f %10.3f   %10.3f\n"
                 " %10.3f %10.3f %10.3f   %10.3f\n"
                 " %10.3f %10.3f %10.3f   %10.3f\n",
                 G[i]->GetGraphName(),name[i],selstring[i],
                 T[0][0],T[0][1],T[0][2],T[0][3],
                 T[1][0],T[1][1],T[1][2],T[1][3],
                 T[2][0],T[2][1],T[2][2],T[2][3] );

        for (j=0;j<nStructures;j++)
          printFracAnalysis ( T,G[j]->GetGraphName(),M[j] );

      }


      multAlign->getAlignScores ( n_align,n_SSEs,rmsd,Qscore );

      printf ( "\n"
        " ===== Scores achieved:\n"
        "\n"
         "   quality Q:  %-7.4f (normalised to [0...1])\n"
         "     r.m.s.d:  %-7.4f (A)\n"
         "      Nalign:  %-6i  (residues)\n"
         "        Nsse:  %-6i  (SSEs)\n",
         Qscore,rmsd,n_align,n_SSEs );


      multAlign->getConsensusScores ( cons_x,cons_y,cons_z,cons_len,
                                      m_rmsd,m_Qscore,m_seqId );

      print_matrix (
         "(o) pairwise Q-scores (consensus Q-score on diagonal):",
         m_Qscore,"%5.3f",G,nStructures );
      print_matrix (
         "(o) pairwise r.m.s.d. (consensus r.m.s.d. on diagonal):",
         m_rmsd,"%5.3f",G,nStructures );
      print_matrix (
         "(o) pairwise seq. Id:",m_seqId,
         "%5.3f",G,nStructures );

      if (fileout)
        multAlign->WriteSuperposed ( fileout );

      f.assign ( "stdout" );
      f.rewrite();


#ifdef _ccp4_
      f.Write ( "$$\n\n" );
      f.Write ( "$TEXT:Secondary Structure alignment: $$ $$\n\n" );
#else
      f.Write ( "\n\n"
                " ===== Secondary Structure alignment:\n\n" );
#endif
      multAlign->WriteMatchedSSEs ( f );

#ifdef _ccp4_
      f.Write ( "$$\n\n" );
      f.Write ( "$TEXT:Residue alignment: $$ $$\n\n" );
#else

      f.Write ( "\n\n"
                " ===== Residue alignment:\n\n" );
#endif
      multAlign->WriteMultAlign   ( f );

#ifdef _ccp4_
      f.Write ( "$$\n" );
#endif
      f.shut();

    }

  }

  if (rc!=ssm::MALIGN_Ok)  {

#ifdef _ccp4_
    printf ( "$TEXT:Warning: $$Superposition was not achieved$$\n" );
#endif

    switch (rc)  {

      case ssm::MALIGN_BadInput :
              printf ( " *** Bad input (program error?).\n" );
            break;

      case ssm::MALIGN_NoStructure :
              printf ( " *** NULL structure (program error?).\n" );
            break;

      case ssm::MALIGN_NoAlignment :
              printf ( " *** multiple alignment was not achieved.\n" );
            break;

      default :  if (rc>=ssm::MALIGN_NoGraph)
              printf ( " *** can't make graph for %s.\n",
                           name[rc-ssm::MALIGN_NoGraph] );
                 else
              printf ( " *** unknown return code (%i).\n",rc );

    }

  }


  if (multAlign)  delete multAlign;
  ssm::DisposeGraphs ( G,nStructures );

  return rc;

}

