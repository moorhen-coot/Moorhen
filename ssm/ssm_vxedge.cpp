// $Id: ssm_vxedge.cpp $
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
//  **** Module  :  ssm_vxedge  <implementation>
//       ~~~~~~~~~
//  **** Classes :  ssm::Vertex  ( secondary structure graph vertex )
//       ~~~~~~~~~  ssm::Edge    ( secondary structure graph edge   )
//
//  E. Krissinel 2002-2014
//
// =================================================================
//

#include <stdlib.h>
#include <math.h>
#include <string.h>

#include "ssm_vxedge.h"
#include "mmdb2/mmdb_math_.h"



// ==========================  Tune-up  ============================

namespace ssm  {

  // estimate for distance between residues in a strand, in angstroms
  #define InterResidueSpace  3.7

  int      hx_min_len    = 5;       // minimal length of helices
  int      sd_min_len    = 3;       // minimal length of strands

  mmdb::realtype hx_nres_rtol  = 0.2;     // rel tolerance for length of helices
  mmdb::realtype sd_nres_rtol  = 0.2;     // rel tolerance for length of strands
  int            hx_nres_atol  = 6;       // abs tolerance for length of helices
  int            sd_nres_atol  = 3;       // abs tolerance for length of strands

  mmdb::realtype length_rtol   = 0.2;     // rel tol-ce for edge lengths
  mmdb::realtype length_atol   = 1.75;    // abs tol-ce for edge lengths
  mmdb::realtype ev_uncert_min = mmdb::Pi/9.0;  // min unc-ty in edge-vertex angles
  mmdb::realtype vv_uncert_min = mmdb::Pi/12.0; // min unc-ty in vertex-vertex angles
  mmdb::realtype tn_uncert_min = mmdb::Pi/12.0; // min unc-ty in torsion angles
  mmdb::realtype ev_uncert_max = mmdb::Pi/6.0;  // max unc-ty in edge-vertex angles
  mmdb::realtype vv_uncert_max = mmdb::Pi/8.0;  // max unc-ty in vertex-vertex angles
  mmdb::realtype tn_uncert_max = mmdb::Pi/9.0;  // max unc-ty in torsion angles

  int CheckSSConnectivity = CONNECT_None;


  void InitGraph()  {
    SetMatchPrecision ( PREC_Normal );
    CheckSSConnectivity = CONNECT_None;
  }

  void SetConnectivityCheck ( CONNECTIVITY checkMode )  {
    CheckSSConnectivity = checkMode;
  }

  void  SetMatchPrecision ( PRECISION precision )  {

    switch (precision)  {

      case PREC_Highest : hx_min_len    = 5;
                          sd_min_len    = 3;
                          hx_nres_rtol  = 0.125;
                          sd_nres_rtol  = 0.125;
                          hx_nres_atol  = 2;
                          sd_nres_atol  = 0;
                          length_rtol   = 0.10;
                          length_atol   = 0.75;
                          ev_uncert_min = 0.0;
                          vv_uncert_min = 0.0;
                          tn_uncert_min = 0.0;
                          ev_uncert_max = mmdb::Pi/12.0;
                          vv_uncert_max = mmdb::Pi/16.0;
                          tn_uncert_max = mmdb::Pi/16.0;
                        break;

      case PREC_High    : hx_min_len    = 5;
                          sd_min_len    = 3;
                          hx_nres_rtol  = 0.15;
                          sd_nres_rtol  = 0.15;
                          hx_nres_atol  = 3;
                          sd_nres_atol  = 1;
                          length_rtol   = 0.15;
                          length_atol   = 1.25;
                          ev_uncert_min = mmdb::Pi/12.0;
                          vv_uncert_min = mmdb::Pi/16.0;
                          tn_uncert_min = mmdb::Pi/16.0;
                          ev_uncert_max = mmdb::Pi/9.0;
                          vv_uncert_max = mmdb::Pi/12.0;
                          tn_uncert_max = mmdb::Pi/12.0;
                        break;
      default           :
      case PREC_Normal  : hx_min_len    = 5;
                          sd_min_len    = 3;
                          hx_nres_rtol  = 0.2;     // 0.2
                          sd_nres_rtol  = 0.2;     // 0.2
                          hx_nres_atol  = 6;       // 6
                          sd_nres_atol  = 3;       // 2
                          length_rtol   = 0.2;     // 0.2
                          length_atol   = 1.75;    // 1.5
                          ev_uncert_min = mmdb::Pi/9.0;  // Pi/9.0
                          vv_uncert_min = mmdb::Pi/12.0; // Pi/12.0
                          tn_uncert_min = mmdb::Pi/12.0; // Pi/12.0
                          ev_uncert_max = mmdb::Pi/6.0;  // Pi/6.0
                          vv_uncert_max = mmdb::Pi/8.0;  // Pi/9.0
                          tn_uncert_max = mmdb::Pi/9.0;  // Pi/9.0
                        break;

      case PREC_Low     : hx_min_len    = 5;
                          sd_min_len    = 3;
                          hx_nres_rtol  = 0.30;
                          sd_nres_rtol  = 0.30;
                          hx_nres_atol  = 6;
                          sd_nres_atol  = 3;
                          length_rtol   = 0.30;
                          length_atol   = 2.0;
                          ev_uncert_min = mmdb::Pi/5.0;
                          vv_uncert_min = mmdb::Pi/8.0;
                          tn_uncert_min = mmdb::Pi/8.0;
                          ev_uncert_max = mmdb::Pi/5.0;
                          vv_uncert_max = mmdb::Pi/6.0;
                          tn_uncert_max = mmdb::Pi/6.0;
                        break;

      case PREC_Lowest  : hx_min_len    = 5;
                          sd_min_len    = 3;
                          hx_nres_rtol  = 0.35;
                          sd_nres_rtol  = 0.35;
                          hx_nres_atol  = 9;
                          sd_nres_atol  = 3;
                          length_rtol   = 0.5;
                          length_atol   = 2.5;
                          ev_uncert_min = mmdb::Pi/5.0;
                          vv_uncert_min = mmdb::Pi/6.0;
                          tn_uncert_min = mmdb::Pi/6.0;
                          ev_uncert_max = mmdb::Pi/4.0;
                          vv_uncert_max = mmdb::Pi/5.0;
                          tn_uncert_max = mmdb::Pi/5.0;
                        break;

    }

  }

