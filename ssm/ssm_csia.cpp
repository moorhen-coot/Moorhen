// $Id: ssm_csia.cpp $
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
//  **** Module  :  ssm_csia       <implementation>
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

#include "ssm_csia.h"

//  =========================  ssm::Match  ===========================

ssm::Match::Match() : mmdb::io::Stream()  {
  InitMatch();
}

ssm::Match::Match ( mmdb::io::RPStream Object )
          : mmdb::io::Stream ( Object )  {
  InitMatch();
}

ssm::Match::Match ( mmdb::ivector FV1, mmdb::ivector FV2,
                    int nv, int n, int m )  {
int i;
  if (FV1 && FV2)  {
    n1     = n;
    n2     = m;
    nAlloc = n;
    mmdb::GetVectorMemory ( F1,nAlloc,1 );
    mmdb::GetVectorMemory ( F2,nAlloc,1 );
    mlength = nv;
    for (i=1;i<=mlength;i++)  {
      F1[i] = FV1[i];
      F2[i] = FV2[i];
    }
  } else
    InitMatch();
}

void  ssm::Match::InitMatch()  {
  mlength = 0;
  n1      = 0;
  n2      = 0;
  nAlloc  = 0;
  F1      = NULL;
  F2      = NULL;
}

ssm::Match::~Match()  {
  mmdb::FreeVectorMemory ( F1,1 );
  mmdb::FreeVectorMemory ( F2,1 );
}

void  ssm::Match::Swap()  {
mmdb::ivector F;
int           n;
  n  = n1;
  n1 = n2;
  n2 = n;
  F  = F1;
  F1 = F2;
  F2 = F;
}

void ssm::Match::SetMatch ( mmdb::ivector FV1, mmdb::ivector FV2, int nv, int n, int m )  {
int i,j,k;
  if (FV1 && FV2)  {
    if (nv>nAlloc)  {
      mmdb::FreeVectorMemory ( F1,1 );
      mmdb::FreeVectorMemory ( F2,1 );
      nAlloc = n;
      mmdb::GetVectorMemory  ( F1,nAlloc,1 );
      mmdb::GetVectorMemory  ( F2,nAlloc,1 );
    }
    n1 = n;
    n2 = m;
    mlength = nv;
    for (i=1;i<=mlength;i++)  {
      F1[i] = FV1[i];
      F2[i] = FV2[i];
    }
    for (i=1;i<mlength;i++)
      for (j=i+1;j<=mlength;j++)
        if (F1[i]>F1[j])  {
          k = F1[i];  F1[i] = F1[j];  F1[j] = k;
          k = F2[i];  F2[i] = F2[j];  F2[j] = k;
        }
  } else  {
    mmdb::FreeVectorMemory ( F1,1 );
    mmdb::FreeVectorMemory ( F2,1 );
    mlength = 0;
    n1 = 0;
    n2 = 0;
  }
}


bool ssm::Match::isMatch ( mmdb::ivector FV1, mmdb::ivector FV2, int nv )  {
//   Returns true if all pairs (FV1[i],FV2[i]), i=1..nv are
// found in the match
int  i,j;
bool B;
  if (FV1 && FV2 && (nv==mlength))  {
    B = true;
    for (i=1;(i<=nv) && B;i++)  {
      B = false;
      for (j=1;(j<=mlength) && (!B);j++)
        B = (FV1[i]==F1[j]) && (FV2[i]==F2[j]);
    }
    return B;
  }
  return false;
}

int ssm::Match::isSubMatch ( mmdb::ivector FV1, mmdb::ivector FV2, int nv )  {
//   Returns true if all match's pairs (F1[i],F2[i]), i=1..mlength
// are found in (FV1,FV2)
int     i,j;
bool B;

  if (FV1 && FV2)  {
    B = true;
    if (nv>=mlength)  {
      // check if (F1,F2) makes a submatch of (FV1,FV2)
      for (i=1;(i<=mlength) && B;i++)  {
        B = false;
        for (j=1;(j<=nv) && (!B);j++)
          B = (F1[i]==FV1[j]) && (F2[i]==FV2[j]);
      }
      if (B)  return 1;
    } else  {
      // check if (FV1,FV2) makes a submatch of (F1,F2)
      for (i=1;(i<=nv) && B;i++)  {
        B = false;
        for (j=1;(j<=mlength) && (!B);j++)
          B = (FV1[i]==F1[j]) && (FV2[i]==F2[j]);
      }
      if (B) return -1;
    }
  }

  return 0;

}


