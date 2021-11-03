// $Id: ssm_malign.cpp $
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
//  **** Module  :  SSM_MAlign <implementation>
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

#include <string.h>
#include <math.h>

#include "ssm_malign.h"
#include "mmdb2/mmdb_math_linalg.h"

// ---------------------------  ssm::MAStruct  -------------------------

void  ssm::MAStruct::Init ( mmdb::PManager MMDB, PGraph graph,
                            int serNo, int nStruct )  {

  SD.Init();

  G   = NULL;
  P   = NULL;
  Q   = NULL;
  F   = NULL;
  nV  = 0;
  sNo = 0;
  n   = 0;

  x0  = NULL;    // original C-alpha X-coordinates
  y0  = NULL;    // original C-alpha Y-coordinates
  z0  = NULL;    // original C-alpha Z-coordinates

  nalign = 0;    // number of aligned residues
  Rmsd0  = 3.0;  // Q-score parameter

  Set ( MMDB,graph,serNo,nStruct );

}

void  ssm::MAStruct::Set ( mmdb::PManager MMDB, PGraph graph,
                           int serNo, int nStruct )  {
int i;

  Dispose();

  if (MMDB && graph)  {
    SD.M = MMDB;
    SD.G = graph;
    G  = new Graph();         // reduceable copy of SSE graph
    G->Copy ( graph );
    G->BuildGraph();
    nV = G->GetNofVertices();    // number of vertices
    mmdb::GetVectorMemory ( P,nV,1 );  // SSE matching probabilities
    mmdb::GetVectorMemory ( Q,nV,1 );  // SSE matching scores
    mmdb::GetVectorMemory ( F,nV,1 );  // original vertex numbering
    for (i=1;i<=nV;i++)  {
      P[i] = 0.0;
      Q[i] = 0.0;
      F[i] = i;
    }
  }

  sNo     = serNo;   // serial number
  n       = 0;       // used locally
  nSAlloc = nStruct;

}

void ssm::MAStruct::Dispose() {

  SD.Dispose();

  if (G)  delete G;
  G = NULL;

  mmdb::FreeVectorMemory ( P,1 );
  mmdb::FreeVectorMemory ( Q,1 );
  mmdb::FreeVectorMemory ( F,1 );
  nV = 0;
  n  = 0;

  mmdb::FreeVectorMemory ( x0,0 );
  mmdb::FreeVectorMemory ( y0,0 );
  mmdb::FreeVectorMemory ( z0,0 );

}


void  ssm::MAStruct::PrepareSSEMatching() {
int i;
  n = 0;
  for (i=1;i<=nV;i++)  {
    if (P[i]>0.99999)  n++;
    P[i] = 0.0;  // reset accumulators
    Q[i] = 0.0;
  }
  if (n<=0)  n = 1;
}


bool  ssm::MAStruct::Refine ( int maxdel, mmdb::realtype P0,
                              mmdb::ivector v1, mmdb::ivector v2 ) {
mmdb::realtype Qmin;
int            i,j,k;

  for (i=1;i<=maxdel;i++)  {
    Qmin = mmdb::MaxReal;
    k    = 0;
    for (j=1;j<=nV;j++)
      if ((P[j]>0.00001) && (P[j]<P0) && (Q[j]<Qmin))  {
        Qmin = Q[j];
        k    = j;
      }
    if (k>0) P[k] = 0.0;
  }

  k = 0;
  for (j=1;j<=nV;j++)
    if (P[j]>=0.00001)  {
      k++;
      v1[k] = j;
      v2[k] = F[j];
    }

  if (k<nV)  {
    G->LeaveVertices ( v1,k );
    G->BuildGraph();
    nV = G->GetNofVertices();
    for (j=1;j<=nV;j++)
      F[j] = v2[j];
    return false;
  }

  return true;

}

void  ssm::MAStruct::SaveCoordinates()  {
int i;

  mmdb::FreeVectorMemory ( x0,0 );
  mmdb::FreeVectorMemory ( y0,0 );
  mmdb::FreeVectorMemory ( z0,0 );

  mmdb::GetVectorMemory ( x0,SD.nres,0 );
  mmdb::GetVectorMemory ( y0,SD.nres,0 );
  mmdb::GetVectorMemory ( z0,SD.nres,0 );

  for (i=0;i<SD.nres;i++)  {
    x0[i] = SD.Calpha[i]->x;
    y0[i] = SD.Calpha[i]->y;
    z0[i] = SD.Calpha[i]->z;
  }

}

void  ssm::MAStruct::RestoreCoordinates()  {
int i;
  for (i=0;i<SD.nres;i++)  {
    SD.Calpha[i]->x = x0[i];
    SD.Calpha[i]->y = y0[i];
    SD.Calpha[i]->z = z0[i];
  }
}

void  ssm::MAStruct::Transform()  {
//   This function applies the rotation-translation transformation,
// given by matrix RT, to the structure. The function also
// initializes atom structures used for C-alpha matching.
int i;

  for (i=0;i<SD.nres;i++)
    SD.Calpha[i]->Transform ( RT );
  for (i=0;i<SD.nSSEs;i++)
    SD.SSED[i].Transform ( RT );

}

void  ssm::MAStruct::CalcCorrelationMatrix ( mmdb::rmatrix & A,
                                             mmdb::rvector  xc,
                                             mmdb::rvector  yc,
                                             mmdb::rvector  zc ) {
mmdb::vect3 vc1,vc2;
int         i,j,i1,i2;

  for (i=1;i<=3;i++)
    for (j=1;j<=3;j++)
      A[i][j] = 0.0;

  xm = 0.0;
  ym = 0.0;
  zm = 0.0;
  cx = 0.0;
  cy = 0.0;
  cz = 0.0;
  nalign = 0;
  for (i1=0;i1<SD.nres;i1++)  {
    i2 = SD.a[i1].c;
    if (i2>=0)  {
      xm += x0[i1];
      ym += y0[i1];
      zm += z0[i1];
      cx += xc[i2];
      cy += yc[i2];
      cz += zc[i2];
      nalign++;
    }
  }
  xm /= nalign;
  ym /= nalign;
  zm /= nalign;
  cx /= nalign;
  cy /= nalign;
  cz /= nalign;

  for (i1=0;i1<SD.nres;i1++)  {
    i2 = SD.a[i1].c;
    if (i2>=0)  {
      vc1[0] = x0[i1] - xm;
      vc1[1] = y0[i1] - ym;
      vc1[2] = z0[i1] - zm;
      vc2[0] = xc[i2] - cx;
      vc2[1] = yc[i2] - cy;
      vc2[2] = zc[i2] - cz;
      for (i=1;i<=3;i++)
        for (j=1;j<=3;j++)
          A[i][j] += vc1[j-1]*vc2[i-1];
    }
  }

}

void ssm::MAStruct::CalcTranslation()  {
  RT[0][3] = cx - RT[0][0]*xm - RT[0][1]*ym - RT[0][2]*zm;
  RT[1][3] = cy - RT[1][0]*xm - RT[1][1]*ym - RT[1][2]*zm;
  RT[2][3] = cz - RT[2][0]*xm - RT[2][1]*ym - RT[2][2]*zm;
}

void ssm::MAStruct::GetDirection ( int atompos, mmdb::vect3 & v )  {
int p1,p2;
  p1 = mmdb::IMax ( 0,atompos-1 );
  p2 = mmdb::IMin ( SD.nres-1,atompos+1 );
  v[0] = SD.Calpha[p2]->x - SD.Calpha[p1]->x;
  v[1] = SD.Calpha[p2]->y - SD.Calpha[p1]->y;
  v[2] = SD.Calpha[p2]->z - SD.Calpha[p1]->z;
}

bool ssm::MAStruct::isMC ( int pos1, PMAStruct S, int pos2 )  {
//   Returns true if matching the Calpha pair in the positions
// (pos1,pos2) of the chains would contradict to the already
// aligned pairs and allowMC is set false.
int i;

//  if (allowMC)  return false;

  i = pos1 + 1;
  while (i<SD.nres)
    if (SD.a[i].c>=0)  break;
                 else  i++;
  if (i<SD.nres) {
    if (pos2>=SD.a[i].c)  {
      if ((!strcmp(SD.a[pos1].chID,SD.a[i].chID)) &&
          (!strcmp(S->SD.a[pos2].chID,S->SD.a[SD.a[i].c].chID)))
        return true;
    }
  }

  i = pos1 - 1;
  while (i>=0)
    if (SD.a[i].c>=0)  break;
                 else  i--;
  if (i>=0) {
    if (pos2<=SD.a[i].c)  {
      if ((!strcmp(SD.a[pos1].chID,SD.a[i].chID)) &&
          (!strcmp(S->SD.a[pos2].chID,S->SD.a[SD.a[i].c].chID)))
        return true;
    }
  }

  return false;

}


// ----------------------------  ssm::MSSEOutput -------------------------

void  ssm::MSSEOutput::Init()  {
  name1[0]    = char(0);
  name2[0]    = char(0);
  chID [0]    = char(0);
  seqNum1     = mmdb::ANY_RES;
  seqNum2     = mmdb::ANY_RES;
  sseType     = V_UNKNOWN;
  loopNo      = 1;
  insCode1[0] = char(0);
  insCode2[0] = char(0);
  aligned     = false;
}

void ssm::MSSEOutput::SetSSERange ( PVertex V )  {
  V->GetVertexRange  ( chID,name1,seqNum1,insCode1,name2,seqNum2,insCode2 );
  sseType = V->GetVertexType();
}

void  ssm::MSSEOutput::Copy ( RMSSEOutput M )  {
  strcpy ( name1,M.name1 );
  strcpy ( name2,M.name2 );
  strcpy ( chID ,M.chID  );
  seqNum1 = M.seqNum1;
  seqNum2 = M.seqNum2;
  sseType = M.sseType;
  loopNo  = M.loopNo;
  strcpy ( insCode1,M.insCode1 );
  strcpy ( insCode2,M.insCode2 );
  aligned = M.aligned;
}

void  ssm::MSSEOutput::write ( mmdb::io::RFile f )  {
  f.WriteFile ( name1,sizeof(name1) );
  f.WriteFile ( name2,sizeof(name2) );
  f.WriteFile ( chID ,sizeof(chID)  );
  f.WriteInt  ( &seqNum1 );
  f.WriteInt  ( &seqNum2 );
  f.WriteInt  ( &sseType );
  f.WriteInt  ( &loopNo  );
  f.WriteFile ( insCode1,sizeof(insCode1) );
  f.WriteFile ( insCode2,sizeof(insCode2) );
  f.WriteBool ( &aligned );
}