  void  writeMatchParameters ( mmdb::pstr FileName )  {
  mmdb::mmcif::Data  CIF;
  mmdb::realtype     Deg;
    Deg = 180.0/mmdb::Pi;
    CIF.PutReal    ( hx_nres_rtol,"_helix" ,"rel_length_tolerance" );
    CIF.PutReal    ( sd_nres_rtol,"_strand","rel_length_tolerance" );
    CIF.PutInteger ( hx_nres_atol,"_helix" ,"abs_length_tolerance" );
    CIF.PutInteger ( sd_nres_atol,"_strand","abs_length_tolerance" );
    CIF.PutReal    ( length_rtol      ,"_bond_length"  ,"relative_tolerance"  );
    CIF.PutReal    ( length_atol      ,"_bond_length"  ,"absolute_tolerance"  );
    CIF.PutReal    ( ev_uncert_min*Deg,"_edge_vertex"  ,"minimal_uncertainty" );
    CIF.PutReal    ( ev_uncert_max*Deg,"_edge_vertex"  ,"maximal_uncertainty" );
    CIF.PutReal    ( vv_uncert_min*Deg,"_vertex_vertex","minimal_uncertainty" );
    CIF.PutReal    ( vv_uncert_max*Deg,"_vertex_vertex","maximal_uncertainty" );
    CIF.PutReal    ( tn_uncert_min*Deg,"_edge_torsion" ,"minimal_uncertainty" );
    CIF.PutReal    ( tn_uncert_max*Deg,"_edge_torsion" ,"maximal_uncertainty" );
    CIF.PutInteger ( CheckSSConnectivity,"_check" ,"connectivity" );
    CIF.WriteMMCIFData ( FileName );
  }

  int  readMatchParameters ( mmdb::pstr FileName )  {
  mmdb::mmcif::Data CIF;
  mmdb::realtype    Deg,r;
  int               RC,i;

    CIF.SetFlag ( mmdb::mmcif::CIFFL_PrintWarnings );
    RC = CIF.ReadMMCIFData ( FileName );
    if (RC)  return RC;

    if (!CIF.GetReal(r,"_helix" ,"rel_length_tolerance"))     hx_nres_rtol = r;
    if (!CIF.GetReal(r,"_strand","rel_length_tolerance"))     sd_nres_rtol = r;
    if (!CIF.GetInteger(i,"_helix" ,"abs_length_tolerance"))  hx_nres_atol = i;
    if (!CIF.GetInteger(i,"_strand","abs_length_tolerance"))  sd_nres_atol = i;
    if (!CIF.GetReal(r,"_bond_length","relative_tolerance"))  length_rtol  = r;
    if (!CIF.GetReal(r,"_bond_length","absolute_tolerance"))  length_atol  = r;
    if (!CIF.GetInteger(i,"_check" ,"connectivity"))   CheckSSConnectivity = i;

    Deg = mmdb::Pi/180.0;

    if (!CIF.GetReal(r,"_edge_vertex","minimal_uncertainty"))
                      ev_uncert_min = r*Deg;
    if (!CIF.GetReal(r,"_edge_vertex","maximal_uncertainty"))
                      ev_uncert_max = r*Deg;
    if (!CIF.GetReal(r,"_vertex_vertex","minimal_uncertainty"))
                      vv_uncert_min = r*Deg;
    if (!CIF.GetReal(r,"_vertex_vertex","maximal_uncertainty"))
                      vv_uncert_max = r*Deg;
    if (!CIF.GetReal(r,"_edge_torsion" ,"minimal_uncertainty"))
                      tn_uncert_min = r*Deg;
    if (!CIF.GetReal(r,"_edge_torsion" ,"maximal_uncertainty"))
                      tn_uncert_max = r*Deg;

    return 0;

  }

}

// =========================  ssm::Vertex  ===========================


ssm::Vertex::Vertex() : mmdb::io::Stream()  {
  InitVertex();
}

ssm::Vertex::Vertex ( mmdb::io::RPStream Object )
           : mmdb::io::Stream(Object)  {
  InitVertex();
}

ssm::Vertex::~Vertex()  {
  FreeMemory();
}

void  ssm::Vertex::FreeMemory()  {
  if (name)  delete[] name;
  name = NULL;
  nres = 0;
}