void ssm::Match::GetMatch ( mmdb::ivector  & FV1, mmdb::ivector & FV2,
                            int & nv )  {
  FV1 = F1;
  FV2 = F2;
  nv  = mlength;
}

void ssm::Match::GetMatch ( mmdb::ivector  & FV1, mmdb::ivector  & FV2,
                            int & nv,
                            mmdb::realtype & p1,  mmdb::realtype & p2 )  {
  FV1 = F1;
  FV2 = F2;
  nv  = mlength;
  p1  = mlength;
  if (p1>0.0)  p1 /= n1;
  p2  = mlength;
  if (p2>0.0)  p2 /= n2;
}

void ssm::Match::write ( mmdb::io::RFile f )  {
int i;
int Version=1;
  f.WriteInt ( &Version );
  f.WriteInt ( &mlength );
  f.WriteInt ( &n1      );
  f.WriteInt ( &n2      );
  for (i=1;i<=mlength;i++)  {
    f.WriteInt ( &(F1[i]) );
    f.WriteInt ( &(F2[i]) );
  }
}

void ssm::Match::read ( mmdb::io::RFile f )  {
int i,Version;
  mmdb::FreeVectorMemory ( F1,1 );
  mmdb::FreeVectorMemory ( F2,1 );
  f.ReadInt ( &Version );
  f.ReadInt ( &mlength );
  f.ReadInt ( &n1      );
  f.ReadInt ( &n2      );
  if (mlength>0)  {
    nAlloc = n1;
    mmdb::GetVectorMemory ( F1,nAlloc,1 );
    mmdb::GetVectorMemory ( F2,nAlloc,1 );
    for (i=1;i<=mlength;i++)  {
      f.ReadInt ( &(F1[i]) );
      f.ReadInt ( &(F2[i]) );
    }
  }
}

namespace ssm  {
  MakeStreamFunctions(Match)
}


//  =========================  ssm::GraphMatch  ===========================

ssm::GraphMatch::GraphMatch() : mmdb::io::Stream()  {
  InitGraphMatch();
}

ssm::GraphMatch::GraphMatch ( mmdb::io::RPStream Object )
               : mmdb::io::Stream ( Object )  {
  InitGraphMatch();
}

ssm::GraphMatch::~GraphMatch()  {
  FreeMemory();
}

void  ssm::GraphMatch::InitGraphMatch()  {
  G1            = NULL;
  G2            = NULL;
  n             = 0;
  m             = 0;
  P             = NULL;
  F1            = NULL;
  F2            = NULL;
  iF1           = NULL;
  ix            = NULL;
  nAlloc        = 0;
  mAlloc        = 0;
  nMatches      = 0;
  maxNofMatches = 40;
  match         = NULL;
  nMAlloc       = 0;
  UniqueMatch   = true;
  BestMatch     = true;
  wasFullMatch  = false;
  swap          = false;
  Stop          = false;
  maxMatch      = 0;
  maxCollectedMatch = 0;
  flags         = 0;
}

void  ssm::GraphMatch::FreeMemory()  {
int i;

  if (P) {
    mmdb::FreeMatrixMemory ( P[1],nAlloc,1,0 );
    FreeRecHeap      ();
    for (i=2;i<=nAlloc;i++)
      if (P[i])  {
        P[i] = P[i] + 1;
        delete[] P[i];
      }
    P = P + 1;
    delete[] P;
    P = NULL;
  }

  mmdb::FreeMatrixMemory ( iF1,nAlloc,1,1 );

  mmdb::FreeVectorMemory ( F1,1 );
  mmdb::FreeVectorMemory ( F2,1 );
  mmdb::FreeVectorMemory ( ix,1 );
  nAlloc = 0;
  mAlloc = 0;

  if (match)  {
    for (i=0;i<nMAlloc;i++)
      if (match[i])  delete match[i];
    delete[] match;
  }
  match    = NULL;
  nMatches = 0;
  nMAlloc  = 0;

}