void  ssm::MSSEOutput::read ( mmdb::io::RFile f )  {
  f.ReadFile ( name1,sizeof(name1) );
  f.ReadFile ( name2,sizeof(name2) );
  f.ReadFile ( chID ,sizeof(chID)  );
  f.ReadInt  ( &seqNum1 );
  f.ReadInt  ( &seqNum2 );
  f.ReadInt  ( &sseType );
  f.ReadInt  ( &loopNo  );
  f.ReadFile ( insCode1,sizeof(insCode1) );
  f.ReadFile ( insCode2,sizeof(insCode2) );
  f.ReadBool ( &aligned );
}



// ---------------------------  ssm::MAOutput  -------------------------

void ssm::MAOutput::Init()  {
  name[0]    = char(0);
  chID[0]    = char(0);
  seqNum     = 0;
  insCode[0] = char(0);
  rmsd       = 0.0;
  sseType    = V_UNKNOWN;
  aligned    = false;
}

void ssm::MAOutput::Fill ( mmdb::PAtom A, PGraph G, bool align )  {
mmdb::PResidue res;
  res = A->GetResidue();
  if (res)  {
    strcpy ( name,res->GetResName() );
    strcpy ( chID,res->GetChainID() );
    if (!chID[0])  strcpy ( chID," " );
    seqNum = res->GetSeqNum();
    strcpy ( insCode,res->GetInsCode() );
  }
  sseType = G->GetSSEType ( A );
  aligned = align;
}

void  ssm::MAOutput::Copy ( RMAOutput M )  {
  strcpy ( name,M.name );
  strcpy ( chID,M.chID );
  seqNum  = M.seqNum;
  sseType = M.sseType;
  strcpy ( insCode,M.insCode );
  rmsd    = M.rmsd;
  aligned = M.aligned;
}

void  ssm::MAOutput::write ( mmdb::io::RFile f )  {
  f.WriteFile ( name,sizeof(name) );
  f.WriteFile ( chID,sizeof(chID) );
  f.WriteInt  ( &seqNum  );
  f.WriteInt  ( &sseType );
  f.WriteFile ( insCode,sizeof(insCode) );
  f.WriteReal ( &rmsd    );
  f.WriteBool ( &aligned );
}

void  ssm::MAOutput::read ( mmdb::io::RFile f )  {
  f.ReadFile ( name,sizeof(name) );
  f.ReadFile ( chID,sizeof(chID) );
  f.ReadInt  ( &seqNum  );
  f.ReadInt  ( &sseType );
  f.ReadFile ( insCode,sizeof(insCode) );
  f.ReadReal ( &rmsd    );
  f.ReadBool ( &aligned );
}


namespace ssm  {

  void FreeMSOutput ( PPMAOutput & MAOutput, int & nrows )  {
  int i;
    if (MAOutput)  {
      for (i=0;i<nrows;i++)
        if (MAOutput[i])  delete[] MAOutput[i];
      delete[] MAOutput;
    }
    MAOutput = NULL;
    nrows    = 0;
  }


  void FreeMSOutput ( PPMSSEOutput & MSSEOutput, int & nrows )  {
  int i;
    if (MSSEOutput)  {
      for (i=0;i<nrows;i++)
        if (MSSEOutput[i])  delete[] MSSEOutput[i];
      delete[] MSSEOutput;
    }
    MSSEOutput = NULL;
    nrows      = 0;
  }

}


// ---------------------------  ssm::PAMatch ---------------------------

ssm::PAMatch::PAMatch()  {
  F1     = NULL;
  F2     = NULL;
  Q      = NULL;
  mlen   = 0;
  Qscore = 0.0;
}

ssm::PAMatch::~PAMatch()  {
  FreeMemory();
}

void  ssm::PAMatch::FreeMemory()  {
  mmdb::FreeVectorMemory ( F1,1 );
  mmdb::FreeVectorMemory ( F2,1 );
  mmdb::FreeVectorMemory ( Q ,1 );
}

void  ssm::PAMatch::Set ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                          mmdb::realtype matchQ, mmdb::rvector SSEQ )  {
int i;

  FreeMemory();

  mlen = matchlen;
  mmdb::GetVectorMemory ( F1,mlen,1 );
  mmdb::GetVectorMemory ( F2,mlen,1 );
  mmdb::GetVectorMemory ( Q ,mlen,1 );
  for (i=1;i<=mlen;i++)  {
    F1[i] = v1  [i];
    F2[i] = v2  [i];
    Q [i] = SSEQ[i];
  }

  Qscore = matchQ;

}

bool ssm::PAMatch::GetMatch ( mmdb::ivector    v1,
                              mmdb::ivector    v2,
                              int              matchlen,
                              mmdb::realtype & matchQ,
                              mmdb::rvector    SSEQ )  {
int  i,j,k;

  matchQ = Qscore;

  if (matchlen<=mlen)  {

    k = 1;

    for (i=1;(i<=matchlen) && (k==1);i++)  {
      k = 2;
      for (j=1;(j<=mlen) && (k==2);j++)
        if (v1[i]==F1[j])  {
          if (v2[i]!=F2[j])  k = 3;
          else  {
            SSEQ[i] = Q[j];
            k = 1;
          }
        }
    }

    return (k==1);

  } else
    return false;

}


// --------------------------  ssm::PAMatches --------------------------

ssm::PAMatches::PAMatches()  {
  PA       = NULL;
  nMatches = 0;
  nAlloc   = 0;
  nBest    = -1;
}

ssm::PAMatches::~PAMatches()  {
int i;
  if (PA)  {
    for (i=0;i<nAlloc;i++)
      if (PA[i]) delete PA[i];
    delete[] PA;
  }
}

int  ssm::PAMatches::AddMatch ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                                mmdb::realtype matchQ, mmdb::rvector SSEQ )  {
PPPAMatch PA1;
int        i;
  if (nMatches>=nAlloc)  {
    nAlloc += 30;
    PA1 = new PPAMatch[nAlloc];
    for (i=0;i<nMatches;i++)
      PA1[i] = PA[i];
    for (i=nMatches;i<nAlloc;i++)
      PA1[i] = NULL;
    if (PA)  delete[] PA;
    PA = PA1;
  }
  PA[nMatches] = new PAMatch();
  PA[nMatches]->Set ( v1,v2,matchlen,matchQ,SSEQ );
  nMatches++;
  return nMatches-1;
}

int  ssm::PAMatches::GetMatch ( mmdb::ivector v1, mmdb::ivector v2, int matchlen,
                                mmdb::realtype & matchQ, mmdb::rvector SSEQ )  {
int i,mNo;
  mNo = -1;
  for (i=0;i<nMatches;i++)
    if (PA[i]->GetMatch(v1,v2,matchlen,matchQ,SSEQ))  {
      mNo = i;
      break;
    }
  return mNo;
}

void  ssm::PAMatches::SetBestMatch ( int mNo )  {
  nBest = mNo;
}

mmdb::realtype ssm::PAMatches::GetBestQscore()  {
  if (nBest>=0)  return PA[nBest]->Qscore;
           else  return 0.0;
}

void  ssm::PAMatches::GetBestMatch ( mmdb::ivector & v1, mmdb::ivector & v2,
                                 int & matchlen )  {
  if (nBest>=0)  {
    v1 = PA[nBest]->F1;
    v2 = PA[nBest]->F2;
    matchlen = PA[nBest]->mlen;
  } else  {
    v1 = NULL;
    v2 = NULL;
    matchlen = 0;
  }
}


// ----------------------------  SMAMap ----------------------------

void  ssm::MAMap::Init ( int nStruct )  {
  rmsd = 0.0;
  mmdb::GetVectorMemory ( map,nStruct,1 );
}

void  ssm::MAMap::Dispose()  {
  mmdb::FreeVectorMemory ( map,1 );
}


// ---------------------------  ssm::MultAlign -------------------------

namespace ssm  {
  MakeStreamFunctions(MultAlign)
}

ssm::MultAlign::MultAlign() : mmdb::io::Stream()  {
  InitMultAlign();
}

ssm::MultAlign::MultAlign ( mmdb::io::RPStream Object )
              : mmdb::io::Stream ( Object )  {
  InitMultAlign();
}

ssm::MultAlign::~MultAlign()  {

  FreeMemory();

  mmdb::FreeMatrixMemory ( A,3,1,1 );  // correlation matrix
  mmdb::FreeMatrixMemory ( Z,3,1,1 );  // left SVD vectors
  mmdb::FreeMatrixMemory ( V,3,1,1 );  // right SVD vectors
  mmdb::FreeVectorMemory ( W,1     );  // singular values

}

void  ssm::MultAlign::FreeMemory()  {

  DeletePAMatches  ();
  DeleteStructures ();

  mmdb::FreeVectorMemory ( vq,1 );
  mmdb::FreeVectorMemory ( v1,1 );
  mmdb::FreeVectorMemory ( v2,1 );

  mmdb::FreeVectorMemory ( xc,0 );
  mmdb::FreeVectorMemory ( yc,0 );
  mmdb::FreeVectorMemory ( zc,0 );

  mmdb::FreeMatrixMemory ( mx_rmsd  ,nStructAlloc,0,0 );
  mmdb::FreeMatrixMemory ( mx_Qscore,nStructAlloc,0,0 );
  mmdb::FreeMatrixMemory ( mx_seqId ,nStructAlloc,0,0 );
  nStructAlloc = 0;

  DeleteMap        ();

}

void  ssm::MultAlign::DeleteStructures()  {
int i;
  if (S)  {
    for (i=0;i<nStruct;i++)  {
      S[i]->Dispose();
      delete S[i];
    }
    delete[] S;
    S = NULL;
  }
  nStruct = 0;
}

void  ssm::MultAlign::DeselectCalphas()  {
int i;
  for (i=0;i<nStruct;i++)
    S[i]->SD.DeselectCalphas();
}

void  ssm::MultAlign::SelectCalphas()  {
int i;
  for (i=0;i<nStruct;i++)
    S[i]->SD.SelectCalphas();
}


void  ssm::MultAlign::DeletePAMatches()  {
int i,j;
  if (PM)  {
    for (i=0;i<nStruct-1;i++)
      if (PM[i])  {
        for (j=i+1;j<nStruct;j++)
          if (PM[i][j])  delete PM[i][j];
        PM[i] += i+1;
        delete[] PM[i];
      }
    delete[] PM;
  }
  PM = NULL;
}

void  ssm::MultAlign::DeleteMap()  {
int i;
  if (Map)  {
    for (i=0;i<Map_nrows;i++)
      Map[i].Dispose();
    delete[] Map;
    Map = NULL;
  }
  Map_nrows = 0;
}

