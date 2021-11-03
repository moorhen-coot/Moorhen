// $Id: ssm_superpose.h $
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
//    16.09.13   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// -----------------------------------------------------------------
//
//  **** Module  :  ssm_spose  <interface>
//       ~~~~~~~~~
//  **** Functions : SuperposeCalphas ( superposing protein structures )
//       ~~~~~~~~~~~
//
//  E. Krissinel 2002-2013
//
// =================================================================
//

#ifndef  __SSM_Superpose__
#define  __SSM_Superpose__

#include "ssm_graph.h"

//  =================================================================

namespace ssm  {

  DefineStructure(SpAtom);

  struct SpAtom  {
    mmdb::ChainID  chID;
    int            c,sse,c0;
    mmdb::realtype dist,dist0;
    int            unmap1,unmap2;
    bool           excluded;
    bool  CompatibleSSE ( RSpAtom a );
  };


  DefineStructure(SectionDist);

  struct SectionDist  {
    mmdb::realtype dist,rmsd,cosine;
    int            core_pos1,core_pos2,core_e1,core_e2;
    int            na,pos1,pos2,e1,e2;
    int            sse1,sse2;
    void Copy ( RSectionDist D );
  };


  DefineStructure(SSEDesc);

  struct SSEDesc  {
    mmdb::realtype x1,y1,z1,x2,y2,z2;      // transformed start/end coordinates
    mmdb::realtype xs1,ys1,zs1,xs2,ys2,zs2;   // original start/end coordinates
    mmdb::realtype score,Qscore,Rscore,Xscore; // overlaping scores
    int            pos,len,pend, type,classID;
    int            m,match;
    void  Transform ( mmdb::mat44 & T );
    void  CalcScore ( RSSEDesc D );
    mmdb::realtype Cosine ( RSSEDesc D );
    void  Copy ( RSSEDesc D );
  };


  DefineStructure(SortDistData);

  struct SortDistData  {
    mmdb::realtype dist;
    int            index,unmap1,unmap2;
  };

  DefineClass(SortDist);

  class SortDist : public mmdb::QuickSort  {
    public :
      SortDist() : QuickSort() {}
      int  Compare ( int i, int j );
      void Swap    ( int i, int j );
      void Sort    ( PSortDistData sdata, int len );
    protected :
      PSortDistData sd;
  };


  DefineStructure(SuperposeData);

  struct SuperposeData  {
    PGraph         G;          //!< SSE graph
    mmdb::PManager M;          //!< the structure
    PSpAtom        a;          //!< atom superposition vector
    mmdb::PPAtom   Calpha;     //!< selected C-alphas
    PSSEDesc       SSED;       //!< SSE description vector
    mmdb::pstr     selstring;  //!< C-alpha selection string
    int            selHnd;     //!< C-alpha selection handle
    int            selHndIncl; //!< selection handle of inculded C-alphas
    int            nres;       //!< number of residues (C-alphas)
    int            nSSEs;      //!< number of SSEs
    void  Init   ();
    void  Dispose();
    void  DeselectCalphas();
    void  SelectCalphas  ();
  };


  DefineClass(Superpose);

  class Superpose  {

    public :
      Superpose();
      ~Superpose();

      void SetAllowMC         ( bool allowMisconnections );
      void SetIterationLimits ( int iter_max, int iter_min,
                                int max_hollow );
      void SetCaSelections    ( mmdb::cpstr selection1,
                                mmdb::cpstr selection2 );

      int  SuperposeSSGraphs  ( PGraph G1, mmdb::ivector F1,
                                PGraph G2, mmdb::ivector F2,
                                int matchlen );

      //  driver #1
      int  SuperposeCalphas  (
              PGraph         G1,   //!< SSE graph of 1st structure
              PGraph         G2,   //!< SSE graph of 2nd structure
              mmdb::ivector  F1,   //!< matched vertices of G1 [1..mlen]
              mmdb::ivector  F2,   //!< matched vertices of G2 [1..mlen]
              int            mlen, //!< length of match (F1,F2)
              mmdb::PManager M1,   //!< 1st structure
              mmdb::PManager M2,   //!< 2nd structure
              int  selHndIncl1=0,  //!< sel handle to include atoms from M1
              int  selHndIncl2=0   //!< sel handle to include atoms from M2
                             );

      //  driver #2
      int  SuperposeCalphas  (
              PSuperposeData SD1, //!< superposition data of 1st structure
              PSuperposeData SD2, //!< superposition data of 2nd structure
              mmdb::ivector  F1,  //!< matched vertices of SD1.G [1..mlen]
              mmdb::ivector  F2,  //!< matched vertices of SD2.G [1..mlen]
              int            mlen //!< length of match (F1,F2)
                             );

      void  GetTMatrix ( mmdb::mat44 & TMat ); //!< to be applied to 1st struct.
      mmdb::mat44 *  GetTMatrix();    //!< to be applied to 1st structure
      mmdb::realtype GetRMSD   ();
      int            GetNAlign ();
      void    GetSuperposition ( mmdb::ivector  & Ca1  ,
                                 mmdb::rvector  & dist1, int & nCa1,
                                 mmdb::ivector  & Ca2  , int & nCa2,
                                 mmdb::mat44    & TMat ,
                                 mmdb::realtype & rmsdAchieved,
                                 int & nAligned,   int & nGaps,
                                 mmdb::realtype & seqIdentity,
                                 int & nMisD, mmdb::realtype & nCombs );

      void GetCalphas1 ( mmdb::PPAtom & Calpha, int & numRes );
      void GetCalphas2 ( mmdb::PPAtom & Calpha, int & numRes );

