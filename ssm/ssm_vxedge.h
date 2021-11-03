// $Id: ssm_vxedge.h $
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
//  **** Module  :  ssm_vxedge  <interface>
//       ~~~~~~~~~
//  **** Classes :  ssm::Vertex  ( secondary structure graph vertex )
//       ~~~~~~~~~  ssm::Edge    ( secondary structure graph edge   )
//
//  E. Krissinel 2002-2014
//
// =================================================================
//

#ifndef  __SSM_VxEdge__
#define  __SSM_VxEdge__

#include "mmdb2/mmdb_manager.h"
#include "ssm_defs.h"

//  ==========================  Tune-up  ============================

namespace ssm  {

  extern int hx_min_len;
  extern int sd_min_len;

  extern void InitGraph();  // should be called on top of application

  extern void SetMatchPrecision    ( PRECISION    prec      );
  extern void writeMatchParameters ( mmdb::cpstr  FileName  );
  extern int  readMatchParameters  ( mmdb::cpstr  FileName  );
  extern void SetConnectivityCheck ( CONNECTIVITY checkMode );


  //  =========================  Vertex  ===========================

  DefineClass(Vertex);
  DefineStreamFunctions(Vertex);

  class Vertex : public mmdb::io::Stream  {

    friend class Edge;
    friend class Graph;

    public :

      Vertex ();
      Vertex ( mmdb::io::RPStream Object );
      ~Vertex();

      int  SetVertex ( mmdb::PManager MMDB, mmdb::PHelix  Helix  );
      int  SetVertex ( mmdb::PManager MMDB, mmdb::PStrand Strand );
      int  SetVertex ( mmdb::PManager MMDB, VERTEX_TYPE v_type,
                       int sNum, int  iclass, mmdb::ChainID chID,
                       int seqNum1, mmdb::InsCode iCode1,
                       int seqNum2, mmdb::InsCode iCode2 );

      inline void SetID ( int vid ) { id = vid; }

      mmdb::realtype GetAngle  ( PVertex v );
      mmdb::realtype GetCosine ( PVertex v );
      mmdb::realtype GetAngle  ( mmdb::realtype vx, mmdb::realtype vy,
                                 mmdb::realtype vz );

      mmdb::pstr     GetShortVertexDesc ( mmdb::pstr S );
      mmdb::pstr     GetFullVertexDesc  ( mmdb::pstr S );

      bool  Compare ( PVertex v ); // true if vertices compare

      mmdb::realtype GetLengthDeviation ( PVertex v );

      void     GetDirection ( mmdb::vect3 & v );
      void     GetPosition  ( mmdb::vect3 & p );
      void     GetPosition  ( mmdb::realtype & vx0, mmdb::realtype & vy0,
                              mmdb::realtype & vz0 );

      inline mmdb::realtype GetLength    ()  { return length; }
      inline int            GetSeqLength ()  { return nres;   }
      inline mmdb::realtype GetMass      ()  { return mass;   }

      inline mmdb::realtype GetX1        ()  { return x1;     }
      inline mmdb::realtype GetX2        ()  { return x2;     }
      inline mmdb::realtype GetY1        ()  { return y1;     }
      inline mmdb::realtype GetY2        ()  { return y2;     }
      inline mmdb::realtype GetZ1        ()  { return z1;     }
      inline mmdb::realtype GetZ2        ()  { return z2;     }

      bool  inRange ( mmdb::cpstr chID, int Pos1, int Pos2 );

      inline int   GetVertexType   () { return type;    }
      inline int   GetVertexChainNo() { return VNo;     }
      inline mmdb::cpstr GetChainID() { return chainID; }
      void  GetVertexRange  ( mmdb::ChainID chID,
                              mmdb::ResName name1,
                              int &         seqNum1,
                              mmdb::InsCode insCode1,
                              mmdb::ResName name2,
                              int &         seqNum2,
                              mmdb::InsCode insCode2 );

      void  Copy  ( PVertex v );

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :

      //  matching info
      int             id;         //!< unique identifier that MUST be the
                                  /// vertex number starting from 1 on
      VERTEX_TYPE     type;       //!< a V_XXXXX constant
      int             classID;    //!< class ID for helices
      int             nres;       //!< number of residues
      mmdb::realtype  x0,y0,z0;   //!< center of mass
      mmdb::realtype  mass;       //!< the mass
      mmdb::realtype  ex,ey,ez;   //!< direction vector
      mmdb::realtype  dalpha;     //!< uncertainty angle
      mmdb::realtype  length;     //!< vertex length