void  ssm::MultAlign::AllocateMap()  {
int i;
  DeleteMap();
  Map_nrows = S[0]->SD.nres;
  Map = new MAMap[Map_nrows];
  for (i=0;i<Map_nrows;i++)
    Map[i].Init ( nStruct-1 );
}

void  ssm::MultAlign::InitMultAlign()  {

  S            = NULL;  // working structure array
  PM           = NULL;  // pairwise matches database
  nStruct      = 0;     // number of structures
  ProgressFunc = NULL;
  ProgFuncData = NULL;

  vq           = NULL;  // working array [1..maxNV]
  v1           = NULL;  // working array [1..maxNV]
  v2           = NULL;  // working array [1..maxNV]
  maxNV        = 0;     // maximal number of vertices

  precision    = PREC_Normal;       // SSE matching specificity
  connectivity = CONNECT_Flexible;  // SSE matching connectivity flag

  minCont      = 3.0;  // angstrom; minimal contact distance
  maxCont      = 8.0;  // angstrom; maximal contact distance
  Rmsd0        = 3.0;  // parameter of Q-score

  minIter      =  3;   // minimal number of iterations
  maxIter      = 30;   // maximal number of iterations
  maxHollowIt  =  3;   // maximal allowed number of consequtive
                       // iterations without quality improvement

  mmdb::GetMatrixMemory ( A,3,3,1,1 );  // correlation matrix
  mmdb::GetMatrixMemory ( Z,3,3,1,1 );  // left SVD vectors
  mmdb::GetMatrixMemory ( V,3,3,1,1 );  // right SVD vectors
  mmdb::GetVectorMemory ( W,3,1     );  // singular values

  Map     = NULL;  // 0:i is mapped onto j:Map[i].map[j]
  Map_nrows =  0;  // number of rows in Map;

  Nalign        = 0;   // number of multiply-aligned rows
  minNres       = -1;  // minimal number of residues
  maxNres       = -1;  // maximal number of residues
  nSSEalign     = 0;   // number of multiply-aligned SSEs
  rmsd_achieved = 0.0; // achieved RMSD
  Q_achieved    = 0.0; // achieved Q

  xc           = NULL; // consensus X-coordinates
  yc           = NULL; // consensus Y-coordinates
  zc           = NULL; // consensus Z-coordinates
  mx_rmsd      = NULL; // matrix of inter-structure rmsds
  mx_Qscore    = NULL; // matrix of inter-structure Q-scores
  mx_seqId     = NULL; // matrix of inter-structure sequence identities
  nStructAlloc = 0;    // number of structures allocated

}

void  ssm::MultAlign::setProgressFunction ( void * UserData,
                                            PMAProgressFunc Fnc )  {
  ProgressFunc = Fnc;
  ProgFuncData = UserData;
}


int  ssm::MultAlign::align ( mmdb::PPManager MMDB,
                             mmdb::psvector  selstring,
                             PPGraph         Graph,
                             int             nStructures )  {
char L[100];
int  i,j,rc;

  FreeMemory();

  if ((nStructures<1) || (!MMDB))  return MALIGN_BadInput;

  //   Allocate an initialize structures

  nStruct = nStructures;
  S       = new PMAStruct[nStruct];
  for (i=0;i<nStruct;i++)  {
    S[i] = NULL;
    if (!Graph[i]->GetGraphName()) {
      sprintf ( L,"S%03i",i+1 );
      Graph[i]->SetGraphName ( L );
    }
  }

  rc    = 0;
  maxNV = 0;
  for (i=0;(i<nStruct) && (!rc);i++)
    if (MMDB[i])  {
      if (Graph[i])  {
        S[i] = new MAStruct();
        S[i]->Init ( MMDB[i],Graph[i],i,nStruct );
        S[i]->Rmsd0 = Rmsd0;
        if (S[i]->nV>maxNV)  maxNV = S[i]->nV;
        if (selstring)
          mmdb::CreateCopy ( S[i]->SD.selstring,selstring[i] );
      } else
        rc = MALIGN_NoGraph+i;
    } else
      rc = MALIGN_NoStructure;

  if (rc)  {
    FreeMemory();
    return rc;
  }

  //  Allocate and initialize database of matches

  PM = new PPPAMatches[nStruct-1];
  for (i=0;i<nStruct-1;i++)  {
    PM[i]  = new PPAMatches[nStruct-i-1];
    PM[i] -= (i+1);
    for (j=i+1;j<nStruct;j++)
      PM[i][j] = new ssm::PAMatches();
  }

  mmdb::GetVectorMemory ( vq,mmdb::IMax(3,maxNV)      ,1 );
  mmdb::GetVectorMemory ( v1,mmdb::IMax(nStruct,maxNV),1 );
  mmdb::GetVectorMemory ( v2,mmdb::IMax(nStruct,maxNV),1 );

  if (ProgressFunc)  (*ProgressFunc)(ProgFuncData,1,0);
  AlignSSEs();

  if (ProgressFunc)  (*ProgressFunc)(ProgFuncData,2,0);

  if (nSSEalign>0)  rc = AlignCalphas();
              else  rc = MALIGN_NoAlignment;

  return rc;

}

#ifndef __debug

void  ssm::MultAlign::printStats()  {
// used for debugging only
char L[10];
int  i,j,k;
  printf ( "\n\n =======================================\n   " );
  for (i=0;i<nStruct;i++)
    printf ( "     %s   ",S[i]->G->GetGraphName() );
  printf ( "\n" );
  i = 1;
  do {
    k = 0;
    printf ( "%2i.",i );
    for (j=0;j<nStruct;j++)
      if (S[j]->nV>=i)  {
        if (S[j]->G->GetVertexType(i)==V_HELIX)
             strcpy ( L,"H" );
        else strcpy ( L,"S" );
        printf ( " %5.3g|%s%s:%2i",S[j]->P[i],
                 S[j]->G->GetVertexChainID(i),L,S[j]->F[i] );
        k = 1;
      } else
        printf ( "            " );
    printf ( "\n" );
    i++;
  } while (k);
}

#else

void  ssm::MultAlign::printStats()  {
// used for debugging only
char L[10],SS[500],N[300];
int  i,j,k,k1;
  writeDebug ( "\n\n =======================================" );
  strcpy ( SS,"" );
  k1 = 0;
  for (i=0;i<nStruct;i++)  {
    strcat ( SS,"     " );
    strcat ( SS,S[i]->G->GetGraphName() );
    strcat ( SS,"   "   );
    k1++;
    if (k1>3)  {
      writeDebug ( SS );
      writeDebug ( " ---------------------------------------" );
      strcpy ( SS,"" );
      k1 = 0;
    }
  }
  if (SS[0])  writeDebug ( SS );
  i = 1;
  do {
    k  = 0;
    k1 = 0;
    sprintf ( SS,"%2i.",i );
    for (j=0;j<nStruct;j++)  {
      if (S[j]->nV>=i)  {
        if (S[j]->G->GetVertexType(i)==V_HELIX)
             strcpy ( L,"H" );
        else strcpy ( L,"S" );
        sprintf ( N," %5.3g|%s%s:%2i",S[j]->P[i],
                    S[j]->G->GetVertexmmdb::ChainID(i),L,S[j]->F[i] );
        strcat ( SS,N );
        k = 1;
      } else
        strcat ( SS,"            " );
      k1++;
      if (k1>3)  {
        writeDebug ( SS );
        writeDebug ( " ---------------------------------------" );
        strcpy ( SS,"  " );
        k1 = 0;
      }
    }
    if (strlen(SS)>2)  writeDebug ( SS );
    i++;
  } while (k);
}

#endif

void  ssm::MultAlign::WriteMatchedSSEs ( mmdb::io::RFile f,
                                         bool shortTable )  {
PPMSSEOutput  MSSEOutput;
mmdb::ChainID chID;
mmdb::InsCode initICode,endICode;
int           initSeqNum,endSeqNum;
char          N[200],L[20];
int           i,j,vno, nrows,ncols;

  j = 1;
  for (i=1;(i<nStruct) && (j);i++)
    if (S[i]->nV!=S[0]->nV)  j = 0;

  if (!j)  {

    f.WriteLine ( "  SSE Alignment is not complete." );
    f.LF();

  } else  {

    MSSEOutput = NULL;
    nrows      = 0;
    ncols      = 0;
    GetMSSEOutput ( MSSEOutput,nrows,ncols );

    f.Write ( " " );
    for (i=0;i<nStruct;i++)  {
      if (i>0)  f.Write ( "|" );
      sprintf ( N,"     %4s       ",S[i]->G->GetGraphName() );
      f.Write ( N );
    }
    f.LF();
    f.Write ( " " );
    for (i=0;i<nStruct;i++)  {
      if (i>0)  f.Write ( "+" );
      f.Write ( "----------------" );
    }
    f.LF();

    for (i=0;i<nrows;i++)  {
      f.Write ( " " );
      for (j=0;j<ncols;j++)  {
        if (j>0) f.Write ( "|" );
        if (!MSSEOutput[i][j].name1[0])
          strcpy ( N,"                " );
        else {
          strcpy ( chID,MSSEOutput[i][j].chID );
          switch (MSSEOutput[i][j].sseType)  {
            case V_HELIX  :  strcpy ( L,"H" );  break;
            case V_STRAND :  strcpy ( L,"S" );  break;
            default       :  strcpy ( L,"X" );  break;
          }
          sprintf ( N,"%1s[%1s:%i-%i]",L,chID,
                      MSSEOutput[i][j].seqNum1,
                      MSSEOutput[i][j].seqNum2 );
          if (j<ncols-1) {
            if (MSSEOutput[i][j].aligned)
                  while (strlen(N)<16)  strcat ( N,"*" );
            else  while (strlen(N)<16)  strcat ( N," " );
          }
        }
        f.Write ( N );
      }
      f.LF();
    }

    FreeMSOutput  ( MSSEOutput,nrows );

    if (shortTable)  {

      f.Write ( "-" );
      for (i=0;i<nStruct;i++)
        f.Write ( "-----------------" );
      f.LF();

      f.Write ( " " );
      for (i=0;i<nStruct;i++)  {
        sprintf ( N,"       %s      ",S[i]->G->GetGraphName() );
        f.Write ( N );
      }
      f.LF();

      f.Write ( "-" );
      for (i=0;i<nStruct;i++)
        f.Write ( "-----------------" );
      f.LF();

      for (i=1;i<=S[0]->nV;i++)  {
        if (S[0]->SD.G->GetVertexType(S[0]->F[i])==V_HELIX)
             f.Write ( "H" );
        else f.Write ( "S" );
        for (j=0;j<nStruct;j++)  {
          vno = S[j]->F[i];
          S[j]->SD.G->GetVertexRange ( vno,chID,initSeqNum,initICode,
                                       endSeqNum,endICode );
          sprintf ( N,"|%2i:%1s%4i%1s-%4i%1s|",vno,chID,
                    initSeqNum,initICode,endSeqNum,endICode );
          f.Write ( N );
        }
        f.LF();
      }

      f.Write ( "-" );
      for (i=0;i<nStruct;i++)
        f.Write ( "-----------------" );
      f.LF();

    }

  }

}