void  ssm::Vertex::InitVertex()  {

  id      = 0;     // a unique id
  type    = V_UNKNOWN; // type: helix or strand
  classID = 0;     // class for helix
  nres    = 0;     // number of residues in the structure
  x0      = 0.0;   // x-center of mass
  y0      = 0.0;   // y-center of mass
  z0      = 0.0;   // z-center of mass
  mass    = 0.0;   // the mass
  ex      = 0.0;   // x-direction of mass tensor's principal axis
  ey      = 0.0;   // y-direction of mass tensor's principal axis
  ez      = 1.0;   // z-direction of mass tensor's principal axis
  dalpha  = 0.0;   // uncertainty angle
  length  = 0.0;   // vertex length

  name     = NULL;           // name for short identification
  mmdb::CreateCopy ( name   ,"" );
  serNum   = 0;              // helix serial number
  strandNo = 0;              // strand number
  strcpy ( vertexID   ,"" ); // helix ID or sheet ID
  strcpy ( chainID    ,"" ); // chain ID (only for identification)
  strcpy ( initResName,"" ); // name of the strand's initial residue
  strcpy ( initICode  ,"" ); // insertion code of the initial residue
  strcpy ( endResName ,"" ); // name of the strand's terminal residue
  strcpy ( endICode   ,"" ); // insertion code of the terminal residue
  initSeqNum = 0;            // sequence number of the initial residue
  initPos    = 0;            // sequence position of the initial residue
  endSeqNum  = -1;           // sequence number of the terminal residue
  endPos     = -1;           // sequence position of the terminal residue

  VNo        = 0;            // vertex number in the chain

  x1 = 0.0;  y1 = 0.0;  z1 = 0.0;
  x2 = 0.0;  y2 = 0.0;  z2 = 0.0;

}

void ssm::Vertex::GetDirection ( mmdb::vect3 & v )  {
  v[0] = ex;
  v[1] = ey;
  v[2] = ez;
}

void ssm::Vertex::GetPosition ( mmdb::vect3 & v )  {
  v[0] = x0;
  v[1] = y0;
  v[2] = z0;
}

void ssm::Vertex::GetPosition ( mmdb::realtype & vx0,
                                mmdb::realtype & vy0,
                                mmdb::realtype & vz0 )  {
  vx0 = x0;
  vy0 = y0;
  vz0 = z0;
}

int ssm::Vertex::GetPositions ( mmdb::PManager MMDB, int minlen )  {
mmdb::PPAtom CA;
int          selHnd_ca;

  initPos = MMDB->GetResidueNo ( 1,chainID,initSeqNum,initICode );
  endPos  = MMDB->GetResidueNo ( 1,chainID,endSeqNum ,endICode  );

  if ((initPos<0) || (endPos<0) || (endPos<initPos))  {
    initPos = -1;
    endPos  = -1;
  }

  VNo = 0;

  // find the vertex' geometrical attributes
  selHnd_ca = MMDB->NewSelection();
  MMDB->Select      ( selHnd_ca,mmdb::STYPE_ATOM,1,chainID,
                      initSeqNum,initICode,
                      endSeqNum,endICode,
                      "*","[ CA ]","*","*",mmdb::SKEY_NEW );
  MMDB->GetSelIndex ( selHnd_ca,CA,nres );

  if (nres>=minlen)  {

    if (!initResName[0])  strcpy ( initResName,CA[0]->GetResName()      );
    if (!endResName[0])   strcpy ( endResName ,CA[nres-1]->GetResName() );

    CalcGeometry ( CA );

  }

  MMDB->DeleteSelection ( selHnd_ca );

  if (nres>=minlen)  return 0;
               else  return 1;

}

bool ssm::Vertex::inRange ( mmdb::cpstr chID, int Pos1, int Pos2 )  {
  if (strcmp(chID,chainID))          return false;
  if (mmdb::IMax(Pos1,Pos2)<initPos) return false;
  if (mmdb::IMin(Pos1,Pos2)>endPos)  return false;
  return true;
}

int  ssm::Vertex::SetVertex ( mmdb::PManager MMDB, mmdb::PHelix Helix ) {
char  S[200];

  FreeMemory();

  id      = 0;
  type    = V_HELIX;
  classID = Helix->helixClass;

  sprintf    ( S,"%i[%s]",Helix->serNum,Helix->helixID );
  mmdb::CreateCopy ( name,S );

  serNum  = Helix->serNum;
  strcpy ( vertexID   ,Helix->helixID );
  strcpy ( chainID    ,Helix->initChainID );
  strcpy ( initResName,Helix->initResName );
  strcpy ( initICode  ,Helix->initICode   );
  strcpy ( endResName ,Helix->endResName  );
  strcpy ( endICode   ,Helix->endICode    );

  initSeqNum = Helix->initSeqNum;
  endSeqNum  = Helix->endSeqNum;

  return GetPositions ( MMDB,hx_min_len );

}


int  ssm::Vertex::SetVertex ( mmdb::PManager MMDB,
                              mmdb::PStrand Strand )  {
char S[200];

  FreeMemory();

  id      = 0;
  type    = V_STRAND;
  classID = 0;

  sprintf    ( S,"%s[%i]",Strand->sheetID,Strand->strandNo );
  mmdb::CreateCopy ( name,S );

  strandNo = Strand->strandNo;
  strcpy ( vertexID   ,Strand->sheetID     );
  strcpy ( chainID    ,Strand->initChainID );
  strcpy ( initResName,Strand->initResName );
  strcpy ( initICode  ,Strand->initICode   );
  strcpy ( endResName ,Strand->endResName  );
  strcpy ( endICode   ,Strand->endICode    );

  initSeqNum = Strand->initSeqNum;
  endSeqNum  = Strand->endSeqNum;

  return GetPositions ( MMDB,sd_min_len );

}

