// $Id: ssm_csia.h $
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
//    18.09.13   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// -----------------------------------------------------------------
//
//  **** Module  :  ssm_csia       <interface>
//       ~~~~~~~~~
//  **** Classes :  ssm::GraphMatch ( matching SS graphs )
//       ~~~~~~~~~
//
//  E. Krissinel 2001-2013
//
//  When used, please cite:
//
//   Krissinel, E. and Henrick, K. (2004)
//   Common subgraph isomorphism detection by backtracking search.
//   Software - Practice and Experience, 34, 591-607.
//
// =================================================================
//

#ifndef  __SSM_CSIA__
#define  __SSM_CSIA__

#include "ssm_graph.h"

namespace ssm  {

  //  =========================  Match  ===========================

  DefineClass(Match);

  class Match : public mmdb::io::Stream  {

    friend class GraphMatch;

    public :

      Match ();
      Match ( mmdb::io::RPStream Object );
      Match ( mmdb::ivector FV1, mmdb::ivector FV2, int nv, int n, int m );
      ~Match();

      void SetMatch ( mmdb::ivector FV1, mmdb::ivector FV2,
                      int nv, int n, int m );   // FV1[], FV2[] are copied

      void    Swap();

      bool isMatch    ( mmdb::ivector FV1, mmdb::ivector FV2, int nv );

      int  isSubMatch ( mmdb::ivector FV1, mmdb::ivector FV2, int nv );
      // return 0 <=> no submatch relations
      //        1 <=> "this" is submatch of (FV1,FV2)
      //       -1 <=> (FV1,FV2) is submatch of "this"

      void GetMatch ( mmdb::ivector  & FV1,  // do not allocate or
                      mmdb::ivector  & FV2,  // dispose FV1 and FV2 in
                      int            & nv ); // application!

      void GetMatch ( mmdb::ivector  & FV1, // do not allocate or
                      mmdb::ivector  & FV2, // dispose FV1 and FV2 in
                      int            & nv,  // application!
                      mmdb::realtype & p1,
                      mmdb::realtype & p2 );

      void read  ( mmdb::io::RFile f );
      void write ( mmdb::io::RFile f );

    protected :
      mmdb::ivector F1,F2;
      int           mlength,n1,n2;

      void InitMatch();

    private :
      int nAlloc;

  };

  DefineStreamFunctions(Match);

  //  =========================  GraphMatch  ===========================


  DefineClass(GraphMatch);

  class GraphMatch : public mmdb::io::Stream  {

    public :

      GraphMatch ();
      GraphMatch ( mmdb::io::RPStream Object );
      ~GraphMatch();

      void  SetUniqueMatch ( bool unique_match );
      void  SetBestMatch   ( bool best_match   );
      void  SetMatchBufferLength ( int matchBufLen );
      void  SetFlags       ( mmdb::word Flags );
      void  RemoveFlags    ( mmdb::word Flags );

      void  MatchGraphs    ( PGraph Gh1, PGraph Gh2, int minMatch );

      PGraph  GetGraph1 ();
      PGraph  GetGraph2 ();
      void  GetMatches     ( PPMatch & SSMatch, int & nOfMatches );
      void  GetMatch       ( int   matchNo, int & matchLen,
                             mmdb::ivector  & F1, mmdb::ivector  & F2,
                             mmdb::realtype & p1, mmdb::realtype & p2 );
      inline int GetMaxRecursionLevel()  { return maxRecursionLevel; }
      inline int GetNofMatches       ()  { return nMatches;          }
      int   GetNofMatches     ( mmdb::realtype p1, mmdb::realtype p2 );

      int   CheckConnectivity ( int matchNo );

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :

      PGraph        G1,G2;
      PPVertex      V1;
      PPVertex      V2;
      PPEdge        E1;
      PPEdge        E2;
      mmdb::imatrix c1,c2;
      bool          swap;
      mmdb::word    flags;
      int           n,m;

      mmdb::imatrix3  P;
      mmdb::imatrix   iF1;
      mmdb::ivector   F1,F2,ix;

      int       nMatches,maxNofMatches;
      PPMatch   match;
      bool      UniqueMatch,BestMatch,wasFullMatch,Stop;
      int       maxMatch,maxCollectedMatch,maxRecursionLevel;

      void  InitGraphMatch   ();
      void  FreeMemory       ();
      void  FreeRecHeap      ();
      void  GetMemory        ();
      void  GetRecHeap       ();
      int   Initialize       ();
      void  DoMatch          ( int minMatch );
      void  MatchSingleVertex();
      void  Backtrack        ( int i );
      void  Backtrack1       ( int i, int k0 );
      void  CollectMatch     ( int nm );

    private :
      int nAlloc,mAlloc,nMAlloc;

  };

  DefineStreamFunctions(GraphMatch);

}  // namespace ssm

#endif