void  ssm::MultAlign::AlignSSEs()  {
PMAStruct D;
int       i,j,itn;
bool   done;

  itn = 1;
  do {

    //  Sort graphs by increasing the number of vertices
    for (i=0;i<nStruct-1;i++)
      for (j=i+1;j<nStruct;j++)
        if (S[i]->nV>S[j]->nV)  {
          D = S[j];  S[j] = S[i];  S[i] = D;
        }

    //  Get matching statistics
    GetSSEMatchingStats();
//    printStats();

    done = RefineGraphs();

    if (ProgressFunc)  (*ProgressFunc)(ProgFuncData,1,itn++);

  } while (!done);

}

void  ssm::MultAlign::GetSSEMatchingStats()  {
mmdb::realtype  B;
int       i,j;

  for (i=0;i<nStruct;i++)
    S[i]->PrepareSSEMatching();

  SetMatchPrecision    ( precision    );
  SetConnectivityCheck ( connectivity );

  U.SetUniqueMatch ( true );
  U.SetBestMatch   ( true );

//  Superpose.SetIterationLimits ( 8,8,4 );

  for (i=nStruct-2;i>=0;i--)
    for (j=i+1;j<nStruct;j++)  {
      //      U.MatchGraphs ( G[i],G[j],mmdb::IMax(1,mmdb::IMin(n0[i],n0[j])-2) );
      /*
writeDebug ( " mstat 4.1 i=",i );
 if (!S[i]->G)  writeDebug ( " no G[i]" );
 if (!S[j]->G)  writeDebug ( " no G[j]" );
      */
      U.MatchGraphs ( S[i]->G,S[j]->G,1 );
      GetBestMatch  ( S[i],S[j] );
    }

  // Take the averages
  B = nStruct - 1.0;
  for (i=0;i<nStruct;i++)
    for (j=1;j<=S[i]->nV;j++)  {
      S[i]->P[j] /= B;
      S[i]->Q[j] /= B;
    }

}

bool  betterMatch ( int len1, mmdb::realtype Q1,
                    int len,  mmdb::realtype Q )  {
  if (len<=3)  {
    if (len1>len)   return true;
    if (len1==len)  return (Q1>Q);
  } else if (len1>len+1)  return true;
    else if (len1>=len-1) return (Q1>Q);
  return false;
}

void  ssm::MultAlign::GetBestMatch ( PMAStruct S1, PMAStruct S2 )  {
mmdb::ivector  F1,F2, FF1,FF2;
mmdb::realtype p1,p2,Q,Q1;
int            i1,i2,i,j,n,ml,mlen,mNo;

  i1 = S1->sNo;
  i2 = S2->sNo;

  n = U.GetNofMatches ( 0.0,0.0 );

  if (n>0)  {
    Q    = -0.5;
    Q1   = -1.0;
    FF1  = NULL;
    FF2  = NULL;
    mlen = 0;
    for (i=0;i<n;i++)  {
      // get match
      U.GetMatch ( i,ml,F1,F2,p1,p2 );
      // get original vertex indices
      for (j=1;j<=ml;j++)  {
        v1[j] = S1->F[F1[j]];
        v2[j] = S2->F[F2[j]];
      }
      // check if such a match is already in the database
      if (i2>i1)  mNo = PM[i1][i2]->GetMatch ( v1,v2,ml,Q1,vq );
            else  mNo = PM[i2][i1]->GetMatch ( v2,v1,ml,Q1,vq );
      if (mNo>=0)  {
        // match found, check whether it is the best one
        if (betterMatch(ml,Q1,mlen,Q))  {
          Q    = Q1;
          mlen = ml;
          FF1  = F1;
          FF2  = F2;
          if (i2>i1)  PM[i1][i2]->SetBestMatch ( mNo );
                else  PM[i2][i1]->SetBestMatch ( mNo );
        }
      } else  {
        // a new SSE match
        superpose.SuperposeCalphas ( &(S1->SD),&(S2->SD),
                                     v1,v2,ml );
        Q1 = superpose.GetCalphaQ();
        for (j=1;j<=ml;j++)
          vq[j] = S1->SD.SSED[F1[j]-1].Qscore;
        //  store the match
        if (i2>i1)  mNo = PM[i1][i2]->AddMatch ( v1,v2,ml,Q1,vq );
              else  mNo = PM[i2][i1]->AddMatch ( v2,v1,ml,Q1,vq );
        if ((Q1>0.0) && betterMatch(ml,Q1,mlen,Q))  {
          Q    = Q1;
          mlen = ml;
          FF1   = F1;
          FF2   = F2;
          if (i2>i1)  PM[i1][i2]->SetBestMatch ( mNo );
                else  PM[i2][i1]->SetBestMatch ( mNo );
        }
      }
    }
    for (i=1;i<=mlen;i++)  {
      S1->P[FF1[i]] += 1.0;
      S2->P[FF2[i]] += 1.0;
      S1->Q[FF1[i]] += vq[i];
      S2->Q[FF2[i]] += vq[i];
    }
  }

}


bool  ssm::MultAlign::RefineGraphs()  {
PMAStruct D;
mmdb::realtype  Pmin,dP,P0,B;
int       i,j;
bool   done;

  dP        = 1.0/mmdb::realtype(nStruct);
  Pmin      = mmdb::MaxReal;
  nSSEalign = mmdb::MaxInt4; // number of multiply-aligned SSEs
  for (i=0;i<nStruct;i++)  {
    S[i]->n = 0; // counts non-zero probs
    if (S[i]->nV<nSSEalign)  nSSEalign = S[i]->nV;
    for (j=1;j<=S[i]->nV;j++)
      if (S[i]->P[j]>dP)  {
        S[i]->n++;
        if (S[i]->P[j]<Pmin)  Pmin = S[i]->P[j];
      }
  }

  //  Sort graphs by increasing the number of vertices
  for (i=0;i<nStruct-1;i++)
    for (j=i+1;j<nStruct;j++)
      if (S[i]->n>S[j]->n)  {
        D = S[j];  S[j] = S[i];  S[i] = D;
      }

  if (S[0]->n<=0)  return true;  // all-zero, no solution

  P0 = mmdb::RMin(1.0-dP,Pmin+dP);   // probability cut-off

  // we now dispose all vertices below the probability cut-off
  done = true;
  for (i=0;i<nStruct;i++)  {
    B = S[i]->n - S[0]->n;
    j = mmdb::IMax ( 1, mmdb::mround(B-B/(sqrt(B)/10.0+2.0)) );
    if (!S[i]->Refine(j,P0,v1,v2))  done = false;
  }

  return done;

}

void ssm::MultAlign::WriteSuperposed ( mmdb::cpstr fileName )  {
mmdb::PManager MMDB;
mmdb::PModel   model;
mmdb::PChain   chain;
mmdb::ChainID  chID;
int            i;

  model = mmdb::newModel();

  strcpy ( chID,"A" );
  for (i=0;i<nStruct;i++)  {
    model->AddChain ( S[i]->SD.M->GetChain(1,0) );
    chain = model->GetChain ( i );
    if (chain)  {
      chain->SetChainID ( chID );
      chID[0] = char(int(chID[0])+1);
      chain->ApplyTransform ( S[i]->RT );
    }
  }

  MMDB = new mmdb::Manager();
  MMDB->AddModel ( model );
  MMDB->WritePDBASCII ( fileName );
  delete MMDB;

}

int ssm::MultAlign::MakeFirstGuess()  {
//   Using the results of multiple graph matching, this function
// simply chooses a structure which makes a highest quality
// superposition with all other structures. The other structures
// are then oriented to the chosen one.
PMAStruct      MAS;
mmdb::ivector   F1,F2;
mmdb::realtype  Q,Qmax;
int             i,i1,j,k,m,rc;

  rc = MALIGN_Ok;

  //  1. Find structure showing highest sum of Q-scores

  Qmax = -mmdb::MaxReal;
  k    = -1;
  for (i=0;i<nStruct;i++)  {
    i1 = S[i]->sNo;
    Q  = 0.0;
    for (j=0;j<i1;j++)
      Q += PM[j][i1]->GetBestQscore();
    for (j=i1+1;j<nStruct;j++)
      Q += PM[i1][j]->GetBestQscore();
    if (Q>Qmax)  {
      Qmax = Q;
      k    = i;
    }
    S[i]->Qsum = Q;
  }

  if (k<0)  k = 0;

  //  2. Sort structures by decreasing their Q-scores

  if (k>0)  {
    MAS = S[k];  S[k] = S[0];  S[0] = MAS;
  }
  for (i=1;i<nStruct-1;i++)
    for (j=i+1;j<nStruct;j++)
      if (S[j]->Qsum>S[i]->Qsum)  {
        MAS = S[j];  S[j] = S[i];  S[i] = MAS;
      }

  //  3. Make 3D alignments to the central (1st) structure
  i1 = S[0]->sNo;
  mmdb::Mat4Init ( S[0]->RT0 );
  for (i=1;(i<nStruct) && (rc==MALIGN_Ok);i++)  {
    j = S[i]->sNo;
    if (j>i1)  PM[i1][j]->GetBestMatch ( F1,F2,m );
         else  PM[j][i1]->GetBestMatch ( F2,F1,m );
    if (m>0)  {
      superpose.SuperposeCalphas ( &(S[i]->SD),&(S[0]->SD),F2,F1,m );
      superpose.GetTMatrix       ( S[i]->RT0 );
    } else
      rc = MALIGN_NoAlignment;
  }

  if (rc!=MALIGN_Ok)  return rc;

  //  4. Make a first-guess C-alpha alignment: leave only
  //     mappings that are common for all structures

  for (i=0;i<S[0]->SD.nres;i++)
    S[0]->SD.a[i].c0 = 0;  // use this as a counter of mapped atoms

  //     count atoms mapped on each atom of 1st structure
  for (i=1;i<nStruct;i++)
    for (j=0;j<S[i]->SD.nres;j++)  {
      m = S[i]->SD.a[j].c0;  // i:j is mapped on 0:m
      if (m>=0)  S[0]->SD.a[m].c0++;  // count atoms mapped on this one
    }

  Nalign = 0;
  for (i=0;i<S[0]->SD.nres;i++)  {
    if (S[0]->SD.a[i].c0<nStruct-1)  {
      S[0]->SD.a[i].c0 = -1;  // unmap this atom as not all structures
                              // have atoms mapped on it
    } else  {
      S[0]->SD.a[i].c0 = i;   // map on itself for consensus calcs
      Nalign++;
    }
    S[0]->SD.a[i].c = S[0]->SD.a[i].c0;
  }

  for (i=1;i<nStruct;i++)  {
    for (j=0;j<S[i]->SD.nres;j++)  {
      m = S[i]->SD.a[j].c0;
      if (m>=0)  {
        if (S[0]->SD.a[m].c0<0)
          S[i]->SD.a[j].c0 = -1;
      }
      S[i]->SD.a[j].c = S[i]->SD.a[j].c0;
    }
  }

  return rc;

}


