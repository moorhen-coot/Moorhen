// $Id: sup_pairwise.cpp $
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
//  **** Module  :  SUP_Pairwise <implementation>
//       ~~~~~~~~~
//  **** Project :  SUPERPOSE
//       ~~~~~~~~~
//  **** Functions:  pairwise_superposition
//       ~~~~~~~~~~  printFracAnalysis
//
//  E. Krissinel, 2003-2013
//
// =================================================================
//

#include <string.h>

#include "sup_pairwise.h"
#include "ssm/ssm_align.h"


void printccp4rot ( mmdb::mat44 m )  {
double w_, x_, y_, z_;
double d = 180.0/3.14159265359;
double tr = m[0][0] + m[1][1] + m[2][2] + 1.0;

  // check the diagonal
  if ( tr > 1.0e-8 ) {
    double s( sqrt(tr) );
    w_ = s * 0.5;
    s = 0.5 / s;
    x_ = s * ( m[2][1] - m[1][2] );
    y_ = s * ( m[0][2] - m[2][0] );
    z_ = s * ( m[1][0] - m[0][1] );
  } else {
    if ( m[0][0] > m[1][1] && m[0][0] > m[2][2] ) {
      double s( sqrt(1.0 + m[0][0] - m[1][1] - m[2][2] ) );
      x_ = 0.5 * s;
      if ( s != 0.0 ) s = 0.5 / s;
      w_ = s * ( m[2][1] - m[1][2] );
      y_ = s * ( m[0][1] + m[1][0] );
      z_ = s * ( m[0][2] + m[2][0] );
    } else if ( m[1][1] > m[2][2] ) {
      double s( sqrt(1.0 + m[1][1] - m[2][2] - m[0][0] ) );
      y_ = 0.5 * s;
      if ( s != 0.0 ) s = 0.5 / s;
      w_ = s * ( m[0][2] - m[2][0] );
      z_ = s * ( m[1][2] + m[2][1] );
      x_ = s * ( m[1][0] + m[0][1] );
    } else {
      double s( sqrt(1.0 + m[2][2] - m[0][0] - m[1][1] ) );
      z_ = 0.5 * s;
      if ( s != 0.0 ) s = 0.5 / s;
      w_ = s * ( m[1][0] - m[0][1] );
      x_ = s * ( m[2][0] + m[0][2] );
      y_ = s * ( m[2][1] + m[1][2] );
    }
  }
  double om, ph, ka, al, be, ga;
  om = ph = ka = 0.0;
  if ( fabs(w_) < 0.999999 ) {
    double r = sqrt( x_*x_ + y_*y_ );
    om = d*atan2( r, z_ );
    if ( r > 0.000001 ) ph = d*atan2( y_, x_ );
    ka = d*2.0*acos( w_ );
  }
  double ca, cb, cg, sa, sb, sg;
  cb = 1.0 - 2.0 * (x_*x_ + y_*y_);
  sb = 2.0 * sqrt( (x_*x_ + y_*y_) * (w_*w_ + z_*z_) );
  if ( sb > 0.0001 ) {
    ca = 2.0 * (x_*z_ + w_*y_);
    sa = 2.0 * (y_*z_ - w_*x_);
    cg = 2.0 * (w_*y_ - x_*z_);
    sg = 2.0 * (y_*z_ + w_*x_);
  } else {
    ca = 1.0;
    sa = 0.0;
    cg = cb;
    sg = 2.0*(y_*z_ + w_*x_);
  }
  al = d*atan2(sa,ca);
  be = d*atan2(sb,cb);
  ga = d*atan2(sg,cg);

#ifdef _ccp4_
  printf ( "\n\n$TEXT:CCP4 rotation-translational operator: $$ $$\n" );
#else
  printf ( " CCP4 format rotation-translation operator\n" );
#endif

  printf ( " Polar angles (omega,phi,kappa) : %9.3f %9.3f %9.3f\n",
           om,ph,ka );
  printf ( " Euler angles (alpha,beta,gamma): %9.3f %9.3f %9.3f\n",
           al,be,ga );
  printf ( " Orthogonal translation (/Angst): %9.3f %9.3f %9.3f\n",
           m[0][3],m[1][3],m[2][3] );

#ifdef _ccp4_
  printf ( "$$\n" );
#endif

}


void printFracAnalysis ( mmdb::mat44 & T, mmdb::cpstr name,
                         mmdb::PManager M )   {
mmdb::mat44 TF;

  if (M->CrystReady()!=mmdb::CRRDY_NoTransfMatrices)  {

    if (M->Orth2Frac(T,TF))
      printf ( "\n"
        "      in fractional coordinates of %s:\n\n"
        "        Rx         Ry         Rz           T\n"
        " %10.3f %10.3f %10.3f   %10.3f\n"
        " %10.3f %10.3f %10.3f   %10.3f\n"
        " %10.3f %10.3f %10.3f   %10.3f\n",
        name,
        TF[0][0],TF[0][1],TF[0][2],TF[0][3],
        TF[1][0],TF[1][1],TF[1][2],TF[1][3],
        TF[2][0],TF[2][1],TF[2][2],TF[2][3] );
    else
      printf ( "\n"
        " *** orthogonal-fractional transformations failed for structure\n"
        " %s\n",name );

  }
  /* else  {
    printf (
      " Orthogonal-fractional transformations were not calculated\n"
      " structure %s.\n"
      " Possibly, cell parameters were not supplied.\n",
      name,M->CrystReady() );
  }*/

}

