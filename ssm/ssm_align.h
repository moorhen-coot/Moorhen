// $Id: ssm_align.h $
//  =================================================================
//
//   CCP4 SSM Library: Protein structure superposition based on
//   SSM algorithm: E. Krissinel & K. Henrick (2004) Acta Cryst. D60,
//   2256-2268.
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
//    03.02.14   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  ----------------------------------------------------------------
//
//  **** Module  :  SSM_Align <interface>
//       ~~~~~~~~~
//  **** Project :  Structure alignment in 3D
//       ~~~~~~~~~
//  **** Classes :  ssm::Align   ( Secondary Structure Matching )
//       ~~~~~~~~~  ssm::XAlign  ( Output alignment             )
//                  ssm::XTAlign ( Text output alignment        )
//
//  E. Krissinel, 2002-2014
//
// =================================================================
//

#ifndef  __SSM_Align__
#define  __SSM_Align__

#include "mmdb2/mmdb_manager.h"

#include "ssm_superpose.h"
#include "ssm_csia.h"


//  ---------------------------  Align  ------------------------

namespace ssm {

  DefineClass(Align);
  DefineStreamFunctions(Align);

  class Align : public mmdb::io::Stream  {

    public :
      mmdb::mat44    TMatrix; //!< superposition matrix to be applied to 1st structure
      mmdb::realtype    rmsd; //!< core rmsd achieved
      mmdb::realtype  Qscore; //!< core Q achieved
      int            cnCheck; //!< connectivity option used
      int        nres1,nres2; //!< number of residues in structures
      int        nsel1,nsel2; //!< number of residues in aligned selections
      int              nalgn; //!< number of aligned residues
      int              ngaps; //!< number of gaps
      int                nmd; //!< number of misdirections
      mmdb::realtype  ncombs; //!< number of SSE combinations
      mmdb::realtype seqIdentity; //!< sequence identity
      int    selHndCa1,selHndCa2; //!< selection handles to used C-alphas
      mmdb::ivector  Ca1,Ca2; //!< C-alpha correspondence vectors
                              /// Ca1[i] corresponds to a[i], where a is
                              /// selection identified by selHndCa1
      mmdb::rvector    dist1; //!< optimizedd distances between the query
                              /// and target C-alphas
      PGraph           G1,G2; //!< retained SSE graphs

      Align ();
      Align ( mmdb::io::RPStream Object );
      ~Align();

      int align ( mmdb::PManager M1, mmdb::PManager M2,
                  PRECISION     precision,
                  CONNECTIVITY  connectivity,
                  int selHnd1=0, int selHnd2=0 );

      int AlignSelectedMatch ( mmdb::PManager M1, mmdb::PManager M2,
                               PRECISION     precision,
                               CONNECTIVITY  connectivity,
                               int selHnd1=0, int selHnd2=0,
                               int nselect=0 );

      mmdb::rvector GetQvalues () const { return pqvalues; }
      int           GetNMatches() const { return nMatches; }

      PSuperpose GetSuperpose() { return &superpose; }

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :
      GraphMatch    U;
      Superpose     superpose;
      mmdb::rvector pqvalues;
      int           nMatches;

      void  InitAlign ();
      void  FreeMemory();
      void  MapSelections  ( int & selHndCa, mmdb::PManager M,
                             PGraph G, int selHnd,
                             mmdb::ivector & newID );
      void  MakeSelections ( mmdb::PManager M1, int selHnd1,
                             mmdb::PManager M2, int selHnd2 );

  };


  //  -----------------------------  XAlign --------------------------

  DefineStructure(XBlock);

  struct XBlock  {
    int         i1,i2;  //!< the outer block boundaries
    int       ip1,ip2;  //!< the alignment boundaries (ip1>=i1, ip2<=i2)
    int          icol;  //!< the block "column" number
    mmdb::realtype mc;  //!< center of "index mass"
  };


  DefineClass(XAlign);

  class XAlign  {

    public :
      XAlign();
      virtual ~XAlign();

      void align (
          PGraph g1, mmdb::PPAtom Calpha1, mmdb::ivector Ca1, int nat1,
          PGraph g2, mmdb::PPAtom Calpha2, mmdb::ivector Ca2, int nat2,
          mmdb::rvector dist1, int & nr );

      int  GetNCols2() { return nCols2; }

    protected :
      PXBlock  XBlock1,XBlock2;
      int      nBlock1,nBlock2;
      int      na1,na2,nCols1,nCols2,nRows,algnLen;

      mmdb::ivector  a1,a2;
      mmdb::PPAtom   alpha1,alpha2;
      PGraph         sg1,sg2;
      mmdb::rvector  d1;
      mmdb::realtype maxdist;

      virtual void FreeMemory();
      virtual void customInit();
      int   makeXBlocks  ( mmdb::ivector Ca, int nat, RPXBlock xBlock,
                           int & nBlocks );
      void  alignXBlocks ( RXBlock B1, RXBlock B2, int & nr );

      virtual void makeRow ( mmdb::PAtom A1, int sseType1,
                             mmdb::PAtom A2, int sseType2,
                             mmdb::realtype dist, int rowNo, int icol,
                             bool aligned );
  };


  //  ----------------------------  XTAlign --------------------------

  DefineStructure(XTAlign);

  struct XTAlign  {
    mmdb::realtype hydropathy1,hydropathy2,dist;
    mmdb::ChainID  chID1,chID2;
    mmdb::ResName  resName1,resName2;
    mmdb::InsCode  insCode1,insCode2;
    int      alignKey; //!< 0: aligned, 1: not aligned, 2: NULL 1, 3: NULL 2
    int      loopNo;
    int      sseType1,sseType2;
    int      seqNum1,seqNum2;
    int      simindex;
    void  Print ( mmdb::io::RFile f );
  };

  DefineClass(XAlignText);

  class XAlignText : public XAlign  {

    public :
      XAlignText ();
      ~XAlignText();

      PXTAlign GetTextRows   () { return R; }
      void     GetAlignments ( mmdb::pstr & algn1, mmdb::pstr & algn2 );
      void     WipeTextRows  ();

    protected :
      PXTAlign R;

      void customFree();
      void customInit();
      void makeRow   ( mmdb::PAtom A1, int sseType1,
                       mmdb::PAtom A2, int sseType2,
                       mmdb::realtype dist, int rowNo, int icol,
                       bool aligned );
  };

  extern void PrintAlignTable ( mmdb::io::RFile f,
                                mmdb::PManager M1, mmdb::PManager M2,
                                PAlign SSMAlign );
}

#endif
