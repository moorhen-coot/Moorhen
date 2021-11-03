// $Id: ssm_malign.h $
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
//  **** Module  :  SSM_MAlign <interface>
//       ~~~~~~~~~
//  **** Project :  SSM
//       ~~~~~~~~~
//  **** Classes :  ssm::MultAlign
//       ~~~~~~~~~
//
//  E. Krissinel, 2003-2014
//
//  When used, please cite:
//
//   Krissinel, E. and Henrick, K.
//   Multiple Alignment of Protein Structures in Three Dimensions.
//   Computational Life Sciences, First International Symposium,
//   CompLife 2005, Konstanz, Germany, September 25-27, 2005, 67-78.
//   Proceedings Editors: Michael R. Berthold, Robert C. Glen,
//   Kay Diederichs, Oliver Kohlbacher, Ingrid Fischer.
//   ISBN: 978-3-540-29104-6 (Print) 978-3-540-31726-5
//
// =================================================================
//

#ifndef  __SSM_MAlign__
#define  __SSM_MAlign__

#include "mmdb2/mmdb_manager.h"

#include "ssm_csia.h"
#include "ssm_superpose.h"


namespace ssm  {

  // --------------------------- SMAStruct ---------------------------

  DefineStructure(MAStruct);

  struct MAStruct  {

    SuperposeData    SD;  //!< data for pairwise superposition
    PGraph            G;  //!< reduceable copy of SSE graph
    mmdb::rvector     P;  //!< SSE matching probabilities
    mmdb::rvector     Q;  //!< SSE matching scores
    mmdb::ivector     F;  //!< original vertex numbering
    int             sNo;  //!< serial number of the structure
    int              nV;  //!< number of vertices in G
    int               n;  //!< number of non-zero SSE matchings
    int         nSAlloc;  //!< memory allocation size
    mmdb::mat44      RT;  //!< rotation-translation matrix
    mmdb::mat44     RT0;  //!< best rotation-translation matrix
    mmdb::realtype Qsum;  //!< sum of Q-scores with other structures
    mmdb::rvector    x0;  //!< original C-alpha X-coordinates
    mmdb::rvector    y0;  //!< original C-alpha Y-coordinates
    mmdb::rvector    z0;  //!< original C-alpha Z-coordinates
    mmdb::realtype xm,ym,zm;  //!< center of mass
    mmdb::realtype cx,cy,cz;  //!< consensus center of mass

    int        nalign;  //!< number of aligned residues
    mmdb::realtype    Rmsd0;  //!< parameter of Q-score

    void  Init ( mmdb::PManager MMDB, PGraph graph,
                 int serNo, int nStruct );
    void  Set  ( mmdb::PManager MMDB, PGraph graph,
                 int serNo, int nStruct );
    void  PrepareSSEMatching();
    bool  Refine            ( int maxdel, mmdb::realtype P0,
                              mmdb::ivector v1, mmdb::ivector v2 );
    void  Transform         ();
    void  SaveCoordinates   ();
    void  RestoreCoordinates();
    void  CalcCorrelationMatrix ( mmdb::rmatrix & A, mmdb::rvector xc,
                                  mmdb::rvector  yc, mmdb::rvector zc );
    void  CalcTranslation   ();
    void  GetDirection      ( int atompos, mmdb::vect3 & v );
    bool  isMC              ( int pos1, PMAStruct S, int pos2 );
    void  Dispose           ();

  };


  // ----------------------------  MSSEOutput -------------------------

  DefineStructure(MSSEOutput);

  struct MSSEOutput {
    mmdb::ResName  name1,name2;
    mmdb::ChainID  chID;
    int            seqNum1,seqNum2;
    int            sseType,loopNo;
    mmdb::InsCode  insCode1,insCode2;
    bool  aligned;
    void  Init        ();
    void  SetSSERange ( PVertex     V );
    void  Copy        ( RMSSEOutput M );
    void  write       ( mmdb::io::RFile f );
    void  read        ( mmdb::io::RFile f );
  };


  // ----------------------------  SMAOutput -------------------------

  DefineStructure(MAOutput);

  struct MAOutput {
    mmdb::ResName  name;
    mmdb::ChainID  chID;
    int            seqNum;
    int            sseType;
    mmdb::InsCode  insCode;
    mmdb::realtype rmsd;      // not used
    bool           aligned;
    void  Init  ();
    void  Fill  ( mmdb::PAtom A, PGraph G, bool align );
    void  Copy  ( RMAOutput M );
    void  write ( mmdb::io::RFile f );
    void  read  ( mmdb::io::RFile f );
  };

  extern void FreeMSOutput ( PPMAOutput   & MAOut,   int & nrows );
  extern void FreeMSOutput ( PPMSSEOutput & MSSEOut, int & nrows );

  // ---------------------------  CPAMatch ---------------------------

  DefineClass(PAMatch);

  class PAMatch  {

    public :
      mmdb::ivector  F1,F2;
      mmdb::rvector  Q;
      mmdb::realtype Qscore;
      int            mlen;

      PAMatch();
      ~PAMatch();