void  ssm::GraphMatch::FreeRecHeap()  {
int i,j;
  if (P)
    for (i=2;i<=nAlloc;i++)
      if (P[i])
        for (j=1;j<=nAlloc;j++)
          mmdb::FreeVectorMemory ( P[i][j],0 );
}

void  ssm::GraphMatch::GetMemory()  {
int i,j;

  FreeMemory();

  P = new mmdb::imatrix[n];
  P = P - 1;
  mmdb::GetMatrixMemory ( P[1],n,m+1,1,0 );
  for (i=2;i<=n;i++)  {
    P[i] = new mmdb::ivector[n];
    P[i] = P[i] - 1;
    for (j=1;j<=n;j++)
      P[i][j] = NULL;
  }

  mmdb::GetMatrixMemory ( iF1,n,n,1,1 );

  mmdb::GetVectorMemory ( F1,n,1 );
  mmdb::GetVectorMemory ( F2,n,1 );
  mmdb::GetVectorMemory ( ix,n,1 );

  nAlloc = n;
  mAlloc = m;

}

void  ssm::GraphMatch::GetRecHeap()  {
int i,j;
  for (i=2;i<=n;i++)
    for (j=1;j<=n;j++)
      mmdb::GetVectorMemory ( P[i][j],P[1][j][0]+1,0 );
}


void  ssm::GraphMatch::SetUniqueMatch ( bool unique_match )  {
  UniqueMatch = unique_match;
  if (UniqueMatch)  flags |=  SSMF_UniqueMatch;
              else  flags &= ~SSMF_UniqueMatch;
}

void  ssm::GraphMatch::SetBestMatch ( bool best_match )  {
  BestMatch = best_match;
  if (BestMatch)  flags |=  SSMF_BestMatch;
            else  flags &= ~SSMF_BestMatch;
}

void  ssm::GraphMatch::SetFlags ( mmdb::word Flags )  {
  flags |= Flags;
  if (Flags & SSMF_UniqueMatch)  UniqueMatch = true;
  if (Flags & SSMF_BestMatch)    BestMatch   = true;
}

void  ssm::GraphMatch::SetMatchBufferLength ( int matchBufLen )  {
  maxNofMatches = matchBufLen;
}


void  ssm::GraphMatch::RemoveFlags ( mmdb::word Flags )  {
  flags &= ~Flags;
  if (Flags & SSMF_UniqueMatch)  UniqueMatch = false;
  if (Flags & SSMF_BestMatch)    BestMatch   = false;
}


ssm::PGraph  ssm::GraphMatch::GetGraph1()  {
  if (swap)  return G2;
       else  return G1;
}

ssm::PGraph  ssm::GraphMatch::GetGraph2()  {
  if (swap)  return G1;
       else  return G2;
}