int  ssm::Vertex::SetVertex ( mmdb::PManager MMDB, VERTEX_TYPE v_type,
                              int sNum, int iclass, mmdb::ChainID chID,
                              int seqNum1, mmdb::InsCode iCode1,
                              int seqNum2, mmdb::InsCode iCode2 )  {
char S[200];

  FreeMemory();

  id      = 0;
  type    = v_type;
  classID = iclass;
  serNum  = sNum;

  if (v_type==V_HELIX)  {
    sprintf ( S,"%i[]",serNum );
    sprintf ( vertexID,"HX%i",serNum );
  } else  {
    sprintf ( S,"[%i]",serNum );
    sprintf ( vertexID,"SD%i",serNum );
  }
  mmdb::CreateCopy ( name,S );

  strandNo = sNum;
  if (chID)    strcpy ( chainID,chID );
       else    chainID[0]   = char(0);
  if (iCode1)  strcpy ( initICode,iCode1 );
         else  initICode[0] = char(0);
  if (iCode2)  strcpy ( endICode,iCode2 );
         else  endICode[0]  = char(0);

  initSeqNum = seqNum1;
  endSeqNum  = seqNum2;

  initResName[0] = char(0);
  endResName [0] = char(0);

  if (v_type==V_HELIX)
        return GetPositions ( MMDB,hx_min_len );
  else  return GetPositions ( MMDB,sd_min_len );

}


void  ssm::Vertex::CalcGeometry ( mmdb::PPAtom CA )  {
int  i;

  //  1. Calculate the center of mass

  x0   = 0.0;
  y0   = 0.0;
  z0   = 0.0;
  mass = 0.0;
  for (i=0;i<nres;i++)  {
    x0   += CA[i]->x;
    y0   += CA[i]->y;
    z0   += CA[i]->z;
    mass += 1.0;
  }
  x0 /= mass;
  y0 /= mass;
  z0 /= mass;


  //  2. Calculate the vertex's direction

  // set (vdx,vdy,vdz) to the approximate direction of the structure
  // as given by its outmost C_alpha atoms

  x1 = GetCoor1(CA,1);
  x2 = GetCoor2(CA,1);
  y1 = GetCoor1(CA,2);
  y2 = GetCoor2(CA,2);
  z1 = GetCoor1(CA,3);
  z2 = GetCoor2(CA,3);

  ex = x2 - x1;
  ey = y2 - y1;
  ez = z2 - z1;

  length = sqrt(ex*ex+ey*ey+ez*ez);
  ex    /= length;
  ey    /= length;
  ez    /= length;

  dalpha = mmdb::RMin( 0.785,
       2.0*asin(length_atol/mmdb::RMax(length_atol,length)) );

}

mmdb::realtype ssm::Vertex::GetCoor1 ( mmdb::PPAtom CA, int coor_key )  {
mmdb::realtype c0,c1,c2,c3;

  c1 = 0.0; // only to keep compiler happy
  c2 = 0.0; // only to keep compiler happy
  c3 = 0.0; // only to keep compiler happy

  switch (coor_key)  {
    default :
    case 1 : c0 = CA[0]->x;
             if (nres>1) c1 = CA[1]->x;
             if (nres>2) c2 = CA[2]->x;
             if (nres>3) c3 = CA[3]->x;
           break;
    case 2 : c0 = CA[0]->y;
             if (nres>1) c1 = CA[1]->y;
             if (nres>2) c2 = CA[2]->y;
             if (nres>3) c3 = CA[3]->y;
           break;
    case 3 : c0 = CA[0]->z;
             if (nres>1) c1 = CA[1]->z;
             if (nres>2) c2 = CA[2]->z;
             if (nres>3) c3 = CA[3]->z;
           break;
  }

  if (nres<3) return  c0;

  if (type==V_HELIX)  {
    if (nres<5) return  (c0+c2)/2.0;
    return (0.74*(c0+c3)+c1+c2)/3.48;
  } else
    return (c0+c1)/2.0;

}

mmdb::realtype ssm::Vertex::GetCoor2 ( mmdb::PPAtom CA, int coor_key ) {
mmdb::realtype c1,c2,c3,c4;

  c2 = 0.0;  // only to keep compiler happy
  c3 = 0.0;  // only to keep compiler happy
  c4 = 0.0;  // only to keep compiler happy

  switch (coor_key)  {
    default :
    case 1 : c1 = CA[nres-1]->x;
             if (nres>1) c2 = CA[nres-2]->x;
             if (nres>2) c3 = CA[nres-3]->x;
             if (nres>3) c4 = CA[nres-4]->x;
           break;
    case 2 : c1 = CA[nres-1]->y;
             if (nres>1) c2 = CA[nres-2]->y;
             if (nres>2) c3 = CA[nres-3]->y;
             if (nres>3) c4 = CA[nres-4]->y;
           break;
    case 3 : c1 = CA[nres-1]->z;
             if (nres>1) c2 = CA[nres-2]->z;
             if (nres>2) c3 = CA[nres-3]->z;
             if (nres>3) c4 = CA[nres-4]->z;
           break;
  }

  if (nres<3) return  c1;

  if (type==V_HELIX)  {
    if (nres<5) return  (c1+c3)/2.0;
    return (0.74*(c1+c4)+c2+c3)/3.48;
  } else
    return (c1+c2)/2.0;

}

mmdb::realtype ssm::Vertex::GetAngle ( PVertex v )  {
  return  acos(v->ex*ex+v->ey*ey+v->ez*ez);
}

mmdb::realtype ssm::Vertex::GetCosine ( PVertex v )  {
// returns cosine angle between the vertices
  return  v->ex*ex+v->ey*ey+v->ez*ez;
}

mmdb::realtype ssm::Vertex::GetAngle ( mmdb::realtype vx, mmdb::realtype vy, mmdb::realtype vz )  {
mmdb::realtype l;
  l = vx*vx + vy*vy + vz*vz;
  if (l>0.0)  return  acos((ex*vx+ey*vy+ez*vz)/sqrt(l));
        else  return  0.0;
}