int pairwise_superposition ( mmdb::PPManager M,
                             mmdb::psvector  name,
                             mmdb::ivector   selHnd,
                             mmdb::pstr      fileout  )  {
mmdb::io::File f;
ssm::PAlign    SSMAlign;
int            rc;

  printf ( "\n Performing Pairwise Structure Alignment"
           "\n ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n" );

  SSMAlign = new ssm::Align();
  rc = SSMAlign->align ( M[0],M[1],
                         ssm::PREC_Normal,ssm::CONNECT_Flexible,
                         selHnd[0],selHnd[1] );

  if (rc)  {
#ifdef _ccp4_
    printf ( "$TEXT:Warning: $$Superposition was not achieved$$\n" );
#endif
    switch (rc)  {
      case ssm::RC_NoHits :
         printf ( " *** secondary structure does not match.\n" );
         break;
      case ssm::RC_NoSuperposition :
         printf ( " *** structures are too remote.\n" );
         break;
      case ssm::RC_NoGraph :
         printf ( " *** can't make graph for %s.\n",name[0] );
         break;
      case ssm::RC_NoVertices :
         printf ( " *** empty graph for %s.\n",name[0] );
         break;
      case ssm::RC_NoGraph2 :
         printf ( " *** can't make graph for %s.\n",name[1] );
         break;
      case ssm::RC_NoVertices2 :
         printf ( " *** empty graph for %s.\n",name[1] );
         break;
      default :
        printf ( " *** undocumented return code %i.\n",rc );
    }
#ifdef _ccp4_
    printf ( "$$\n" );
#endif
  } else  {

#ifdef _ccp4_
    printf ( "$TEXT:Alignment results: $$ $$\n" );
#endif

    printf (
      " Query      %s\n"
      " and Target %s\n"
      "\n"
      " have been superposed. Superposition matrix (to be applied\n"
      " to %s) is\n\n"
      "        Rx         Ry         Rz           T\n"
      " %10.3f %10.3f %10.3f   %10.3f\n"
      " %10.3f %10.3f %10.3f   %10.3f\n"
      " %10.3f %10.3f %10.3f   %10.3f\n",
      name[0],name[1],name[0],
      SSMAlign->TMatrix[0][0],SSMAlign->TMatrix[0][1],
      SSMAlign->TMatrix[0][2],SSMAlign->TMatrix[0][3],
      SSMAlign->TMatrix[1][0],SSMAlign->TMatrix[1][1],
      SSMAlign->TMatrix[1][2],SSMAlign->TMatrix[1][3],
      SSMAlign->TMatrix[2][0],SSMAlign->TMatrix[2][1],
      SSMAlign->TMatrix[2][2],SSMAlign->TMatrix[2][3] );

    printFracAnalysis ( SSMAlign->TMatrix,name[0],M[0] );
    printFracAnalysis ( SSMAlign->TMatrix,name[1],M[1] );

    printf ( "\n"
      " ===== Scores achieved:\n"
      "\n"
       "   quality Q:  %-7.4f (normalised to [0...1])\n"
       "     r.m.s.d:  %-7.4f (A)\n"
       "      Nalign:  %-6i  (residues)\n",
       SSMAlign->Qscore,SSMAlign->rmsd,SSMAlign->nalgn );

#ifdef _ccp4_
    printf ( "$$\n\n" );
    printf ( "$TEXT:Residue alignment: $$ $$\n" );
#else
    printf ( "\n"
      " ===== Residue alignment:\n" );
#endif

    f.assign ( "stdout" );
    f.rewrite();

    ssm::PrintAlignTable ( f,M[0],M[1],SSMAlign );

#ifdef _ccp4_
    f.Write ( "$$\n" );
#endif

/*
char S[200];
int  i;
    f.WriteLine ( " \n\n Test output for Paul Emsley:\n\n"
                  "   i    Ca1[i]   dist1[i]" );
    for (i=0;i<SSMAlign->nres1;i++)  {
      sprintf ( S," %5i %5i %10.3f",i,SSMAlign->Ca1[i],
                                      SSMAlign->dist1[i] );
      f.WriteLine ( S );
    }
    f.WriteLine ( "\n\n   i    Ca2[i]" );
    for (i=0;i<SSMAlign->nres2;i++)  {
      sprintf ( S," %5i %5i",i,SSMAlign->Ca2[i] );
      f.WriteLine ( S );
    }
*/

    f.shut();

    // if output file requested, apply transform to first
    // input file (NB all file, not just requested selection)
    // and output
    if ( fileout ) {
      M[0]->ApplyTransform ( SSMAlign->TMatrix );
      M[0]->WritePDBASCII ( fileout );
    }

#ifndef _ccp4_
    printf ( "\n"
  " ----------------------------------------------------------------\n"
             "\n" );
#endif
    printccp4rot ( SSMAlign->TMatrix );

  }

  return 0;

}