void  ssm::GraphMatch::MatchGraphs ( PGraph Gh1, PGraph Gh2,
                                     int minMatch )  {
int  i,j;

  nMatches = 0;
  maxCollectedMatch = 0;
  maxRecursionLevel = 0;

  if ((!Gh1) || (!Gh2))  return;

  if (Gh1->nVertices<=Gh2->nVertices)  {
    G1   = Gh1;
    G2   = Gh2;
    swap = false;
  } else  {
    G1   = Gh2;
    G2   = Gh1;
    swap = true;
  }
  n  = G1->nVertices; // n <= m
  m  = G2->nVertices;
  V1 = G1->V;
  V2 = G2->V;
  E1 = G1->E;
  E2 = G2->E;
  c1 = G1->graph;     // c[i][j] is the ordinal number of edge connecting
  c2 = G2->graph;     // vertices i and j; c[i][i]==-1.

  if (n==1)  {
    MatchSingleVertex();
    if (swap)  {
      for (i=0;i<nMatches;i++)
        if (match[i])  match[i]->Swap();
    }
    return;
  }

  if ((!c1) || (!c2) || (n<=0))  return;

  if ((n>nAlloc) || (m>mAlloc))  GetMemory();

  Stop  = false;

  DoMatch ( minMatch );

  if (flags & SSMF_WrongConnectOnly)  {
    for (i=0;i<nMatches;i++)
      if (CheckConnectivity(i)<2)  {
        if (match[i])  delete match[i];
        match[i] = NULL;
      }
    j = 0;
    for (i=0;i<nMatches;i++)
      if (match[i])  {
        if (j!=i)  {
          match[j] = match[i];
          match[i] = NULL;
        }
        j++;
      }
    nMatches = j;
  }

  if (swap)  {
    for (i=0;i<nMatches;i++)
      if (match[i])  match[i]->Swap();
  }

}


void  ssm::GraphMatch::MatchSingleVertex()  {
int     i, BF1[3],BF2[3];
mmdb::ivector SF1,SF2;

  SF1 = F1;
  SF2 = F2;

  F1  = BF1;
  F2  = BF2;

  V1[0]->SetID ( 1 );
  if (m<=1)
    V2[0]->SetID ( 1 );

  F1[1] = 1;
  for (i=1;i<=m;i++)
    if (V1[0]->Compare(V2[i-1]))  {
      F2[1] = i;
      CollectMatch ( 1 );
    }

  F1 = SF1;
  F2 = SF2;

}



void  ssm::GraphMatch::DoMatch ( int minMatch )  {
//    Use of Bactrack(..) and Ullman() is completely
//  equivalent. One of them should be commented.
int n1;

  FreeRecHeap();
  n1 = Initialize();

  if (n1<=0)  return;

  GetRecHeap ();

  maxMatch = mmdb::IMax(1,mmdb::IMin(n,minMatch));

  if (minMatch<n)  {  // make partial match
    if (n1>=minMatch)  Backtrack1 ( 1,n1 );
  } else if (n1>=n)
    Backtrack ( 1 );

}


int  ssm::GraphMatch::Initialize()  {
mmdb::ivector jF1;
int     i,j,iW,pl;

  wasFullMatch = false;

  jF1 = iF1[1];
  for (i=1;i<=n;i++)
    jF1[i] = i;

  for (i=1;i<=n;i++)  {
    ix[i] = 0;
    pl    = 0;
    for (j=1;j<=m;j++)
      if (V1[i-1]->Compare(V2[j-1]))
        P[1][i][++pl] = j;
    P[1][i][0] = pl;
    if (pl)  ix[i] = i;
    F1[i] = 0;
    F2[i] = 0;
  }

  i = 1;
  j = n;
  while (i<j)
    if (ix[j]==0)  // make sure that j points on a true-containing
      j--;         // row of P[1]
    else  {
      if (ix[i]==0)  {   // swap lower empty row of P[1]
        iW     = ix[i];  // with the lth one, which
        ix[i]  = ix[j];  // is surely not empty
        ix[j]  = iW;
        iW     = jF1[i];
        jF1[i] = jF1[j];
        jF1[j] = iW;
      }
      i++;
    }

  if (ix[i]==0)  return i-1;
           else  return i;

}