bool ssm::Vertex::Compare ( PVertex v )  {
int  dn;
  if (v->type!=type)  return false;
  switch (type)  {
    case V_HELIX  : if (v->classID!=classID)  return false;
                    dn = mmdb::mround(((nres+v->nres)*hx_nres_rtol)/2.0) +
                                hx_nres_atol;
                    if (abs(v->nres-nres)>dn)  return false;
                  break;
    case V_STRAND : dn = mmdb::mround((nres+v->nres)*sd_nres_rtol/2.0) +
                                sd_nres_atol;
                    if (abs(v->nres-nres)>dn)  return false;
                  break;
    default : ;
  }
  return true;
}

mmdb::realtype ssm::Vertex::GetLengthDeviation ( PVertex v )  {
int dn;
  if (v->type!=type)  return -1.0;
  switch (type)  {
    case V_HELIX  : if (v->classID!=classID)  return -2.0;
                    dn = nres + v->nres;
                    if (dn>0)  return 2.0*fabs(mmdb::realtype(v->nres-nres))/dn;
                         else  return 0.0;
    case V_STRAND : dn = nres + v->nres;
                    if (dn>0)  return 2.0*fabs(mmdb::realtype(v->nres-nres))/dn;
                         else  return 0.0;
    default : ;
  }
  return 0.0;
}

mmdb::pstr  ssm::Vertex::GetShortVertexDesc ( mmdb::pstr S )  {
  switch (type)  {
    case V_HELIX  : sprintf ( S,"%3i HELIX  %8s %2i %3i",
                              id,name,classID,nres );
                  break;
    case V_STRAND : sprintf ( S,"%3i STRAND %8s    %3i",
                              id,name,nres );
                  break;
    default       : strcpy  ( S,"" );
  }
  return S;
}

mmdb::pstr  ssm::Vertex::GetFullVertexDesc ( mmdb::pstr S )  {
char  HType[5];
  switch (type)  {
    case V_HELIX  :
      sprintf ( HType,"%i",classID );
      if (!HType[1])  {
        HType[1] = ' ';
        HType[2] = char(0);
      }
      if (HType[2])  strcpy ( HType,"**" );
      sprintf ( S,"%3i|H%2s%3i|%1s|%3s%4i%1s|%3s%4i%1s|",
                id,HType,nres,chainID,initResName,initSeqNum,initICode,
                endResName,endSeqNum,endICode );
              break;
    case V_STRAND :
      sprintf ( S,"%3i|SD%4i|%1s|%3s%4i%1s|%3s%4i%1s|",
                id,nres,chainID,initResName,initSeqNum,initICode,
                endResName,endSeqNum,endICode );
              break;
    default       : strcpy  ( S,"" );
  }
  return S;
}

void  ssm::Vertex::GetVertexRange ( mmdb::ChainID chID,
                                    mmdb::ResName name1,
                                    int &   seqNum1,
                                    mmdb::InsCode insCode1,
                                    mmdb::ResName name2,
                                    int &   seqNum2,
                                    mmdb::InsCode insCode2 )  {
  strcpy ( chID,chainID );
  strcpy ( name1,initResName );
  seqNum1 = initSeqNum;
  strcpy ( insCode1,initICode );
  strcpy ( name2,endResName );
  seqNum2 = endSeqNum;
  strcpy ( insCode2,endICode );
}

void  CompareInt ( int i1, int i2, mmdb::pstr name )  {
  if (i1!=i2)  printf ( "  %s1=%i %s2=%i\n",name,i1,name,i2 );
}

void  CompareReal ( mmdb::realtype r1, mmdb::realtype r2,
                    mmdb::pstr name )  {
  if (r1!=r2)  printf ( "  %s1=%12.7g  %s2=%12.7g\n",name,r1,name,r2 );
}

void  CompareStr ( mmdb::pstr s1, mmdb::pstr s2, mmdb::pstr name )  {
  if (strcmp(s1,s2))  printf ( "  %s1='%s'  %s2='%s'\n",name,s1,name,s2 );
}

void  ssm::Vertex::Copy ( PVertex v )  {

  FreeMemory();

  id         = v->id;
  type       = v->type;
  classID    = v->classID;
  nres       = v->nres;
  x0         = v->x0;
  y0         = v->y0;
  z0         = v->z0;
  ex         = v->ex;
  ey         = v->ey;
  ez         = v->ez;
  dalpha     = v->dalpha;
  length     = v->length;
  mass       = v->mass;
  serNum     = v->serNum;
  strandNo   = v->strandNo;
  initSeqNum = v->initSeqNum;
  endSeqNum  = v->endSeqNum;
  initPos    = v->initPos;
  endPos     = v->endPos;
  VNo        = v->VNo;

  x1 = v->x1;   y1 = v->y1;   z1 = v->z1;
  x2 = v->x2;   y2 = v->y2;   z2 = v->z2;

  mmdb::CreateCopy ( name,v->name );
  strcpy ( vertexID   ,v->vertexID    );
  strcpy ( chainID    ,v->chainID     );
  strcpy ( initResName,v->initResName );
  strcpy ( initICode  ,v->initICode   );
  strcpy ( endResName ,v->endResName  );
  strcpy ( endICode   ,v->endICode    );

}

