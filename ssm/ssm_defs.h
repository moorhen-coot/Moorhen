// $Id: ssm_defs.h $
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
//  **** Module  :  ssm_defs  <interface>
//       ~~~~~~~~~
//
//  E. Krissinel 2002-2013
//
// =================================================================
//

#ifndef __SSM_Defs__
#define __SSM_Defs__

namespace ssm  {

  enum SSM_VERSION  {
    MAJOR_VERSION = 1,
    MINOR_VERSION = 4,
    MICRO_VERSION = 0
  };

  // defined in ssm_align.cpp
  extern const char * SSM_DATE;

  enum SSGP_KEY  {
    SSGP_Distance = 0,
    SSGP_Alpha1   = 1,
    SSGP_Alpha2   = 2,
    SSGP_Alpha3   = 3,
    SSGP_Alpha4   = 4,
    SSGP_dAlpha1  = 5,
    SSGP_dAlpha2  = 6,
    SSGP_dAlpha3  = 7,
    SSGP_dAlpha4  = 8
  };

  enum SSGE_RC  {
    SSGE_Ok                    = 0,
    SSGE_NoVertices            = 70,
    SSGE_UnmatchedConnectivity = 5001,
    SSGE_AlignError            = 5002,
    SSGE_WrongSelLine1         = 5003,
    SSGE_WrongSelLine2         = 5004,
    SSGE_WrongSelLine3         = 5005
  };

  enum SSGT_KEY  {
    SSGT_None      = 0,
    SSGT_PDB       = 1,
    SSGT_SCOP      = 2,
    SSGT_PDBDOMAIN = 3,
    SSGT_PDBRANGE  = 4,
    SSGT_CFDOMAIN  = 5,
    SSGT_CFRANGE   = 6
  };

  enum SSM_FLAG  {
    SSMF_UniqueMatch      = 0x00000001,
    SSMF_BestMatch        = 0x00000002,
    SSMF_WrongConnectOnly = 0x00000004
  };

  enum MALIGN_RC  {
    MALIGN_Ok          =    0,
    MALIGN_BadInput    =    1,
    MALIGN_NoStructure =    2,
    MALIGN_NoAlignment =    3,
    MALIGN_NoGraph     = 1000
  };

  enum UNMAP_KEY  {
    UNMAP_YES = -2,
    UNMAP_NO  = -1
  };

  enum SUPERPOSITION_RESULT {
    SPOSE_Ok,SPOSE_BadData,SPOSE_NoCalphas1,SPOSE_NoCalphas2,
    SPOSE_RemoteStruct,SPOSE_SVDFail
  };

  enum RETURN_CODE {
    RC_Ok,RC_NoHits,RC_NoSuperposition,RC_NoGraph,RC_NoVertices,
    RC_NoGraph2,RC_NoVertices2,RC_TooFewMatches
  };

  //  precision level conatsnts
  enum PRECISION { PREC_Highest,PREC_High,PREC_Normal,
                   PREC_Low,PREC_Lowest };

  //  regimes of checking the SS connectivity
  enum CONNECTIVITY { CONNECT_None,CONNECT_Flexible,CONNECT_Strict };

  enum VERTEX_TYPE { V_UNKNOWN=-1,V_HELIX,V_STRAND };

}


#endif