void  ssm::GraphMatch::Backtrack ( int i )  {
//   Recursive version of Ullman's algorithm for full
// (structure-to-structure or structure-to-substructure)
// match.
int     pli,i1,cntj,j,pl1,pl2,k,cntl,l,c1ik;
mmdb::ivector c1i,c2j, p1,p2;

  if (i>maxRecursionLevel)  maxRecursionLevel = i;

  F1[i] = i;
  pli   = P[i][i][0];

  if (i>=n)  {

    for (cntj=1;cntj<=pli;cntj++)  {
      F2[n] = P[n][n][cntj];
      CollectMatch ( n );
    }

  } else  {

    i1  = i+1;
    c1i = c1[i];

    for (cntj=1;cntj<=pli;cntj++)  {
      j     = P[i][i][cntj];
      F2[i] = j;  // mapped F1[i]:F2[i], i.e. i:j
      // Forward checking
      c2j   = c2[j];
      pl2   = 1;
      for (k=i1;(k<=n) && (pl2>0);k++)  {
        p1   = P[i][k];
        p2   = P[i1][k];
        c1ik = c1i[k];
        pl1  = p1[0];
        pl2  = 0;
        for (cntl=1;cntl<=pl1;cntl++)  {
          l = p1[cntl];
          // check that bonds are compatible and make sure jth vertex
          // is excluded
          if ((l!=j) && (c1ik>=0) && (c2j[l]>=0))  {
            if (G1->CompareEdges(i,k,G2,j,l)==0)
              p2[++pl2] = l;
          }
        }
        p2[0] = pl2;  //  new length of P-row
      }
      if (pl2>0)  Backtrack ( i1 );
    }

  }

}


void  ssm::GraphMatch::Backtrack1 ( int i, int k0 )  {
//   Recursive version of CSIA algorithm for partial
// (substructure-to-substructure) match.
int     pl0,i1,cntj,j,pl1,pl2,k,cntl,l,c1ik,iW,ii, k1;
mmdb::ivector jF1,c1i,c2j, p0,p1,p2;

  if (i>maxRecursionLevel)  maxRecursionLevel = i;

  jF1 = iF1[i];

  if (i>=k0)  {

    F1[k0] = jF1[k0];
    p0     = P[k0][jF1[k0]];
    pl0    = p0[0];

    if (pl0>0)  {
      // collect matches of k0-th (the upmost) level
      // because SSM graph matching provides only an
      // approximate to the solution, we gather all
      // matches that are one less than the currently
      // maximal
      if (BestMatch)  k = 1;
                else  k = 3;
      if (k0-k>maxMatch)  maxMatch = k0-k;
      for (cntj=1;cntj<=pl0;cntj++)  {
        F2[k0] = p0[cntj];
        CollectMatch ( k0 );
      }
    }

  } else  {

    i1  = i+1;

    pl0 = P[i][jF1[i]][0];
    j   = i;
    for (k=i1;k<=k0;k++)
      if (P[i][jF1[k]][0]<pl0)  {
        pl0 = P[i][jF1[k]][0];
        j   = k;
      }
    if (j>i)  {
      iW     = jF1[i];
      jF1[i] = jF1[j];
      jF1[j] = iW;
    }

    F1[i] = jF1[i];
    p0    = P[i][jF1[i]];
    pl0   = p0[0];

    c1i   = c1[jF1[i]];

    //  1. Find all matches that include jF1[i]th vertex of graph G1

    for (cntj=1;(cntj<=pl0) && (!Stop);cntj++)  {
      j     = p0[cntj];
      F2[i] = j;   // mapped F1[i]:F2[i], i.e. iF1[i][i]:j
      // Forward checking
      c2j   = c2[j];
      k1    = k0;   // k1 is the limit for match size
      for (k=i1;(k<=k0) && (k1>=maxMatch);k++)  {
        ix[k] = 0;
        p1    = P[i] [jF1[k]];
        p2    = P[i1][jF1[k]];
        c1ik  = c1i  [jF1[k]];
        pl1   = p1[0];
        pl2   = 0;
        for (cntl=1;cntl<=pl1;cntl++)  {
          l = p1[cntl];
          // check that bonds are compatible and make sure jth vertex
          // is excluded
          if ((l!=j) && (c1ik>=0) && (c2j[l]>=0))  {
            if (G1->CompareEdges(jF1[i],jF1[k],G2,j,l)==0)
              p2[++pl2] = l;
          }
        }
        p2[0] = pl2;  //  new length of P-row
        if (pl2>0)  {
          ix[k] = k;
        } else if (wasFullMatch)  {
          k1 = maxMatch-1;  // we are not interested in partial match anymore
        } else  {
          k1--;
        }
      }
      if (k1>=maxMatch)  {
        // shift unmatching vertices to the end
        for (ii=1;ii<=n;ii++)
          iF1[i1][ii] = jF1[ii];
        k = i1;
        l = k0;
        while (k<l)
          if (ix[l]==0)  // make sure that l points on a true-containing
            l--;         // row of P[i1]
          else  {
            if (ix[k]==0)  {            // swap lower empty row of P[i1]
              iW         = ix[k];       // with the lth one, which
              ix[k]      = ix[l];       // is surely not empty
              ix[l]      = iW;
              iW         = iF1[i1][k];
              iF1[i1][k] = iF1[i1][l];
              iF1[i1][l] = iW;
            }
            k++;
          }
        if (ix[i1])  Backtrack1 ( i1,k1 );
        else if (i>=maxMatch)  {
          CollectMatch ( i );  // collect match of ith level
          // because SSM graph matching provides only an
          // approximate to the solution, we gather all
          // matches that are one less than the currently
          // maximal
          if (BestMatch)  k = 1;
                    else  k = 3;
          if (i-k>maxMatch)  maxMatch = i-k;
        }
      }
    }

    //  2. Find all matches that do not include jF1[i]th vertex of graph G1

    if (k0>maxMatch)  {
      //   Shift jF1[i]th vertex to the end
      iW      = jF1[i];
      jF1[i]  = jF1[k0];
      jF1[k0] = iW;
      Backtrack1 ( i,k0-1 );
    }

  }

}