void  ssm::Vertex::write ( mmdb::io::RFile f )  {
int Version=3;
int vtype = type;

  f.WriteInt     ( &Version  );

  f.WriteInt     ( &id       );
  f.WriteInt     ( &vtype    );
  f.WriteInt     ( &classID  );
  f.WriteInt     ( &nres     );
  f.WriteFloat   ( &x0       );
  f.WriteFloat   ( &y0       );
  f.WriteFloat   ( &z0       );
  f.WriteFloat   ( &ex       );
  f.WriteFloat   ( &ey       );
  f.WriteFloat   ( &ez       );
  f.WriteFloat   ( &dalpha   );
  f.WriteFloat   ( &length   );
  f.WriteFloat   ( &mass     );

  f.CreateWrite  ( name      );
  f.WriteInt     ( &serNum   );
  f.WriteInt     ( &strandNo );
  f.WriteTerLine ( vertexID   ,false );
  f.WriteTerLine ( chainID    ,false );
  f.WriteTerLine ( initResName,false );
  f.WriteTerLine ( initICode  ,false );
  f.WriteTerLine ( endResName ,false );
  f.WriteTerLine ( endICode   ,false );
  f.WriteInt     ( &initSeqNum );
  f.WriteInt     ( &endSeqNum  );
  f.WriteInt     ( &initPos    );
  f.WriteInt     ( &endPos     );
  f.WriteInt     ( &VNo        );

  f.WriteFloat   ( &x1         );
  f.WriteFloat   ( &x2         );
  f.WriteFloat   ( &y1         );
  f.WriteFloat   ( &y2         );
  f.WriteFloat   ( &z1         );
  f.WriteFloat   ( &z2         );

}


void  ssm::Vertex::read ( mmdb::io::RFile f )  {
int Version;
int vtype;

  FreeMemory();

  f.ReadInt     ( &Version  );

  f.ReadInt     ( &id       );
  f.ReadInt     ( &vtype    );
  type = VERTEX_TYPE(vtype);
  f.ReadInt     ( &classID  );
  f.ReadInt     ( &nres     );
  f.ReadFloat   ( &x0       );
  f.ReadFloat   ( &y0       );
  f.ReadFloat   ( &z0       );
  f.ReadFloat   ( &ex       );
  f.ReadFloat   ( &ey       );
  f.ReadFloat   ( &ez       );
  f.ReadFloat   ( &dalpha   );
  f.ReadFloat   ( &length   );
  f.ReadFloat   ( &mass     );

  f.CreateRead  ( name      );
  f.ReadInt     ( &serNum   );
  f.ReadInt     ( &strandNo );
  f.ReadTerLine ( vertexID   ,false );
  f.ReadTerLine ( chainID    ,false );
  f.ReadTerLine ( initResName,false );
  f.ReadTerLine ( initICode  ,false );
  f.ReadTerLine ( endResName ,false );
  f.ReadTerLine ( endICode   ,false );
  f.ReadInt     ( &initSeqNum );
  f.ReadInt     ( &endSeqNum  );
  f.ReadInt     ( &initPos    );
  f.ReadInt     ( &endPos     );
  f.ReadInt     ( &VNo        );

  f.ReadFloat   ( &x1         );
  f.ReadFloat   ( &x2         );
  f.ReadFloat   ( &y1         );
  f.ReadFloat   ( &y2         );
  f.ReadFloat   ( &z1         );
  f.ReadFloat   ( &z2         );

}

namespace ssm  {
  MakeStreamFunctions(Vertex)
}


//  ==========================  ssm::Edge  ============================


ssm::Edge::Edge() : mmdb::io::Stream()  {
  InitEdge();
}

ssm::Edge::Edge ( mmdb::io::RPStream Object )
         : mmdb::io::Stream(Object)  {
  InitEdge();
}

ssm::Edge::~Edge() {}

void ssm::Edge::InitEdge()  {

  id1          = 0;
  id2          = 0;
  bdir         = 0;
  vtype1       = -1;
  vtype2       = -1;
  length       = 0.0;
  ex           = 0.0;
  ey           = 0.0;
  ez           = 1.0;
  alpha1       = mmdb::Pi/2.0;
  alpha2       = mmdb::Pi/2.0;
  alpha3       = mmdb::Pi/2.0;
  alpha4       = 0.0;
  dalpha1      = 0.0;
  dalpha2      = 0.0;
  dalpha3      = 0.0;
  dalpha4      = 0.0;
  dr12         = 0.0;
  GoodTorsion  = false;

}

mmdb::realtype ssm::Edge::GetAngle ( PVertex v )  {
//  returns angle between the edge and given vertex
  return  acos(v->ex*ex+v->ey*ey+v->ez*ez);
}


mmdb::realtype ssm::Edge::GetCosine ( PEdge E )  {
// returns cosine angle between the edges
  return  E->ex*ex+E->ey*ey+E->ez*ez;
}


mmdb::realtype ssm::Edge::GetAngle ( mmdb::rvector V1,
                                     mmdb::rvector V2 )  {
// returns angle between two vectors
mmdb::realtype l1,l2;

  l1 = V1[0]*V1[0] + V1[1]*V1[1] + V1[2]*V1[2];
  if (l1==0.0)  l1 = 1.0;
  l2 = V2[0]*V2[0] + V2[1]*V2[1] + V2[2]*V2[2];
  if (l2==0.0)  l2 = 1.0;

  return  acos((V1[0]*V2[0]+V1[1]*V2[1]+V1[2]*V2[2])/sqrt(l1*l2));

}

void ssm::Edge::GetDirection ( mmdb::vect3 & v )  {
  v[0] = ex;
  v[1] = ey;
  v[2] = ez;
}

