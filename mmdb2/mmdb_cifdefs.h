//  $Id: mmdb_cifdefs.h $
//  =================================================================
//
//   CCP4 Coordinate Library: support of coordinate-related
//   functionality in protein crystallography applications.
//
//   Copyright (C) Eugene Krissinel 2000-2013.
//
//    This library is free software: you can redistribute it and/or
//    modify it under the terms of the GNU Lesser General Public
//    License version 3, modified in accordance with the provisions
//    of the license to address the requirements of UK law.
//
//    You should have received a copy of the modified GNU Lesser
//    General Public License along with this library. If not, copies
//    may be downloaded from http://www.ccp4.ac.uk/ccp4license.php
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Lesser General Public License for more details.
//
//  =================================================================
//
//    21.11.13   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  -----------------------------------------------------------------
//
//  **** Module  :   MMDBF_Defs <interface>
//       ~~~~~~~~~
//  **** Project :   MacroMolecular Data Base (MMDB)
//       ~~~~~~~~~
//  **** Namespace:  mmdb::
//
//      CIF Definitions
//
//  (C) E. Krissinel 2000-2013
//
//  =================================================================
//

#ifndef __MMDB_CIFDefs__
#define __MMDB_CIFDefs__

#include "mmdb_mattype.h"

namespace mmdb  {

  // ------------------------------------------------------------------

  //  Mode IDs

  enum CIF_MODE  {
    CIF_NDB  = 0,
    CIF_PDBX = 1
  };

  //  CIF IDs for mode-dependent CIF names

  enum CIF_ID  {
    CAT_POLY_SEQ_SCHEME        =   1,
    TAG_CHAIN_ID               = 101,
    TAG_DB_ACCESSION           = 102,
    TAG_DB_ALIGN_BEG           = 103,
    TAG_DB_ALIGN_BEG_INS_CODE  = 104,
    TAG_DB_ALIGN_END           = 105,
    TAG_DB_ALIGN_END_INS_CODE  = 106,
    TAG_ID_CODE                = 107,
    TAG_SEQ_CHAIN_ID           = 108,
    TAG_SEQ_ALIGN_BEG          = 109,
    TAG_SEQ_ALIGN_BEG_INS_CODE = 110,
    TAG_SEQ_ALIGN_END          = 111,
    TAG_SEQ_ALIGN_END_INS_CODE = 112
  };

  //  CIFName(..) gives CIF name according to CIF Mode.
  extern MMDB_DL_EXPORT cpstr CIFName ( int NameID, CIF_MODE Mode );

  // ------------------------------------------------------------------