      //  identification info
      mmdb::pstr     name;        //!< composed name for short identification
      int            serNum;      //!< helix serial number
      int            strandNo;    //!< strand number
      mmdb::maxMMDBName vertexID; //!< helix ID or sheet ID
      mmdb::ChainID  chainID;     //!< chain ID (only for identification)
      mmdb::ResName  initResName; //!< name of the strand's initial residue
      int            initSeqNum;  //!< sequence number of the initial residue
      int            initPos;     //!< sequence position of the initial residue
      mmdb::InsCode  initICode;   //!< insertion code of the initial residue
      mmdb::ResName  endResName;  //!< name of the strand's terminal residue
      int            endSeqNum;   //!< sequence number of the terminal residue
      int            endPos;      //!< sequence position of the terminal residue
      mmdb::InsCode  endICode;    //!< insertion code of the terminal residue
      int            VNo;         //!< number of vertex in the chain

      mmdb::realtype x1,x2;       //!< coordinates
      mmdb::realtype y1,y2;       ///   SSE
      mmdb::realtype z1,z2;       ///     ends

      void  InitVertex   ();
      void  FreeMemory   ();
      void  CalcGeometry ( mmdb::PPAtom CA );
      int   GetPositions ( mmdb::PManager MMDB, int minlen );
      mmdb::realtype  GetCoor1 ( mmdb::PPAtom CA, int coor_key );
      mmdb::realtype  GetCoor2 ( mmdb::PPAtom CA, int coor_key );

  };


  //  ==========================  Edge  ============================

  DefineClass(Edge);
  DefineStreamFunctions(Edge);

  class Edge : public mmdb::io::Stream  {

    friend class Graph;
    friend class GraphMatch;

    public :

      Edge ();
      Edge ( mmdb::io::RPStream Object );
      ~Edge();

      void     SetEdge  ( PVertex v1, PVertex v2 );

      mmdb::realtype GetAngle  ( PVertex v ); // returns angle between
                                              // the edge and vertex
      mmdb::realtype GetCosine ( PEdge E );   // returns cosine angle
                                              // between the edges
      mmdb::realtype GetAngle  ( mmdb::rvector V1, mmdb::rvector V2 );

      // Compare(..) returns 0 if edges compare, that is:
      //   1. edge lengths compare within relative precision
      //      edge_len_tol
      //   2. angles alpha1, alpha2 and alpha3 compare within
      //      absolute deviations edge_alphaX_tol .
      int   Compare ( bool swap_this, PEdge edge,
                      bool swap_edge );

      int   CheckConnectivity ( bool swap_this, PEdge edge,
                                bool swap_edge );

      void  GetDirection ( mmdb::vect3 & v );
      inline mmdb::realtype GetLength () { return length; }

      void  read  ( mmdb::io::RFile f );
      void  write ( mmdb::io::RFile f );

    protected :
      int            id1,id2;  //!< linked vertices
      int            vtype1;   //!< type of 1st linked vertex
      int            vtype2;   //!< type of 2nd linked vertex
      int            bdir;     //!< bond direction along the chain
      mmdb::realtype length;   //!< length of edge (between v1 and v2 mass centers)
      mmdb::realtype ex,ey,ez; //!< direction vector from v1 to v2
      mmdb::realtype alpha1;   //!< angle V1E between v1 and the edge
      mmdb::realtype alpha2;   //!< angle V2E between v2 and the edge
      mmdb::realtype alpha3;   //!< angle V1V2 between v1 and v2
      mmdb::realtype alpha4;   //!< torsion angle V1EV2 of v1, edge and v2
      mmdb::realtype dalpha1;  //!< uncertainty in alpha1
      mmdb::realtype dalpha2;  //!< uncertainty in alpha2
      mmdb::realtype dalpha3;  //!< uncertainty in alpha3
      mmdb::realtype dalpha4;  //!< uncertainty in alpha4
      mmdb::realtype dr12;
      bool           GoodTorsion; //!< True if the VEV torsion angle is well defined

      void  InitEdge();

  };

}  // namespace ssm

#endif