void  ssm::Edge::SetEdge ( PVertex v1, PVertex v2 )  {
mmdb::realtype dx,dy,dz, r,dr1,dr2, r1,r2,dt, drx,dry,drz;
mmdb::realtype U[3],W[3],V[3];
int            i,j,na;

  id1 = v1->id;
  id2 = v2->id;

  if ((v1->initPos>=0) && (v2->initPos>=0) &&
      (!strcmp(v1->chainID,v2->chainID)))
        bdir = v2->VNo - v1->VNo;
  else  bdir = 0;

  vtype1 = v1->type;
  vtype2 = v2->type;

  //  initially, we calculate the edge direction as
  //  that from v2 to v1
  dx = v1->x0 - v2->x0;
  dy = v1->y0 - v2->y0;
  dz = v1->z0 - v2->z0;
  length = sqrt(dx*dx+dy*dy+dz*dz);

  dr1 = length_atol;
  dr2 = length_atol;
  if (length>0.0)  {
    ex  = dx/length;
    ey  = dy/length;
    ez  = dz/length;
  } else  {
    ex = dx;
    ey = dy;
    ez = dz;
  }

  r1 = mmdb::MaxReal;   r2 = -mmdb::MaxReal;
  U[0] = dx - v1->ex*dr1;
  U[1] = dy - v1->ey*dr1;
  U[2] = dz - v1->ez*dr1;
  W[0] = -v2->ex*dr2;
  W[1] = -v2->ey*dr2;
  W[2] = -v2->ez*dr2;
  na = 11;
  dt = 2.0/mmdb::realtype(na-1);
  for (i=0;i<=na;i++)
    for (j=0;j<=na;j++)  {
      drx = (U[0]+v1->ex*dr1*dt*i) - (W[0]+v2->ex*dr2*dt*j);
      dry = (U[1]+v1->ey*dr1*dt*i) - (W[1]+v2->ey*dr2*dt*j);
      drz = (U[2]+v1->ez*dr1*dt*i) - (W[2]+v2->ez*dr2*dt*j);
      r   = drx*drx + dry*dry + drz*drz;
      if (r<r1)  r1 = r;
      if (r>r2)  r2 = r;
    }
  dr12 = sqrt(r2) - sqrt(r1);

  //  alpha2 is angle between v2 and edge, opposing v1:
  //
  //    v1\   alpha2__/v2
  //       \       / /
  //        o-------o
  //          edge
  alpha2  = GetAngle(v2);
  // estimate the angle uncertainty
  U[0] = dx + v2->ex*dr2;
  U[1] = dy + v2->ey*dr2;
  U[2] = dz + v2->ez*dr2;
  V[0] = v2->ex;
  V[1] = v2->ey;
  V[2] = v2->ez;
  dalpha2 = GetAngle ( U,V );
  U[0] = dx - v2->ex*dr2;
  U[1] = dy - v2->ey*dr2;
  U[2] = dz - v2->ez*dr2;
  dalpha2 = mmdb::RMin(mmdb::RMax(v2->dalpha+fabs(dalpha2-GetAngle(U,V)),
                                  ev_uncert_min),ev_uncert_max);

  //  now we have to change direction of the edge in order
  //  to calculate alpha2
  ex = -ex;
  ey = -ey;
  ez = -ez;

  //  alpha1 is angle between v1 and edge, opposing v2:
  //
  //    v1\__alpha1   /v2
  //       \ \       /
  //        o-------o
  //           edge
  alpha1  = GetAngle(v1);

  U[0] = -dx + v1->ex*dr1;
  U[1] = -dy + v1->ey*dr1;
  U[2] = -dz + v1->ez*dr1;
  V[0] = v1->ex;
  V[1] = v1->ey;
  V[2] = v1->ez;
  dalpha1 = GetAngle ( U,V );
  U[0] = -dx - v1->ex*dr1;
  U[1] = -dy - v1->ey*dr1;
  U[2] = -dz - v1->ez*dr1;
  dalpha1 = mmdb::RMin(mmdb::RMax(v1->dalpha+fabs(dalpha1-GetAngle(U,V)),
                                  ev_uncert_min),ev_uncert_max);

  //  thus angles alpha1 and alpha2 DO DEPEND ON THE DIRECTION
  //  OF EDGE: swaping the vertices results in swaping the angles.
  //  This is used in the comparison of edges. The edge direction
  //  (ex,ey,ez) is set as from v1 to v2. It is assumed that
  //  for all generated edges v1->id<v2->id.


  //  alpha3 is an (edge-)orientation-independent angle betwen
  //  v1 and v2
  alpha3  = v1->GetAngle(v2);
  dalpha3 = mmdb::RMin(mmdb::RMax(v1->dalpha+v2->dalpha,
                                  vv_uncert_min),vv_uncert_max);

  U[0] = v1->ex;   W[0] = ex;   V[0] = v2->ex;
  U[1] = v1->ey;   W[1] = ey;   V[1] = v2->ey;
  U[2] = v1->ez;   W[2] = ez;   V[2] = v2->ez;


  //  alpha4 is torsion angle between v1 and v2 ranging
  //  from -Pi to Pi. Simple considerations show that
  //  the torsion angle does not change with changing
  //  the edge direction!
  //    Changing the edge direction is equivalent to
  //  changing the sign of W and swaping U and V.
  //  We have:
  //      Torsion(U,W,V) = -Torsion(U,-W,V)
  //      Torsion(U,W,V) = -Torsion(V,W,U)
  //  from which it follows that
  //      Torsion(U,W,V) = Torsion(V,-W,U)

  alpha4  = mmdb::math::GetTorsion ( (mmdb::rvector)U,
                                     (mmdb::rvector)W,
                                     (mmdb::rvector)V );
  dalpha4 = mmdb::RMin(mmdb::RMax(v1->dalpha+v2->dalpha,
                                  tn_uncert_min),tn_uncert_max);

  GoodTorsion = (alpha4>mmdb::math::NO_TORSION) &&  // the torsion is defined
                (fabs(alpha4)>dalpha4)          &&
                (mmdb::Pi-fabs(alpha4)>dalpha4) &&
                (fabs(alpha1)>dalpha1)          &&  // the torsion is
                (fabs(alpha2)>dalpha2)          &&  //   _well_ defined
                (mmdb::Pi-fabs(alpha1)>dalpha1) &&
                (mmdb::Pi-fabs(alpha2)>dalpha2);

}


