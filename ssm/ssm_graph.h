// $Id: ssm_graph.h $
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
// -----------------------------------------------------------------
//
//  **** Module  :  ssm_graph  <interface>
//       ~~~~~~~~~
//  **** Classes :  ssm::Graph  ( secondary structure graph )
//       ~~~~~~~~~
//
//  E. Krissinel 2002-2014
//
// =================================================================
//


#ifndef  __SSM_Graph__
#define  __SSM_Graph__

#include "mmdb2/mmdb_manager.h"

#include "ssm_vxedge.h"

namespace ssm  {

  //  ==========================  Graph  ===========================

  DefineClass(Graph);
  DefineStreamFunctions(Graph);

  class Graph : public mmdb::io::Stream  {

    friend class GraphMatch;

    public :

      Graph ();
      Graph ( mmdb::io::RPStream Object );
      ~Graph();

      void  Reset();  // must be called before building a graph
                      // The sequence of calls is:
                      //    Graph.Reset();
                      //    for (....)  {
                      //      V = new CSSVertex();
                      //      .....
                      //      SSGraph.AddVertex ( V );
                      //    }
                      //    SSGraph.Build();

      void  SetGraphName  ( mmdb::cpstr gname );

      void  SelectCalphas ( mmdb::PManager MMDB, int & selHnd,
                            mmdb::cpstr selstring );

      //   AddVertex(..) do not copy the objects, but take them over.
      // This means that application should forget about pointers to
      // V once they were given to CSSGraph. All vertices must be
      // allocated newly prior each call to AddVertex(..).
      void  AddVertex  ( PVertex Vx );

      int   MakeGraph ( mmdb::PManager MMDB );

      void  CalcVertexOrder();
      void  RepairSS ( mmdb::PManager MMDB );

      //   BuildGraph() calculates all edges and builds the graph.
      void  BuildGraph();
      bool  isBuild   ();

      void  calcVTypes();  // calculates nHelices and nStrands only

      //   ReleaseEdges() deallocates all graph edges and
      //  the connectivity matrix
      void  ReleaseEdges();

      void  RemoveShortVertices   ( int nmin_hx, int nmin_sd );

      //   LeaveVertices(..) removes all vertices from the graph
      // except those having numbers listed in vector vlist. Thus,
      // if vlist[i]=j, 1<=i<=vllen,  1<=j, then jth vertex will
      // not be removed.
      void  LeaveVertices   ( mmdb::ivector vlist, int vllen );

      //   LeaveVertices(..) removes all vertices from the graph
      // except those found in the specified range. 'select' is of
      // the following format:
      //    "*", "(all)"            - take all file
      //    "-"                     - take chain without chain ID
      //    "a:Ni-Mj,b:Kp-Lq,..."   - take chain a residue number N
      //                              insertion code i to residue number M
      //                              insertion code j plus chain b
      //                              residue number K insertion code p to
      //                              residue number L insertion code q and
      //                              so on.
      //    "a:,b:..."              - take whole chains a and b and so on
      //    "a:,b:Kp-Lq,..."        - any combination of the above.
      void  LeaveVertices ( mmdb::cpstr select, mmdb::PManager M );

      //    LeaveVertices ( selHnd,MMDB ) leaves only vertices that are
      // covered by the given selection. selHnd may refer to the
      // selection of atoms, residues or chains.
      void  LeaveVertices ( int selHnd, mmdb::PManager M );

      void  RemoveVertex  ( int vertex_no );  // 1..nVertices