int  ssm::MultAlign::CalcRotation ( mmdb::mat44 & R )  {
//   Given the correlation matrix A, this function calculates rotation
// matrix R, optimally excluding the rotoinversion if occured
mmdb::realtype det,B;
int      i,j,k;

  det = A[1][1]*A[2][2]*A[3][3] +
        A[1][2]*A[2][3]*A[3][1] +
        A[2][1]*A[3][2]*A[1][3] -
        A[1][3]*A[2][2]*A[3][1] -
        A[1][1]*A[2][3]*A[3][2] -
        A[3][3]*A[1][2]*A[2][1];

  mmdb::math::SVD ( 3,3,3,A,Z,V,W,vq,true,true,i );

  if (i!=0) {
    for (i=0;i<4;i++)  {
      for (j=0;j<4;j++)
        R[i][j] = 0.0;
      R[i][i] = 1.0;
    }
    return 1;
  }

  if (det<=0.0)  {
    k = 0;
    B = mmdb::MaxReal;
    for (j=1;j<=3;j++)
      if (W[j]<B)  {
        B = W[j];
        k = j;
      }
    for (j=1;j<=3;j++)
      V[j][k] = -V[j][k];
  }

  for (j=1;j<=3;j++)
    for (k=1;k<=3;k++)  {
      B = 0.0;
      for (i=1;i<=3;i++)
        B += Z[j][i]*V[k][i];
      R[j-1][k-1] = B;
    }

  R[3][0] = 0.0;
  R[3][1] = 0.0;
  R[3][2] = 0.0;
  R[3][3] = 1.0;

  return 0;

}


//  ==============================================================

namespace ssm {

  DefineClass(SortMappings)

  class SortMappings : public mmdb::QuickSort  {
    public :
      SortMappings() : mmdb::QuickSort() {}
      int  Compare ( int i, int j );
      void Sort    ( mmdb::ivector ci, int nc, PMAMap Map );
    protected :
      PMAMap M;
  };

  int SortMappings::Compare ( int i, int j )  {
  mmdb::realtype ri,rj;
    ri = M[((mmdb::ivector)data)[i]].rmsd;
    rj = M[((mmdb::ivector)data)[j]].rmsd;
    if (ri<rj)  return  1;
    if (ri>rj)  return -1;
    return 0;
  }

  void SortMappings::Sort ( mmdb::ivector ci, int nc, PMAMap Map )  {
    M = Map;
    mmdb::QuickSort::Sort ( &(ci[0]),nc );
  }

}

//  ==============================================================


bool ssm::MultAlign::EvaluateMapping ( mmdb::PMContact C )  {
//  Calculates optimal mapping for the contact, but does not
//  do the actual mapping
mmdb::PAtom   a0;
mmdb::realtype d,dmin;
int      i0,i,j,j0;

  i0 = C->contactID;
  j0 = -1;
  a0 = S[0]->SD.Calpha[i0];  // the reference atom
  if (!a0)  return false;

  // now simply choose, from all atoms contacting the reference one,
  // those still available, fitting by chainline and closest
  Map[i0].rmsd = 0.0;
  for (i=0;i<C->nStruct;i++)  {
    dmin = mmdb::MaxReal;
    j0   = -1;
    for (j=0;j<C->nAtoms[i];j++)
      if ((S[i+1]->SD.a[C->id[i][j]].c<0) &&
          (!S[i+1]->isMC(C->id[i][j],S[0],i0)))  {
        d = a0->GetDist2 ( C->atom[i][j] );
        if (d<dmin)  {
          dmin = d;
          j0   = j;
        }
      }
    if (j0>=0)  {
      Map[i0].map[i+1] = C->id[i][j0];
      Map[i0].rmsd    += dmin;
    } else
      break;
  }
  if (j0<0)  return false;

  for (i=1;i<nStruct-1;i++)
    for (j=i+1;j<nStruct;j++)
      Map[i0].rmsd += S[i]->SD.Calpha[Map[i0].map[i]]->GetDist2 (
                                  S[j]->SD.Calpha[Map[i0].map[j]] );

  return true;

}


void ssm::MultAlign::CalcRMSD ( int mappos )  {
int i,j,k;

  Map[mappos].rmsd = 0.0;

  for (i=1;i<nStruct;i++)  {
    k = Map[mappos].map[i];
    Map[mappos].rmsd +=
      S[0]->SD.Calpha[mappos]->GetDist2 ( S[i]->SD.Calpha[k] );
    for (j=i+1;j<nStruct;j++)
      Map[mappos].rmsd += S[i]->SD.Calpha[k]->GetDist2 (
                                 S[j]->SD.Calpha[Map[mappos].map[j]] );
  }

  Map[mappos].rmsd /= (nStruct*(nStruct-1))/2;

}

void ssm::MultAlign::CorrespondContacts ( mmdb::realtype contDist )  {
mmdb::PPAtom *   AIndex;
mmdb::PPMContact contact;
mmdb::realtype   dmin;
int              i,j,k,mpos, nconts;

  //  1. Prepare array of atom indices for contact seeking

  AIndex = new mmdb::PPAtom[nStruct];
  for (i=0;i<nStruct;i++)  {
    AIndex[i] = new mmdb::PAtom[S[i]->SD.nres];
    for (j=0;j<S[i]->SD.nres;j++)
      if (S[i]->SD.a[j].c<0)
           AIndex[i][j] = S[i]->SD.Calpha[j];
      else AIndex[i][j] = NULL;
    if (i>0)  v1[i] = S[i]->SD.nres;
  }

  //  2. Find multiple contacts
  contact = NULL;
  S[0]->SD.M->SeekContacts ( AIndex[0],S[0]->SD.nres,
                             &(AIndex[1]),&(v1[1]),
                             nStruct-1,0.0,contDist,
                             contact,0 );

  //  3. Remove incomlete contacts

  nconts = 0;
  for (i=0;i<S[0]->SD.nres;i++)
    if (contact[i])  {
      k = 1;
      if (contact[i]->nAtoms)
        for (j=0;j<contact[i]->nStruct;j++)
          if (contact[i]->nAtoms[j]>0)  k++;
      if (k>=nStruct)  {
        if (i>nconts)  {
          contact[nconts] = contact[i];
          contact[i]      = NULL;
        }
        nconts++;
      } else  {
        delete contact[i];
        contact[i] = NULL;
      }
    }


  //  4. Cover contacts one-by-one in order of increasing
  //     the optimal mapping rmsd

  do  {

    //  4.1 As any new contact affects the optimal mapping,
    //      calculate the shortest contact each time before
    //      the mapping
    dmin = mmdb::MaxReal;
    k    = -1;
    for (i=0;i<nconts;i++)
      if (contact[i])  {
        if (EvaluateMapping(contact[i]))  {
          if (Map[contact[i]->contactID].rmsd<dmin)  {
            dmin = Map[contact[i]->contactID].rmsd<dmin;
            k = i;
          }
        } else  {
          mpos = contact[i]->contactID;
          for (j=1;j<nStruct;j++)
            Map[mpos].map[j] = -1;
          delete contact[i];
          contact[i] = NULL;
        }
      }

    if (k>=0)  {
      mpos = contact[k]->contactID;
      S[0]->SD.a[mpos].c = mpos;
      for (i=1;i<nStruct;i++)
        S[i]->SD.a[Map[mpos].map[i]].c = mpos;
      delete contact[k];
      contact[k] = NULL;
    }

  } while (k>=0);

  DeleteMContacts ( contact,S[0]->SD.nres );

  for (i=0;i<nStruct;i++)
    if (AIndex[i])  delete[] AIndex[i];
  delete[] AIndex;

}

void  ssm::MultAlign::CalcConsensus()  {
int i,j,k;
  for (i=0;i<maxNres;i++)  {
    xc[i] = 0.0;
    yc[i] = 0.0;
    zc[i] = 0.0;
  }
  for (i=0;i<nStruct;i++)
    for (j=0;j<S[i]->SD.nres;j++)  {
      k = S[i]->SD.a[j].c;
      if (k>=0)  {
        xc[k] += S[i]->SD.Calpha[j]->x;
        yc[k] += S[i]->SD.Calpha[j]->y;
        zc[k] += S[i]->SD.Calpha[j]->z;
      }
    }
  for (i=0;i<maxNres;i++)  {
    xc[i] /= nStruct;
    yc[i] /= nStruct;
    zc[i] /= nStruct;
  }
}


mmdb::realtype  ssm::MultAlign::MatchQuality2 ( int Nalgn, mmdb::realtype dist2 )  {
mmdb::realtype  NormN,Na2,NormR;
  NormN = minNres*maxNres;
  if (NormN<=0.0) return 0.0;
  Na2   = Nalgn*Nalgn;
  NormR = dist2/(Nalgn*Rmsd0*Rmsd0);
  return  Na2/((1.0+NormR)*NormN);
}

mmdb::realtype  ssm::MultAlign::MatchQuality  ( int Nalgn, int N1, int N2,
                                      mmdb::realtype dist2 )  {
mmdb::realtype  NormN,Na2,NormR;
  NormN = N1*N2;
  if (NormN<=0.0) return 0.0;
  Na2   = Nalgn*Nalgn;
  NormR = dist2/(Nalgn*Rmsd0*Rmsd0);
  return  Na2/((1.0+NormR)*NormN);
}