int  ssm::Edge::Compare ( bool swap_this, PEdge edge,
                          bool swap_edge )  {
// Compare(..) returns true if edges compare, that is:
//   1. edge lengths compare within relative precision
//      edge_len_tol
//   2. angles alpha1, alpha2 and alpha3 compare within
//      absolute deviations edge_alphaX_tol .
mmdb::realtype length1,avlength;
mmdb::realtype a1,a2,da1,da2, b1,b2,db1,db2, t1,t2;
int      v11,v12,v21,v22, bdir1,bdir2;

  if (swap_this)  {
    v11   =  vtype2;
    v12   =  vtype1;
    t1    = -alpha4;
    bdir1 = -bdir;
  } else  {
    v11   = vtype1;
    v12   = vtype2;
    t1    = alpha4;
    bdir1 = bdir;
  }

  if (swap_edge)  {
    v21   =  edge->vtype2;
    v22   =  edge->vtype1;
    t2    = -edge->alpha4;
    bdir2 = -edge->bdir;
  } else  {
    v21   = edge->vtype1;
    v22   = edge->vtype2;
    t2    = edge->alpha4;
    bdir2 = edge->bdir;
  }

  if ((v11!=v21) || (v12!=v22))  {
    printf ( " ***** CEdge::Compare(): program error.\n" );
    return 11111;
  }

  if ((bdir1!=bdir2) && (bdir1*bdir2!=0))  {
    if (CheckSSConnectivity==CONNECT_Strict)  return 6;
    if ((CheckSSConnectivity==CONNECT_Flexible) && (bdir1*bdir2<0))
                                              return 6;
  }

  length1  = edge->length;

  avlength = (length+length1)/2.0;
  if (fabs(length-length1)>avlength*length_rtol+dr12+length_atol)
                                              return 1;

  if ((length>0.0) && (edge->length>0.0))  {
    if (swap_this)  {
      a1 = alpha2;  da1 = dalpha2;
      a2 = alpha1;  da2 = dalpha1;
    } else  {
      a1 = alpha1;  da1 = dalpha1;
      a2 = alpha2;  da2 = dalpha2;
    }
    if (swap_edge)  {
      b1 = edge->alpha2;  db1 = edge->dalpha2;
      b2 = edge->alpha1;  db2 = edge->dalpha1;
    } else  {
      b1 = edge->alpha1;  db1 = edge->dalpha1;
      b2 = edge->alpha2;  db2 = edge->dalpha2;
    }
    if (fabs(a1-b1)>da1+db1)  return 2;
    if (fabs(a2-b2)>da2+db2)  return 3;
  }

  if (fabs(alpha3-edge->alpha3)>dalpha3+edge->dalpha3)  return 4;

  // it is sensible to compare only the signs of torsion angles
  // because the torsion is very sensitive to all alpha1, alpha2
  // and alpha3.
  if (GoodTorsion && edge->GoodTorsion && (t1*t2<0.0))  return 5;

  return  0;

}


int ssm::Edge::CheckConnectivity ( bool swap_this, PEdge edge,
                                   bool swap_edge )  {
int bdir1,bdir2;
  if (swap_this)  bdir1 = -bdir;
            else  bdir1 = bdir;
  if (swap_edge)  bdir2 = -edge->bdir;
            else  bdir2 = edge->bdir;
  if (bdir1!=bdir2)  {
    if (bdir1*bdir2<=0) return 2; // brocken soft and strict connectivities
    return 1;  // strict connectivity is brocken , soft connectivity Ok
  }
  return 0;
}


void  ssm::Edge::write ( mmdb::io::RFile f )  {
int Version=1;
  f.WriteInt   ( &Version     );
  f.WriteInt   ( &id1         );
  f.WriteInt   ( &id2         );
  f.WriteInt   ( &bdir        );
  f.WriteInt   ( &vtype1      );
  f.WriteInt   ( &vtype2      );
  f.WriteFloat ( &length      );
  f.WriteFloat ( &ex          );
  f.WriteFloat ( &ey          );
  f.WriteFloat ( &ez          );
  f.WriteFloat ( &alpha1      );
  f.WriteFloat ( &alpha2      );
  f.WriteFloat ( &alpha3      );
  f.WriteFloat ( &alpha4      );
  f.WriteFloat ( &dalpha1     );
  f.WriteFloat ( &dalpha2     );
  f.WriteFloat ( &dalpha3     );
  f.WriteFloat ( &dalpha4     );
  f.WriteBool  ( &GoodTorsion );
}

void  ssm::Edge::read ( mmdb::io::RFile f )  {
int Version;
  f.ReadInt   ( &Version     );
  f.ReadInt   ( &id1         );
  f.ReadInt   ( &id2         );
  f.ReadInt   ( &bdir        );
  f.ReadInt   ( &vtype1      );
  f.ReadInt   ( &vtype2      );
  f.ReadFloat ( &length      );
  f.ReadFloat ( &ex          );
  f.ReadFloat ( &ey          );
  f.ReadFloat ( &ez          );
  f.ReadFloat ( &alpha1      );
  f.ReadFloat ( &alpha2      );
  f.ReadFloat ( &alpha3      );
  f.ReadFloat ( &alpha4      );
  f.ReadFloat ( &dalpha1     );
  f.ReadFloat ( &dalpha2     );
  f.ReadFloat ( &dalpha3     );
  f.ReadFloat ( &dalpha4     );
  f.ReadBool  ( &GoodTorsion );
}


namespace ssm {
  MakeStreamFunctions(Edge)
}