void  ssm::GraphMatch::CollectMatch ( int nm )  {
PMatch  M;
PPMatch M1;
int     i,j,k;
bool B;

  // Find out if this should be a new match. The present code
  // works such that all stored matches have the same length
  // that is the maximal one detected.
  if (nMatches>0)  {
    if (BestMatch)  {
      // because SSE graph matching provides only an approximation
      // to the solution, we keep matches with maximal and
      // maximal minus 1 lengths
      if (nm<maxCollectedMatch-1)  return;
      if (nm>maxCollectedMatch)  {
        k = nm-1;
        i = 0;
        while (i<nMatches)  {
          if (match[i]->mlength<k)  {
            // match[i] is unlikely to become the best one, remove it
            M = match[i];
            for (j=i+1;j<nMatches;j++)
              match[j-1] = match[j];
            nMatches--;
            match[nMatches] = M;
          } else
            i++;
        }
      }
    } else  {
      // delete all matches that are full submatches of the
      // new one
      i = 0;
      k = 0;
      while ((i<nMatches) && (k>=0))  {
        k = match[i]->isSubMatch ( F1,F2,nm );
        if (k>0)  {
          // match[i] is a submatch of (F1,F2). Remove match[i].
          M = match[i];
          for (j=i+1;j<nMatches;j++)
            match[j-1] = match[j];
          nMatches--;
          match[nMatches] = M;
        } else
          i++;
      }
      if (k<0)  // (F1,F2) is a submatch of match[i-1]. Quit.
        return;
    }
    if (UniqueMatch)  {
      // check if such a match was already found
      k = 0;
      for (i=0;(i<nMatches) && (k>=0);i++)
        k = match[i]->isSubMatch(F1,F2,nm);
      if (k<0)  return;  // repeating match -- just quit.
    }
  }

  B = true;
  if (nMatches>=maxNofMatches)  {
    if (wasFullMatch)  {
      Stop = true;
      B    = false;
    }
    j = 0;
    k = match[0]->mlength;
    for (i=1;i<nMatches;i++)
      if (match[i]->mlength<k)  {
        k = match[i]->mlength;
        j = i;
      }
    if (k<nm)  {
      nMatches--;
      M = match[j];
      match[j] = match[nMatches];
      match[nMatches] = M;
    } else
      B = false;
  } else if (nMatches>=nMAlloc)  {
    nMAlloc += 100;
    M1 = new PMatch[nMAlloc];
    for (i=0;i<nMatches;i++)
      M1[i] = match[i];
    for (i=nMatches;i<nMAlloc;i++)
      M1[i] = NULL;
    if (match)  delete[] match;
    match = M1;
  }

  if (B)  {

    if (!match[nMatches])
          match[nMatches] = new ssm::Match ( F1,F2,nm,n,m );
    else  match[nMatches]->SetMatch ( F1,F2,nm,n,m );

    if (nm>maxCollectedMatch)  maxCollectedMatch = nm;

    if (nm==n)  wasFullMatch = true;

    nMatches++;

  }

}