int  ssm::MultAlign::OptimizeAlignments()  {
SortMappings sortMappings;
mmdb::rvector      rmsd0;
mmdb::ivector      ci;
mmdb::realtype     rmsd,Qscore,r1,Q1;
int          i,j,k, nc, nalgn,nalgn1, rc, iter;
int          nobetter_cnt;
bool      done;

  rc = SPOSE_Ok;

  mmdb::FreeVectorMemory ( xc,0 );
  mmdb::FreeVectorMemory ( yc,0 );
  mmdb::FreeVectorMemory ( zc,0 );

  minNres = mmdb::MaxInt4;
  maxNres = mmdb::MinInt4;
  for (i=0;i<nStruct;i++)  {
    S[i]->SaveCoordinates();
    if (S[i]->SD.nres<minNres)  minNres = S[i]->SD.nres;
    if (S[i]->SD.nres>maxNres)  maxNres = S[i]->SD.nres;
    mmdb::Mat4Copy ( S[i]->RT0,S[i]->RT );
  }

  mmdb::GetVectorMemory ( xc,maxNres,0 );
  mmdb::GetVectorMemory ( yc,maxNres,0 );
  mmdb::GetVectorMemory ( zc,maxNres,0 );
  mmdb::GetVectorMemory ( ci   ,S[0]->SD.nres,0 );
  mmdb::GetVectorMemory ( rmsd0,S[0]->SD.nres,0 );

  AllocateMap();

  Nalign        = 0;
  rmsd_achieved = mmdb::MaxReal;
  Q_achieved    = -1.0;

  iter         = 0;
  nobetter_cnt = 0;
  do  {

    //  1. Bring structures to the best mutual positions
    for (i=0;i<nStruct;i++)  {
      S[i]->Transform();
      for (j=0;j<S[i]->SD.nres;j++)  {
        S[i]->SD.a[j].c = S[i]->SD.a[j].c0;
        if (S[i]->SD.a[j].c>=0)
             S[i]->SD.a[j].unmap1 = UNMAP_NO;
        else S[i]->SD.a[j].unmap1 = UNMAP_YES;
      }
    }

    //  2. Set initial mappings

    for (i=0;i<S[0]->SD.nres;i++)
      for (j=1;j<nStruct;j++)
        Map[i].map[j] = -1;

    // 0:i is mapped onto j:SMAMap[i].map[j]
    for (i=1;i<nStruct;i++)
      for (j=0;j<S[i]->SD.nres;j++)  {
        k = S[i]->SD.a[j].c;
        if (k>=0)  Map[k].map[i] = j;
      }

    //  3. Try to expand the mappings

    CorrespondContacts ( maxCont );

    //    RecoverGaps();

    nalgn = 0;
    rmsd  = 0.0;
    nc    = 0;
    for (i=0;i<S[0]->SD.nres;i++)
      if (S[0]->SD.a[i].c>=0)  {
        k = 0;
        for (j=1;(j<nStruct) && (k>=0);j++)
          k = Map[i].map[j];
        if (k>=0)  {
          nalgn++;
          CalcRMSD ( i );
          rmsd += Map[i].rmsd;
          if (S[0]->SD.a[i].unmap1!=UNMAP_NO)
            ci[nc++] = i;
        } else  {
          S[0]->SD.a[i].c = -1;
          for (j=1;j<nStruct;j++)
            if (Map[i].map[j]>=0)  {
              S[j]->SD.a[Map[i].map[j]].c = -1;
              Map[i].map[j] = -1;
            }
        }
      }

    Qscore = MatchQuality2 ( nalgn,rmsd );

    if (nc>0)  {
      // unmap atoms for increasing the Q-score
      sortMappings.Sort ( ci,nc,Map );
      nalgn1 = nalgn;
      r1     = rmsd;
      k      = -1;
      for (i=0;i<nc;i++)  {
        r1 -= Map[ci[i]].rmsd;
        nalgn1--;
        Q1  = MatchQuality2 ( nalgn1,r1 );
        if (Q1>Qscore)  {
          Qscore = Q1;
          rmsd   = r1;
          nalgn  = nalgn1;
          k      = i;
        }
      }
      for (i=0;i<=k;i++)  {
        S[0]->SD.a[ci[i]].c = -1;
        for (j=1;j<nStruct;j++)
          S[j]->SD.a[Map[ci[i]].map[j]].c = -1;
      }
    }

    //  4. Calculate consensus coordinates

    CalcConsensus();

    if (nalgn>0)  rmsd /= nalgn;

    if (Qscore>Q_achieved)  {
      Q_achieved    = Qscore;
      rmsd_achieved = rmsd;  // square root is taken once before return
      Nalign        = nalgn;
      for (i=0;i<nStruct;i++)
        for (j=0;j<S[i]->SD.nres;j++)
          S[i]->SD.a[j].c0 = S[i]->SD.a[j].c;
      for (i=0;i<S[0]->SD.nres;i++)
        rmsd0[i] = Map[i].rmsd;
      for (i=0;i<nStruct;i++)
        mmdb::Mat4Copy ( S[i]->RT,S[i]->RT0 );
      nobetter_cnt = 0;
    } else
      nobetter_cnt++;

    done = (nalgn==0) || (iter>maxIter) ||
           ((iter>minIter) && (nobetter_cnt>maxHollowIt));

    if (!done)  {

      //  5. Optimize superposition

      for (i=0;(i<nStruct) && (rc==SPOSE_Ok);i++)  {
        S[i]->CalcCorrelationMatrix ( A,xc,yc,zc );
        if (CalcRotation(S[i]->RT))  rc = SPOSE_SVDFail;
                               else  S[i]->CalcTranslation();
      }

      done = (rc!=SPOSE_Ok);

    }

    iter++;
    if (ProgressFunc)  (*ProgressFunc)(ProgFuncData,2,iter);

    for (i=0;i<nStruct;i++)
      S[i]->RestoreCoordinates();

  } while (!done);

  for (i=0;i<nStruct;i++)  {
    mmdb::Mat4Copy ( S[i]->RT0,S[i]->RT );
    for (j=0;j<S[i]->SD.nres;j++)
      S[i]->SD.a[j].c = S[i]->SD.a[j].c0;
  }

  for (i=0;i<S[0]->SD.nres;i++)  {
    Map[i].rmsd = rmsd0[i];
    for (j=1;j<nStruct;j++)
      Map[i].map[j] = -1;
  }
  for (i=1;i<nStruct;i++)
    for (j=0;j<S[i]->SD.nres;j++)  {
      k = S[i]->SD.a[j].c0;
      if (k>=0)  Map[k].map[i] = j;
    }

  mmdb::FreeVectorMemory ( ci   ,0 );
  mmdb::FreeVectorMemory ( rmsd0,0 );

  rmsd_achieved = sqrt(rmsd_achieved);

  return rc;

}

void  ssm::MultAlign::SortStructures()  {
//  sorts structures in the original order
PMAStruct MAS;
int       i,j,k,m;

  k = 0;
  j = S[0]->sNo;
  for (i=1;i<nStruct;i++)
    if (S[i]->sNo<j)  {
      k = i;
      j = S[i]->sNo;
    }

  if (k>0)  {

    //  All alignments are mapped as i->0.
    //  Make inverse mapping 0->k
    for (i=0;i<S[0]->SD.nres;i++)  {
      S[0]->SD.a[i].c0 = -1;  // unmap 1st structure completely
      S[0]->SD.a[i].c  = -1;
    }

    for (i=0;i<S[k]->SD.nres;i++)  {
      j = S[k]->SD.a[i].c0;    // k:i is mapped to 0:j
      if (j>=0)  {
        S[0]->SD.a[j].c0 = i;  // now 0:j is mapped to k:i
        S[0]->SD.a[j].c  = i;
      }
    }

    //  Remap all other alignments as i->0->k
    for (i=1;i<nStruct;i++)
      if (i!=k)  {
        for (j=0;j<S[i]->SD.nres;j++)  {
          m = S[i]->SD.a[j].c0;    // i:j is mapped on 0:m
          if (m>=0)  {
            m = S[0]->SD.a[m].c0;
            if (m>=0)  S[i]->SD.a[j].c0 = m;
                 else  S[i]->SD.a[j].c0 = -1;
          }
          S[i]->SD.a[j].c = S[i]->SD.a[j].c0;
        }
      }

  }

  //  Sort structures by serial numbers

  if (k>0)  {
    MAS = S[k];  S[k] = S[0];  S[0] = MAS;
  }
  for (i=1;i<nStruct-1;i++)
    for (j=i+1;j<nStruct;j++)
      if (S[j]->sNo<S[i]->sNo)  {
        MAS = S[j];  S[j] = S[i];  S[i] = MAS;
      }

  //  Map 0th structure onto itself
  for (i=0;i<S[0]->SD.nres;i++)
    if (S[0]->SD.a[i].c0>=0)  {
      S[0]->SD.a[i].c0 = i;
      S[0]->SD.a[i].c  = i;
    }

  //  Set mappings
  if (Map)  {
    DeleteMap  ();
    AllocateMap();
    for (i=0;i<S[0]->SD.nres;i++)
      for (j=1;j<nStruct;j++)
        Map[i].map[j] = -1;
    for (i=1;i<nStruct;i++)
      for (j=0;j<S[i]->SD.nres;j++)  {
        k = S[i]->SD.a[j].c;
        if (k>=0)  Map[k].map[i] = j;
      }
  }

}