  extern MMDB_DL_IMPORT(cpstr) CIFCAT_ATOM_SITE                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_ATOM_SITE_ANISOTROP        ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_ATOM_SITES                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_AUDIT_AUTHOR               ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_CELL                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_CHEM_COMP                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_CITATION                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_DATABASE                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_DATABASE_PDB_CAVEAT        ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_DATABASE_PDB_MATRIX        ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_DATABASE_PDB_REV           ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_DATABASE_PDB_TVECT         ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_ENTITY                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_EXPTL                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_NDB_DATABASE_REMARK        ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_NDB_NONSTANDARD_LIST       ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_NDB_POLY_SEQ_SCHEME        ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_PDBX_POLY_SEQ_SCHEME       ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_REFINE                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_SPRSDE                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_ASYM                ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_CONF                ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_CONN                ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_LINKR               ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_KEYWORDS            ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_NCS_OPER            ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_REF                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_REF_SEQ             ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_REF_SEQ_DIF         ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_SHEET               ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_SHEET_RANGE         ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_SHEET_ORDER         ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_STRUCT_SHEET_HBOND         ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_SYMMETRY                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFCAT_OBSLTE                     ;


  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ANGLE_ALPHA                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ANGLE_BETA                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ANGLE_GAMMA                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ASYM_ID                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ATOM_TYPE_SYMBOL              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_AUTH_ASYM_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_AUTH_ATOM_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_AUTH_COMP_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_AUTH_SEQ_ID                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_B_ISO_OR_EQUIV                ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_B_ISO_OR_EQUIV_ESD            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_BEG_LABEL_ASYM_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_BEG_LABEL_COMP_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_BEG_LABEL_SEQ_ID              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_X                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_X_ESD                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_Y                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_Y_ESD                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_Z                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CARTN_Z_ESD                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_FORMAL_CHARGE            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CODE                          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CODE_NDB                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CODE_PDB                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONF_TYPE_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_TYPE_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DATE                          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DATE_ORIGINAL                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DB_ALIGN_BEG                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DB_ALIGN_END                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DB_CODE                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DB_MON_ID                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DB_NAME                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_DETAILS                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_END_LABEL_ASYM_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_END_LABEL_COMP_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_END_LABEL_SEQ_ID              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ENTITY_ID                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ENTRY_ID                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FORMULA                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX11         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX12         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX13         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX21         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX22         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX23         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX31         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX32         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_MATRIX33         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_VECTOR1          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_VECTOR2          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_FRACT_TRANSF_VECTOR3          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_GROUP_PDB                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ID                            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_INS_CODE                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_ALT_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_ATOM_ID                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_ASYM_ID                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_COMP_ID                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_ENTITY_ID               ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LABEL_SEQ_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LENGTH_A                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LENGTH_B                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LENGTH_C                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_LS_D_RES_HIGH                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX11                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX12                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX13                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX21                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX22                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX23                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX31                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX32                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MATRIX33                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_METHOD                        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MOD_TYPE                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_MON_ID                        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NAME                          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_BEG_LABEL_INS_CODE_PDB    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_CHAIN_ID                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_COMPONENT_NO              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_DESCRIPTOR                ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_DB_ACCESSION              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_DB_ALIGN_BEG_INS_CODE     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_DB_ALIGN_END_INS_CODE     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_END_LABEL_INS_CODE_PDB    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_PDB_INS_CODE             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_HELIX_CLASS_PDB           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_KEYWORDS                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_ALT_ID              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_ATOM_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_ASYM_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_COMP_ID             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_INS_CODE            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LABEL_SEQ_NUM             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_LENGTH                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_MODEL                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PDB_CHAIN_ID              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PDB_ID                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PDB_ID_CODE               ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PDB_INS_CODE              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PTNR1_LABEL_INS_CODE      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_PTNR1_STANDARD_COMP_ID    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_BEG_LABEL_COMP_ID ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_BEG_LABEL_ASYM_ID ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_BEG_LABEL_INS_CODE;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_END_LABEL_COMP_ID ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_END_LABEL_ASYM_ID ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_RANGE_1_END_LABEL_INS_CODE;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_ALIGN_BEG             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_ALIGN_BEG_INS_CODE    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_ALIGN_END             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_ALIGN_END_INS_CODE    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_DB_NAME               ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_DB_ACCESSION_CODE     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SEQ_DB_SEQ_NUM            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NDB_SYNONYMS                  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NUM                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NUMBER_ATOMS_NH               ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_NUMBER_STRANDS                ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_OCCUPANCY                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_OCCUPANCY_ESD                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX11                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX12                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX13                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX21                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX22                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX23                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX31                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX32                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX33                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX_VECTOR1                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX_VECTOR2                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_ORIGX_VECTOR3                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDB_ID                        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDB_MON_ID                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDB_STRAND_ID                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_DB_ACCESSION             ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_DB_ALIGN_BEG_INS_CODE    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_DB_ALIGN_END_INS_CODE    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_PDB_ID_CODE              ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_PDB_MODEL_NUM            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_STRAND_ID                ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_1_BEG_LABEL_ATOM_ID     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_1_BEG_LABEL_SEQ_ID      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_1_END_LABEL_ATOM_ID     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_1_END_LABEL_SEQ_ID      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_ID_1                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RANGE_ID_2                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RCSB_RECORD_REVISED_1         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RCSB_RECORD_REVISED_2         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RCSB_RECORD_REVISED_3         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_RCSB_RECORD_REVISED_4         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_SEQ_ALIGN_BEG_INS_CODE   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PDBX_SEQ_ALIGN_END_INS_CODE   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PTNR1_LABEL_ASYM_ID           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PTNR1_LABEL_COMP_ID           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_PTNR1_LABEL_SEQ_ID            ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_REF_ID                        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_REPLACES                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_REPLACE_PDB_ID                ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SEGMENT_ID                    ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SEQ_ALIGN_BEG                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SEQ_ALIGN_END                 ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SEQ_NUM                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SENSE                         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SHEET_ID                      ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SOURCE                        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_SPACE_GROUP_NAME_H_M          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_TEXT                          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_TITLE                         ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_TYPE                          ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_TYPE_SYMBOL                   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_VECTOR1                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_VECTOR2                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_VECTOR3                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U11                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U11_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U12                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U12_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U13                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U13_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U22                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U22_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U23                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U23_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U33                           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_U33_ESD                       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_Z_PDB                         ;

  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR1_AUTH_ATOM_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PDBX_PTNR1_AUTH_ALT_ID   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR1_AUTH_COMP_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR1_AUTH_ASYM_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR1_AUTH_SEQ_ID        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PDBX_PTNR1_PDB_INS_CODE  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_DIST                     ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR2_AUTH_ATOM_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PDBX_PTNR2_AUTH_ALT_ID   ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR2_AUTH_COMP_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR2_AUTH_ASYM_ID       ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR2_AUTH_SEQ_ID        ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PDBX_PTNR2_PDB_INS_CODE  ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR1_SYMMETRY           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_PTNR2_SYMMETRY           ;
  extern MMDB_DL_IMPORT(cpstr) CIFTAG_CONN_NAME                     ;

}  // namespace mmdb

#endif