      void GetSSEDesc1 ( RPSSEDesc sseDesc, int & numSSEs );
      void GetSSEDesc2 ( RPSSEDesc sseDesc, int & numSSEs );
      PSSEDesc GetSSEDesc1();
      PSSEDesc GetSSEDesc2();

      void GetSuperposedSSEs ( mmdb::ivector v1, mmdb::ivector v2,
                               int & nSupSSEs );

      mmdb::realtype GetCalphaQ   ()  { return Q_achieved; }
      mmdb::realtype MatchQuality ( int Nalign, mmdb::realtype Rmsd );

    protected :
      mmdb::mat44     TMatrix,TMx;
      PSpAtom         a1,a2;
      mmdb::realtype  Rmsd0;       //!< optimization parameter
      mmdb::realtype  minContact;  //!< minimal Calpha-pair contact parameter
      mmdb::realtype  maxContact;  //!< maximal Calpha-pair contact parameter
      mmdb::realtype  maxRMSD;     //!< maximal RMSD allowed
      mmdb::realtype  minQStep;    //!< minimal quality improvement that counts
      mmdb::realtype  minCosine;   //!< min cosine between co-directional SSEs
      mmdb::realtype  SSEweight;   //!< additional weight for SSE atoms
      int             sseGray;     //!< gray zone on the ends of SSEs allowed for
                                   //!< matching to non-SSE atoms
      int             selInclHnd1; //!< selection handle for included Calpha1
      int             selInclHnd2; //!< selection handle for included Calpha2
      int             driverID;    //!< ID of the used Superpose driver
      mmdb::pstr      selString1;  //!< optional sel-n string for 1st structure
      mmdb::pstr      selString2;  //!< optional sel-n string for 2nd structure


      mmdb::realtype  rmsd_achieved,Q_achieved,ncombs,seqIdent;
      int             shortSect1,shortSect2;
      int             iterMax,iterMin;
      int             maxHollowIt;  //!< maximal allowed number of consequtive
                                    /// iterations without quality improvement

      int            nres1,nres2,nalgn,ngaps,nmd,nmisdr;
      bool           allowMC;       //!< allowing for misconnection

      mmdb::rmatrix  A,U,V, AD;
      mmdb::rvector  W,RV1;

      mmdb::ivector  copyF1,copyF2;   //!< copy pointers to input F1,F2
      int            copyFlen;        //!< length of FF1,FF2
      mmdb::rvector  cax0,cay0,caz0;  //!< working arrays
      PSortDistData  sdata;

      mmdb::PManager MMDB1,MMDB2; //!< copies of 1st and 2nd structure MMDBs

      mmdb::PPAtom   Calpha1,Calpha2;
      PSSEDesc       SSED1,SSED2;
      mmdb::ivector  FH1,FS1,FH2,FS2;
      int            nSSEs1,nSSEs2;
      int            nFH1,nFS1,nFH2,nFS2;
      PPSectionDist  SDist;
      int            SDistAlloc;

      SortDist       sortDist;


      void  InitSuperpose       ();
      void  FreeMemory          ();
      void  SelectCalphas       ( mmdb::PManager MMDB, PGraph G,
                                  mmdb::PPAtom & Calpha, PSpAtom & a,
                                  int & nres, int & selHnd,
                                  int selInclHnd, mmdb::cpstr selString );
      void  MapSSEs             ( mmdb::PPAtom Calpha, PSpAtom a,
                                  int nres, PGraph G, RPSSEDesc SSED,
                                  int & nSSEs );
      void  IdentifyUnmatchedSSEs ( mmdb::ivector & FH, int & nFH,
                                    mmdb::ivector & FS, int & nFS,
                                    mmdb::ivector F, int mlen,
                                    PGraph G );
      void  GetSSESpseCenters   ( RSSEDesc Q1, RSSEDesc Q2,
                                  RSSEDesc T1, RSSEDesc T2,
                                  mmdb::realtype & qc1,
                                  mmdb::realtype & qc2,
                                  mmdb::realtype & tc1,
                                  mmdb::realtype & tc2 );
      int   FirstGuess          ( mmdb::ivector F1, mmdb::ivector F2,
                                  int mlen );
      void  ChooseFirstRotation ( int rotSSE1, int rotSSE2 );
      void  CalcDistance        ( int SSE1, int SSSE2, RSectionDist D );
      void  AlignSSEs           ( RSectionDist D, int unmap );
      bool  isMC                ( int pos1, int pos2 );
      void  CorrespondSSEs      ( mmdb::ivector F1, int nF1,
                                  mmdb::ivector F2, int nF2,
                                  mmdb::realtype rmsd_est );
      void  CorrespondContacts  ( mmdb::PManager M1,
                                  mmdb::realtype rmsd_est );
      void  ExpandContact       ( mmdb::RContact c, int & ip, int & im,
                                  mmdb::realtype maxDist2 );
      void  RecoverGaps         ( mmdb::PPAtom Ca1, PSpAtom at1, int nat1,
                                  mmdb::PPAtom Ca2, PSpAtom at2, int nat2,
                                  mmdb::realtype thresh );
      void  CleanShortSections  ( PSpAtom at1, int nat1, PSpAtom at2 );

      int   CalculateTMatrix    ();
      void     CalcNGaps        ( PSpAtom a, int nres, int & Ng, int & Nm );
      mmdb::realtype CalcNCombs ( PGraph G, PSSEDesc SSED, int nSSEs,
                                  PSpAtom  a, int nres );
      mmdb::realtype MatchQuality2 ( int Nalign, mmdb::realtype dist2 );
      void     CalcQScore       ( RSSEDesc SSE1 );
      int   OptimizeNalign      ();
      void  UnmapExcluded       ( PSpAtom a1, PSpAtom a2, int nres1 );

      void  _superpose ( PGraph G1, PGraph G2, int & rc );

  };

}  // namespace ssm

#endif