void ssm::MultAlign::CalcConsensusScores()  {
mmdb::ivector  ix;
mmdb::ovector  sc;
mmdb::realtype B,nid;
int            i,j,k,m;

  mmdb::FreeMatrixMemory ( mx_rmsd  ,nStructAlloc,0,0 );
  mmdb::FreeMatrixMemory ( mx_Qscore,nStructAlloc,0,0 );
  mmdb::FreeMatrixMemory ( mx_seqId ,nStructAlloc,0,0 );

  mmdb::GetMatrixMemory ( mx_rmsd  ,nStruct,nStruct,0,0 );
  mmdb::GetMatrixMemory ( mx_Qscore,nStruct,nStruct,0,0 );
  mmdb::GetMatrixMemory ( mx_seqId ,nStruct,nStruct,0,0 );
  nStructAlloc = nStruct;

  mmdb::GetVectorMemory ( ix,maxNres,0 );
  mmdb::GetVectorMemory ( sc,maxNres,0 );

  for (i=0;i<maxNres;i++)
    sc[i] = false;

  //  Bring structures to the best mutual positions
  for (i=0;i<nStruct;i++)
    S[i]->Transform();

  //  Calculate consensus coordinates
  CalcConsensus();

  //  Calculate relative and consensus-related scores
  for (i=0;i<nStruct;i++)  {
    B = 0.0;
    for (j=0;j<S[i]->SD.nres;j++)  {
      k = S[i]->SD.a[j].c0;
      if (k>=0)  {
        ix[k] = j;
        sc[k] = true;
        B    += S[i]->SD.Calpha[j]->GetDist2 ( xc[k],yc[k],zc[k] );
      }
    }
    mx_rmsd  [i][i] = sqrt(B/Nalign);
    mx_Qscore[i][i] = MatchQuality ( Nalign,S[i]->SD.nres,Nalign,B );
    mx_seqId [i][i] = 1.0;
    for (m=i+1;m<nStruct;m++)  {
      B   = 0.0;
      nid = 0.0;
      for (j=0;j<S[m]->SD.nres;j++)  {
        k = S[m]->SD.a[j].c0;
        if (k>=0)  {
          B += S[m]->SD.Calpha[j]->GetDist2 ( S[i]->SD.Calpha[ix[k]] );
          if (!strcmp(S[m]->SD.Calpha[j]->GetResName(),
                      S[i]->SD.Calpha[ix[k]]->GetResName()))  nid += 1.0;
        }
      }
      mx_rmsd  [i][m] = sqrt(B/Nalign);
      mx_Qscore[i][m] = MatchQuality ( Nalign,S[i]->SD.nres,
                                              S[m]->SD.nres,B );
      mx_seqId [i][m] = nid/mmdb::realtype(Nalign);
      mx_rmsd  [m][i] = mx_rmsd  [i][m];
      mx_Qscore[m][i] = mx_Qscore[i][m];
      mx_seqId [m][i] = mx_seqId [i][m];
    }
  }

  //  Mark unoccupied consensus positions
  for (i=0;i<maxNres;i++)
    if (!sc[i])  {
      xc[i] = -mmdb::MaxReal;
      yc[i] = -mmdb::MaxReal;
      zc[i] = -mmdb::MaxReal;
    }

  //  Restore original coordinates
  for (i=0;i<nStruct;i++)
    S[i]->RestoreCoordinates();

  mmdb::FreeVectorMemory ( sc,0 );
  mmdb::FreeVectorMemory ( ix,0 );

}


namespace ssm  {

  void ExpandSSEOut ( PPMSSEOutput & MSSEOutput, int nrows1,
                      int ncols, int & nrows0 )  {
  PPMSSEOutput M;
  int           i,j;
    M = new PMSSEOutput[nrows1];
    for (i=0;i<nrows0;i++)
      if (MSSEOutput[i])  {
        M[i] = new ssm::MSSEOutput[ncols];
        for (j=0;j<ncols;j++)
          M[i][j].Copy ( MSSEOutput[i][j] );
      } else
        M[i] = NULL;
    for (i=nrows0;i<nrows1;i++)
      M[i] = NULL;
    FreeMSOutput ( MSSEOutput,nrows0 );
    MSSEOutput = M;
    nrows0 = nrows1;
  }

}

void ssm::MultAlign::GetMSSEOutput ( PPMSSEOutput & MSSEOutput,
                                     int & nrows, int & ncols )  {
mmdb::ivector  nvert,ic1,ic2;
mmdb::omatrix  d;
int            i,j,j1,k,m,n,n0;
PPVertex     * GV;

  FreeMSOutput ( MSSEOutput,nrows );

  ncols = nStruct;
  if (nStruct<=0)  return;

  n0 = -1;
  for (i=0;i<nStruct;i++)  {
    j = S[i]->SD.G->GetNofVertices();
    if (j>n0)  n0 = j;  // maximal number of vertices
  }

  if (n0<=0)  return;

  GV = new PPVertex[nStruct];       // pointers to graph vertices
  mmdb::GetVectorMemory ( nvert,nStruct,0 ); // numbers of vertices
  k = 0;
  for (i=0;i<nStruct;i++)  {
    GV   [i] = S[i]->SD.G->GetVertices   ();
    nvert[i] = S[i]->SD.G->GetNofVertices();
    if (nvert[i]>k)  k = nvert[i];
  }
  mmdb::GetMatrixMemory ( d,nStruct,k,0,0 );
  for (i=0;i<nStruct;i++)
    for (j=0;j<k;j++)
      d[i][j] = false;

  n0 = 2*n0+1;   // maximal length of SSE output table
  MSSEOutput = new PMSSEOutput[n0];
  for (i=0;i<n0;i++)
    MSSEOutput[i] = NULL;

  //  allocate vertex cursors
  mmdb::GetVectorMemory ( ic1,nStruct,0 );
  mmdb::GetVectorMemory ( ic2,nStruct,0 );
  for (j=0;j<nStruct;j++)
    ic1[j] = 0;

  // loop over all matched SSEs
  nrows = 0;
  for (i=1;i<=S[0]->nV;i++)  {
    // find the number of leading unmatched SSEs
    m = 0;
    for (j=0;j<nStruct;j++)  {
      ic2[j] = S[j]->F[i]-1;
      j1     = i-1;
      while (j1>=1)  {
        k = S[j]->F[j1]-1;
        if (!strcmp(GV[j][k]->GetChainID(),
                    GV[j][ic2[j]]->GetChainID()))  {
          ic1[j] = (ic2[j]+k)/2 + 1;
          break;
        } else
          j1--;
      }
      if ((j1<1) && (i<=1))
            n = ic2[j];
      else  n = GV[j][ic2[j]]->GetVertexChainNo() -
                GV[j][ic1[j]]->GetVertexChainNo();
      m = mmdb::IMax ( m,n );
    }
    // ith aligned vertex should be placed into (nrows+m)th position
    n = nrows+m;
    if (n+1>n0)  {
//      n0 = n*3/2;
      ExpandSSEOut ( MSSEOutput,n*3/2,ncols,n0 );
    }
    for (j=n;j>=nrows;j--)  {
      MSSEOutput[j] = new ssm::MSSEOutput[nStruct];
      for (j1=0;j1<nStruct;j1++)  {
        MSSEOutput[j][j1].Init();
        if (ic2[j1]>=ic1[j1])  {
          MSSEOutput[j][j1].SetSSERange ( GV[j1][ic2[j1]] );
          MSSEOutput[j][j1].aligned = (j==n);
          d[j1][ic2[j1]] = true;
        }
        ic2[j1]--;
      }
    }
    nrows = n+1;  // number of completed rows
    // find the number of following unmatched SSEs
    m = 0;
    for (j=0;j<nStruct;j++)  {
      ic1[j] = S[j]->F[i]-1;
      n      = GV[j][ic1[j]]->GetVertexChainNo();
      j1     = i+1;
      while (j1<=S[0]->nV)  {
        k = S[j]->F[j1]-1;
        if (!strcmp(GV[j][k]->GetChainID(),
                    GV[j][ic1[j]]->GetChainID()))  {
          ic2[j] = (ic1[j]+k)/2;
          n      = GV[j][ic2[j]]->GetVertexChainNo() - n;
          break;
        } else
          j1++;
      }
      if (j1>S[0]->nV)  {
        k = ic1[j]+1;
        while (k<nvert[j])
          if (strcmp(GV[j][k]->GetChainID(),
                     GV[j][ic1[j]]->GetChainID()))  break;
                                              else  k++;
        ic2[j] = k-1;
        n = ic2[j]-ic1[j];
      }
      m = mmdb::IMax ( m,n );
    }
    n = nrows+m;
    if (n>n0)  {
//      n0 = n*3/2;
      ExpandSSEOut ( MSSEOutput,n*3/2,ncols,n0 );
    }
    for (j=nrows;j<n;j++)  {
      MSSEOutput[j] = new ssm::MSSEOutput[nStruct];
      for (j1=0;j1<nStruct;j1++)  {
        ic1[j1]++;
        MSSEOutput[j][j1].Init();
        if (ic1[j1]<=ic2[j1])  {
          MSSEOutput[j][j1].SetSSERange ( GV[j1][ic1[j1]] );
          d[j1][ic1[j1]] = true;
        }
      }
    }
    for (j1=0;j1<nStruct;j1++)
      ic1[j1]++;
    nrows = n;
  }

  k = nrows;
  for (i=0;i<nStruct;i++)  {
    n = nrows;
    for (j=0;j<nvert[i];j++)
      if (!d[i][j])  {
        if (n>n0)  {
//          n0 = n+nvert[i];
          ExpandSSEOut ( MSSEOutput,n+nvert[i],ncols,n0 );
        }
        if (!MSSEOutput[n])  {
          MSSEOutput[n] = new ssm::MSSEOutput[nStruct];
          for (j1=0;j1<nStruct;j1++)
            MSSEOutput[n][j1].Init();
        }
        MSSEOutput[n][i].SetSSERange ( GV[i][j] );
        n++;
        if (n>k)  k = n;
      }
  }
  nrows = k;

  if (nrows>0)  {
    for (j=0;j<nStruct;j++)  {
      MSSEOutput[0][j].loopNo = 1;
      for (i=1;i<nrows;i++)
        if (MSSEOutput[i][j].name1[0])  {
          m = 0;
          k = 0;
          for (j1=0;(j1<i) && (!m);j1++)
            if (MSSEOutput[j1][j].name1[0])  {
              if (!strcmp(MSSEOutput[i][j].chID,
                          MSSEOutput[j1][j].chID))
                m = MSSEOutput[j1][j].loopNo;
              else if (MSSEOutput[j1][j].loopNo>k)
                k = MSSEOutput[j1][j].loopNo;
            }
          if (!m)  m = k+1;
          MSSEOutput[i][j].loopNo = m;
        } else
          MSSEOutput[i][j].loopNo = MSSEOutput[i-1][j].loopNo;
    }
  }

  if (GV)  delete[] GV;
  mmdb::FreeMatrixMemory ( d,nStruct,0,0 );
  mmdb::FreeVectorMemory ( nvert,0 );
  mmdb::FreeVectorMemory ( ic1,0 );
  mmdb::FreeVectorMemory ( ic2,0 );

}

namespace ssm  {

  void ExpandMAOut ( PPMAOutput & MAOutput, int nrows1,
                     int ncols, int & nrows0 )  {
  PPMAOutput M;
  int         i,j;
    M = new PMAOutput[nrows1];
    for (i=0;i<nrows0;i++)
      if (MAOutput[i])  {
        M[i] = new ssm::MAOutput[ncols];
        for (j=0;j<ncols;j++)
          M[i][j].Copy ( MAOutput[i][j] );
      } else
        M[i] = NULL;
    for (i=nrows0;i<nrows1;i++)
      M[i] = NULL;
    FreeMSOutput ( MAOutput,nrows0 );
    MAOutput = M;
    nrows0   = nrows1;
  }

}