      bool   inRange  ( mmdb::cpstr chainID, int initPos, int endPos );
      inline mmdb::cpstr GetGraphName   () { return name;        }
      inline mmdb::cpstr GetDevChain    () { return devChain;    }
      mmdb::pstr         GetChainList   ( mmdb::pstr S );
      inline int         GetNofVertices () { return nVertices;   }
      inline PPVertex    GetVertices    () { return V;           }
      inline int         GetNofEdges    () { return nEdges;      }
      inline int         GetNofHelices  () { return nHelices;    }
      inline int         GetNofStrands  () { return nStrands;    }
      void     GetAllChains  ( mmdb::PChainID & chain, int & nchains );
      int      GetNofChains  ();
      bool     GetEdgeDirection   ( int v1, int v2, mmdb::vect3 & v );
      VERTEX_TYPE GetVertexType   ( int vertex_no  ); // 1..nVertices
      int      GetVertexClass     ( int vertex_no  ); // 1..nVertices
      bool     GetVertexDirection ( int vertex_no, mmdb::vect3 & v );
      int      GetSeqLength       ( int vertex_no  ); // 1..nVertices
      mmdb::realtype GetMass      ( int vertex_no  ); // 1..nVertices
      PVertex    GetGraphVertex   ( int vertex_no  ); // 1..nVertices
      mmdb::pstr GetVertexChainID ( int vertex_no  ); // 1..nVertices
      mmdb::pstr GetVertexInitRes ( int vertex_no  ); // 1..nVertices
      mmdb::pstr GetVertexEndRes  ( int vertex_no  ); // 1..nVertices
      void       GetVertexRange   ( int     vertex_no,  // 1..nVertices
                                    mmdb::ChainID chID,
                                    int &   initSeqNum,
                                    mmdb::InsCode initICode,
                                    int &   endSeqNum,
                                    mmdb::InsCode endICode  );
      void     GetVertexRange     ( int     vertex_no,  // 1..nVertices
                                    mmdb::ChainID chID,
                                    int &   initPos,
                                    int &   endPos );
      VERTEX_TYPE GetSSEType      ( mmdb::pstr chainID, int atomPos );
      VERTEX_TYPE GetSSEType      ( mmdb::PAtom A );

      PEdge   GetGraphEdge   ( int edge_no );     // 1..nEdges
      PEdge   GetGraphEdge   ( int v1, int v2 );  // 1..nVertices

      mmdb::realtype CalcCombinations ( mmdb::ivector F, int nm );

      void  DevelopChainGraphs ( PPGraph & G, int & nGraphs );

      //  Superpose(..) returns TMatrix - a transformation matrix for
      // G's coordinates, such that TMatrix*{G} ~= {this}
      //  F1 is for 'this' graph, F2 = for G.
      void  Superpose   ( PGraph G, mmdb::ivector F1, mmdb::ivector F2,
                          int nMatch, mmdb::mat44 & TMatrix );

      void  Copy  ( PGraph G );

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :
      mmdb::pstr    name;        // graph name
      mmdb::ChainID devChain;    // chain of a developed graph
      int           nVertices,nEdges;
      int           nHelices,nStrands;

      PPVertex      V;
      PPEdge        E;
      mmdb::imatrix graph;

      void  InitGraph      ();
      void  FreeMemory     ();
      void  _leaveVertices ( mmdb::PManager M, int selHnd1 );

      //   CompareEdges(..) compares edge (ij) of the graph with
      // edge (kl) of graph G. i may be either less or greater
      // than j, same about k and l. If edges compare, the function
      // returns 0. Edges with equal indices (i.e. (ii) and (kk))
      // are considered as comparable (returns 0).
      //   The function may be used only after both graphs have
      // been built.
      int CompareEdges ( int i, int j, PGraph G, int k, int l );

      int CheckEdgeConnectivity ( int i, int j, PGraph G, int k, int l );

    private :
      int  nVAlloc,nEAlloc,nGAlloc;

  };


  //  ==================================================================

  //   In SelectDomain(..) and CutOutDomain(..), select is of the
  // following format:
  //    "*", "(all)"            - take all file
  //    "-"                     - take chain without chain ID
  //    "a:Ni-Mj,b:Kp-Lq,..."   - take chain a residue number N
  //                              insertion code i to residue number M
  //                              insertion code j plus chain b
  //                              residue number K insertion code p to
  //                              residue number L insertion code q and
  //                              so on.
  //    "a:,b:..."              - take whole chains a and b and so on
  //    "a:,b:Kp-Lq,..."        - any combination of the above.
  extern int SelectDomain ( mmdb::PManager MMDB, int & selHnd,
                            mmdb::cpstr  select, int selType );
  extern int CutOutDomain ( mmdb::PManager MMDB, mmdb::cpstr select );

  extern PGraph GetSSGraph ( mmdb::PManager M, int selHnd, int & rc );

  extern void DisposeGraphs ( PPGraph & G, int & nGraphs );

  extern int  SuperposeGraphs ( PGraph G1, mmdb::ivector F1,
                                PGraph G2, mmdb::ivector F2,
                                int     matchlen,
                                mmdb::mat44 & TMatrix );

}

/*

extern realtype  GetTorsion ( rvector U, rvector W, rvector V );
//      U     W      V
//   o<----o----->o----->o
//

extern realtype  GetAngle   ( rvector v1, rvector v2 );
//  returns angle between v1 and v2



extern void  CalcCombinations ( rvector & combs, int & vlen,
                                PCSSGraph G1, PCSSGraph G2 );

*/

#endif