void ssm::GraphMatch::GetMatches ( PPMatch & SSMatch, int & nOfMatches ) {
  SSMatch    = match;
  nOfMatches = nMatches;
}


int ssm::GraphMatch::GetNofMatches ( mmdb::realtype p1, mmdb::realtype p2 )  {
mmdb::realtype pp1,pp2;
mmdb::ivector  FV1,FV2;
int      i,n,nm;
  if ((p1==0.0) && (p2==0.0))
    n = nMatches;
  else  {
    n = 0;
    for (i=0;i<nMatches;i++)  {
      match[i]->GetMatch ( FV1,FV2,nm,pp1,pp2 );
      if ((pp1>=p1) && (pp2>=p2))  n++;
    }
  }
  return n;
}

void ssm::GraphMatch::GetMatch ( int   matchNo, int & matchLen,
                               mmdb::ivector  & F1, mmdb::ivector  & F2,
                               mmdb::realtype & p1, mmdb::realtype & p2 )  {
  if ((matchNo<0) && (matchNo>=nMatches))  {
    matchLen = -1;
    F1       = NULL;
    F2       = NULL;
    p1       = -1.0;
    p2       = -1.0;
  } else if (!match[matchNo]) {
    matchLen = -2;
    F1       = NULL;
    F2       = NULL;
    p1       = -2.0;
    p2       = -2.0;
  } else
    match[matchNo]->GetMatch ( F1,F2,matchLen,p1,p2 );
}


int  ssm::GraphMatch::CheckConnectivity ( int matchNo )  {
mmdb::ivector  v1,v2;
mmdb::realtype p1,p2;
int      mlength, i,j, conn;
  if ((0<=matchNo) && (matchNo<nMatches))  {
    // we don't need a swap here as we reference to already swapped
    // G1 and G2 anyway
    match[matchNo]->GetMatch ( v1,v2,mlength,p1,p2 );
    conn = 0;
    for (i=1;i<mlength;i++)
      for (j=i+1;j<=mlength;j++)
        conn = mmdb::IMax(conn,
                    G1->CheckEdgeConnectivity(v1[i],v1[j],G2,v2[i],v2[j]));
    return conn;  // 0 <-> connectivity Ok
                  // 1 <-> strict connectivity brocken, soft connectivity Ok
                  // 2 <-> both soft and strict connectivities are brocken
  }
  return -1;
}

void  ssm::GraphMatch::write ( mmdb::io::RFile f )  {
int i;
int Version=1;
  f.WriteInt  ( &Version     );
  f.WriteInt  ( &nMatches    );
  f.WriteBool ( &UniqueMatch );
  f.WriteBool ( &swap        );
  for (i=0;i<nMatches;i++)
    match[i]->write ( f );
  f.WriteWord ( &flags       );
}

void  ssm::GraphMatch::read ( mmdb::io::RFile f )  {
int i,Version;
  FreeMemory ();
  f.ReadInt  ( &Version      );
  f.ReadInt  ( &nMatches     );
  f.ReadBool ( &UniqueMatch  );
  f.ReadBool ( &swap         );
  if (nMatches>0)  {
    match = new PMatch[nMatches];
    for (i=0;i<nMatches;i++)  {
      match[i] = new Match();
      match[i]->read ( f );
    }
  }
  f.ReadWord ( &flags       );
}

namespace ssm {
  MakeStreamFunctions(GraphMatch)
}