void ssm::MultAlign::GetMAOutput ( PPMAOutput & MAOut,
                                   int & nrows, int & ncols )  {
mmdb::ivector ic1,ic2;
int     i,j,k,m,ic,n0;
bool done;

  FreeMSOutput ( MAOut,nrows );

  ncols = nStruct;
  if (nStruct<=0)  return;

  SelectCalphas();

  n0 = -1;
  for (i=0;i<nStruct;i++)
    if (S[i]->SD.nres>n0)
      n0 = S[i]->SD.nres;

  if (n0<=0)  {
    DeselectCalphas();
    return;
  }

  n0 = 2*n0+1;
  MAOut = new PMAOutput[n0];
  for (i=0;i<n0;i++)
    MAOut[i] = NULL;

  mmdb::GetVectorMemory ( ic1,nStruct,0 );
  mmdb::GetVectorMemory ( ic2,nStruct,0 );
  for (i=0;i<nStruct;i++)  {
    ic1[i] = 0;  // structure cursors
    ic2[i] = 0;  // structure cursors
  }

  nrows = 0;

  do  {

    done = false;

    // Align last C-alphas in the gap to the begining of the block.
    // Non-aligned C-alphas are skipped in all structures, and
    // cursors ic2 are set to the first aligned row, which starts
    // a block of aligned residues.
    k  = 0; // k counts the maximal number of non-aligned residues
            // between the bloacks.
    ic = 0; // ic counts the number of structures for which cursors
            // have run out of range
    for (i=0;i<nStruct;i++)  {
      j = ic1[i];
      while (j<S[i]->SD.nres)
        if (S[i]->SD.a[j].c<0)  j++;
                          else  break;
      if (j>=S[i]->SD.nres)  ic++;
      m = j-ic1[i];
      if (m>k)  k = m;
      ic2[i] = j;  // cursor set on first aligned C-alpha in the block
    }
//    if (ic>=nStruct)  done = true;

    if (ic>0)  done = true;  // quit if any cursor is out of range

    if (!done)  {

      if (k>0)  {
        m      = nrows;
        nrows += k;
        if (nrows>n0)
          ExpandMAOut ( MAOut,nrows*3/2,ncols,n0 );
        for (i=m;i<nrows;i++)  {
          MAOut[i] = new ssm::MAOutput[nStruct];
          for (j=0;j<nStruct;j++)
            MAOut[i][j].Init();
        }
        for (i=0;i<nStruct;i++)  {
          j = ic2[i]-1;  // last non-aligned C-alpha before the block
          k = nrows-1;   // and its position in the aligned table
          while (j>=ic1[i])  {
            MAOut[k][i].Fill(S[i]->SD.Calpha[j],S[i]->SD.G,false);
            k--;
            j--;
          }
        }
      }

      // align C-alphas in the block
      k = mmdb::MaxInt4;
      ic = 0;
      for (i=0;i<nStruct;i++)  {
        ic1[i] = ic2[i];
        j      = ic1[i];
        while (j<S[i]->SD.nres)
          if (S[i]->SD.a[j].c>=0)  j++;
                            else  break;
        if (j>=S[i]->SD.nres)  ic++;
        m = j-ic1[i];
        if ((m>=0) && (m<k))  k = m;
      }
      // quit only if all cursors ran to the end
      if (ic>=nStruct)  done = true;
//      if (ic>0)  done = true;
      if (k>0)  {
        m = nrows+k;
        if (m>n0)
          ExpandMAOut ( MAOut,m*3/2,ncols,n0 );
        for (i=nrows;i<m;i++)  {
          MAOut[i] = new MAOutput[nStruct];
          for (j=0;j<nStruct;j++)
            MAOut[i][j].Init();
        }
        for (i=0;i<nStruct;i++)  {
          j = ic1[i];
          ic2[i] = mmdb::IMin(S[i]->SD.nres,j+k);
          m = nrows;
          for (j=ic1[i];j<ic2[i];j++)  {
            MAOut[m][i].Fill ( S[i]->SD.Calpha[j],S[i]->SD.G,true );
            m++;
          }
          ic1[i] = ic2[i];
        }
        nrows += k;
      }

    }

    // align C-alphas in the following gap to the end of the block
    k = 0;
    ic = 0;
    for (i=0;i<nStruct;i++)  {
      j = ic1[i];
      while (j<S[i]->SD.nres)
        if (S[i]->SD.a[j].c<0)  j++;
                          else  break;
      if (j>=S[i]->SD.nres)  ic++;
                       else  j = mmdb::mround((j+ic1[i]+0.25)/2.0);
      m = j-ic1[i];
      if (m>k)  k = m;
      ic2[i] = j;  // cursor set on between the aligned blocks
    }
//    if (ic>=nStruct)  done = true;
    if (ic>0)  done = true;   // quit if any cursor is out of range
    if (k>0)  {
      m      = nrows;
      nrows += k;
      if (nrows>n0)
        ExpandMAOut ( MAOut,nrows*3/2,ncols,n0 );
      for (i=m;i<nrows;i++)  {
        MAOut[i] = new MAOutput[nStruct];
        for (j=0;j<nStruct;j++)
          MAOut[i][j].Init();
      }
      for (i=0;i<nStruct;i++)  {
        k = m;
        for (j=ic1[i];j<ic2[i];j++)  {
          MAOut[k][i].Fill ( S[i]->SD.Calpha[j],S[i]->SD.G,false );
          k++;
        }
        ic1[i] = ic2[i];
      }
    }

  } while (!done);

  mmdb::FreeVectorMemory ( ic1,0 );
  mmdb::FreeVectorMemory ( ic2,0 );

  DeselectCalphas();

}


void ssm::MultAlign::WriteMultAlign ( mmdb::io::RFile f )  {
PPMAOutput MAOut;
char       L[100],SS[4];
int        nrows,ncols, i,j;

  MAOut = NULL;
  nrows = 0;
  ncols = 0;
  GetMAOutput ( MAOut,nrows,ncols );

  f.Write ( " " );
  for (i=0;i<nStruct;i++)  {
    if (i>0)  f.Write ( "| |" );
    sprintf ( L,"    %4s    ",S[i]->G->GetGraphName() );
    f.Write ( L );
  }
  f.LF();
  f.Write ( " " );
  for (i=0;i<nStruct;i++)  {
    if (i>0)  f.Write ( "+-+" );
      f.Write ( "------------" );
  }
  f.LF();

  for (i=0;i<nrows;i++)  {
    f.Write ( " " );
    for (j=0;j<ncols;j++)  {
      if (j>0)  {
        if (MAOut[i][j].aligned)  f.Write ( "|*|" );
                            else  f.Write ( "| |" );
      }
      if (MAOut[i][j].name[0]) {
        if (MAOut[i][j].sseType==V_HELIX)
             strcpy ( SS,"H|" );
        else if (MAOut[i][j].sseType==V_STRAND)
             strcpy ( SS,"S|" );
        else strcpy ( SS,"  " );
        sprintf ( L,"%2s%1s:%3s%4i%1s",SS,MAOut[i][j].chID,
                  MAOut[i][j].name,MAOut[i][j].seqNum,
                  MAOut[i][j].insCode );
      } else
        strcpy ( L,"            " );
      f.Write ( L );
    }
    f.LF();
  }

  f.Write ( " " );
  for (i=0;i<nStruct;i++)  {
    if (i>0)  f.Write ( "'-'" );
      f.Write ( "------------" );
  }
  f.LF();

  FreeMSOutput ( MAOut,nrows );

}


int  ssm::MultAlign::AlignCalphas()  {
//   Given the results of multiple graph matching, this function
// calculates the multiple superposition of C-alphas.
int rc;

  //  1. Obtain first approximation to optimal superposition
  rc = MakeFirstGuess();

  if (rc==MALIGN_Ok)  {

    //  2. Iteratively improve C-alpha alignments
    OptimizeAlignments();

    //  3. Restore original order of structures
    SortStructures();

    //  4. Calculate consensus scores
    CalcConsensusScores();

  }

  DeselectCalphas();

  return rc;

}

void  ssm::MultAlign::getAlignScores ( int      & n_align,
                                       int      & n_SSEs,
                                       mmdb::realtype & rmsd,
                                       mmdb::realtype & Qscore )  {
  n_align = Nalign;        // number of multuply-aligned rows
  n_SSEs  = nSSEalign;     // number of aligned SSEs
  rmsd    = rmsd_achieved; // achieved RMSD
  Qscore  = Q_achieved;    // achieved Q
}

void  ssm::MultAlign::getConsensusScores ( mmdb::rvector & cons_x,
                                           mmdb::rvector & cons_y,
                                           mmdb::rvector & cons_z,
                                           int     & cons_len,
                                           mmdb::rmatrix & m_rmsd,
                                           mmdb::rmatrix & m_Qscore,
                                           mmdb::rmatrix & m_seqId )  {
//  The function does not allocate the vectors, it simply
// returns pointers to the internal fields:
// cons_x,y,z[0..conslen-1], m_rmsd,Qscore[0..nStruct][0..nStruct]
  cons_x   = xc;
  cons_y   = yc;
  cons_z   = zc;
  cons_len = maxNres;
  m_rmsd   = mx_rmsd;
  m_Qscore = mx_Qscore;
  m_seqId  = mx_seqId;
}

int   ssm::MultAlign::getNres ( int structNo )  {
  if ((structNo<0) || (structNo>=nStruct))  return 0;
  if (S[structNo])  return S[structNo]->SD.nres;
  return 0;
}

bool ssm::MultAlign::getAlignment ( int structNo, mmdb::ivector & Ca,
                                       int & nres )  {
int i;
  mmdb::FreeVectorMemory ( Ca,0 );
  nres = 0;
  if ((structNo<0) || (structNo>=nStruct))  return false;
  if (S[structNo])  {
    if (S[structNo]->SD.a)  {
      nres = S[structNo]->SD.nres;
      mmdb::GetVectorMemory ( Ca,nres,0 );
      for (i=0;i<nres;i++)
        Ca[i] = S[structNo]->SD.a[i].c0;
      return true;
    }
  }
  return false;
}

bool ssm::MultAlign::getTMatrix ( mmdb::mat44 & TMatrix, int structNo )  {
  if ((structNo>=0) && (structNo<nStruct))  {
    if (S[structNo])  {
      mmdb::Mat4Copy ( S[structNo]->RT0,TMatrix );
      return true;
    }
  }
  mmdb::Mat4Init ( TMatrix );
  return false;
}

void  ssm::MultAlign::read  ( mmdb::io::RFile )  {
}

void  ssm::MultAlign::write ( mmdb::io::RFile )  {
}