      void   FreeMemory();
      void    Set      ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                         mmdb::realtype matchQ, mmdb::rvector SSEQ );
      bool GetMatch ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                         mmdb::realtype & matchQ, mmdb::rvector SSEQ );
  };


  // --------------------------  PAMatches --------------------------

  DefineClass(PAMatches);

  class PAMatches  {

    public :
      PPPAMatch PA;
      int       nMatches;
      int       nBest;

      PAMatches ();
      ~PAMatches();

      int  AddMatch ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                      mmdb::realtype matchQ, mmdb::rvector SSEQ );
      int  GetMatch ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                      mmdb::realtype & matchQ, mmdb::rvector SSEQ );
      void SetBestMatch ( int mNo );
      mmdb::realtype GetBestQscore();
      void GetBestMatch ( mmdb::ivector & v1, mmdb::ivector & v2, int & matchlen );

    private :
      int nAlloc;

  };


  // ----------------------------  MAMap ----------------------------

 DefineStructure(MAMap);

  struct MAMap  {
    mmdb::realtype rmsd;
    mmdb::ivector  map;   // 0:i is mapped onto j:SMAMap[i].map[j]
    void Init   ( int nStruct );
    void Dispose();
  };


  // ---------------------------  MultAlign -------------------------

  typedef void MAProgressFunc ( void * UserData, int stagekey,
                                int progress );
  typedef MAProgressFunc * PMAProgressFunc;

  DefineClass(MultAlign);
  DefineStreamFunctions(MultAlign);

  class MultAlign : public mmdb::io::Stream  {

    public :

      MultAlign ();
      MultAlign ( mmdb::io::RPStream Object );
      ~MultAlign();

      void  setProgressFunction  ( void * UserData,
                                   PMAProgressFunc Fnc );

      int   align ( mmdb::PPManager MMDB, mmdb::psvector selstring,
                    PPGraph Graph, int  nStructures );

      inline int getMaxNofIter() { return maxIter; }

      void  getAlignScores     ( int & n_align, int & n_SSEs,
                                 mmdb::realtype & rmsd, mmdb::realtype & Qscore );
      void  getConsensusScores ( mmdb::rvector & cons_x,
                                 mmdb::rvector & cons_y,
                                 mmdb::rvector & cons_z,
                                 int     & cons_len,
                                 mmdb::rmatrix & m_rmsd,
                                 mmdb::rmatrix & m_Qscore,
                                 mmdb::rmatrix & m_seqId );

      int     getNres      ( int structNo );
      bool getAlignment ( int structNo, mmdb::ivector & Ca, int & nres );
      bool getTMatrix   ( mmdb::mat44 & TMatrix, int structNo );

      void   GetMAOutput   ( PPMAOutput & MAOut,
                             int & nrows, int & ncols );
      void   GetMSSEOutput ( PPMSSEOutput & MSSEOut,
                             int & nrows, int & ncols );

      void  WriteMultAlign   ( mmdb::io::RFile f );
      void  WriteSuperposed  ( mmdb::cpstr fileName );

      void  WriteMatchedSSEs ( mmdb::io::RFile f, bool shortTable=false );

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :
      PPMAStruct      S; //!< molecular structure data
      PPPAMatches  * PM; //!< pairwise matches database
      int       nStruct; //!< number of structures

      PMAProgressFunc ProgressFunc;
      void *          ProgFuncData;

      mmdb::rvector        vq; //!< working array  [1..maxNV]
      mmdb::ivector     v1,v2; //!< working arrays [1..maxNV]
      int         maxNV; //!< maximal number of vertices

      PRECISION    precision;    //!< SSE matching specificity
      CONNECTIVITY connectivity; //!< SSE matching connectivity flag

      mmdb::realtype  minCont; //!< minimal contact distance
      mmdb::realtype  maxCont; //!< maximal contact distance
      mmdb::realtype    Rmsd0; //!< parameter of Q-score
      int       minIter; //!< minimal number of iterations
      int       maxIter; //!< minimal number of iterations
      int   maxHollowIt; //!< maximal allowed number of consequtive
                         /// iterations without quality improvement

      mmdb::rmatrix     A,Z,V; //!< corr-n matrix, left and right SVD vectors
      mmdb::rvector         W; //!< singular values

      PMAMap        Map; //!< Map maps 0:i<->j:Map[i].map[j]

      int             Nalign; //!< number of multuply-aligned rows
      int    minNres,maxNres;
      int          nSSEalign; //!< number of multiply-aligned SSEs
      mmdb::realtype rmsd_achieved; //!< achieved RMSD
      mmdb::realtype    Q_achieved; //!< achieved Q

      mmdb::rvector        xc;  //!< consensus X-coordinates
      mmdb::rvector        yc;  //!< consensus Y-coordinates
      mmdb::rvector        zc;  //!< consensus Z-coordinates
      mmdb::rmatrix   mx_rmsd;  //!< matrix of inter-structure rmsds
      mmdb::rmatrix mx_Qscore;  //!< matrix of inter-structure Q-scores
      mmdb::rmatrix  mx_seqId;  //!< matrix of inter-structure seq identities

      GraphMatch U;
      Superpose  superpose;

      void     InitMultAlign      ();
      void     FreeMemory         ();
      void     DeleteStructures   ();
      void     DeselectCalphas    ();
      void     SelectCalphas      ();
      void     DeletePAMatches    ();
      void     DeleteMap          ();
      void     AllocateMap        ();
      void     printStats         ();
      void     AlignSSEs          ();
      void     GetSSEMatchingStats();
      void     GetBestMatch       ( PMAStruct S1, PMAStruct S2 );
      bool     RefineGraphs       ();
      int      MakeFirstGuess     ();
      void     CalcRMSD           ( int mappos   );
      bool     EvaluateMapping    ( mmdb::PMContact C );
      void     CorrespondContacts ( mmdb::realtype contDist );
      void     CalcConsensus      ();
      mmdb::realtype MatchQuality2 ( int Nalgn, mmdb::realtype dist2 );
      mmdb::realtype MatchQuality  ( int Nalgn, int N1, int N2,
                                                mmdb::realtype dist2 );
      int      OptimizeAlignments ();
      void     SortStructures     ();
      void     CalcConsensusScores();
      int      AlignCalphas       ();
      int      CalcRotation       ( mmdb::mat44 & R );

    protected :
      int Map_nrows;     // number of rows in Map;
      int nStructAlloc;  // allocated number of structures

  };

}

#endif
