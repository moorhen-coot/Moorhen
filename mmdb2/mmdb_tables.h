//  $Id: mmdb_tables.h $
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
//    24.07.15   <--  Date of Last Modification.
//                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  -----------------------------------------------------------------
//
//  **** Module  :   MMDB_Tables <interface>
//       ~~~~~~~~~
//  **** Project :   MacroMolecular Data Base (MMDB)
//       ~~~~~~~~~
//
//  **** Namespace :  mmdb::
//
//  **** Functions :
//       ~~~~~~~~~~~
//
//  **** Constants :  AName  ( array of 2-character atom names       )
//       ~~~~~~~~~~~  HAName ( array of 2=character heteroatom names )
//                    RName  ( 3-characters amino acid names         )
//                    RName1 ( 1-characters amino acid names         )
//
//
//  (C) E. Krissinel  2000-2015
//
//  =================================================================
//

#ifndef __MMDB_Tables__
#define __MMDB_Tables__

#include "mmdb_mattype.h"

namespace mmdb  {

  //  =================================================================

  const int nElementNames  = 117;
  const int nElementMetals = 91;
  const int nHydAtomNames  = 14;

  extern MMDB_DL_IMPORT(cpstr    const) ElementName   [nElementNames];
  extern MMDB_DL_IMPORT(cpstr    const) ElementMetal  [nElementMetals];
  extern MMDB_DL_IMPORT(cpstr    const) HydAtomName   [nHydAtomNames];
  extern MMDB_DL_IMPORT(realtype const) MolecWeight   [nElementNames];
  extern MMDB_DL_IMPORT(realtype const) CovalentRadius[nElementNames];
  extern MMDB_DL_IMPORT(realtype const) VdWaalsRadius [nElementNames];
  extern MMDB_DL_IMPORT(realtype const) IonicRadius   [nElementNames];

  extern MMDB_DL_EXPORT bool isMetal ( cpstr element );

  const int ELEMENT_UNKNOWN = -1;

  extern MMDB_DL_EXPORT int      getElementNo      ( cpstr element );
  extern MMDB_DL_EXPORT realtype getMolecWeight    ( cpstr element );
  extern MMDB_DL_EXPORT realtype getCovalentRadius ( cpstr element );
  extern MMDB_DL_EXPORT realtype getVdWaalsRadius  ( cpstr element );

  const int nResNames = 26;

  extern MMDB_DL_IMPORT(cpstr const) ResidueName [nResNames];
  extern MMDB_DL_IMPORT(char  const) ResidueName1[nResNames];

  extern MMDB_DL_EXPORT int getResidueNo ( cpstr resName );

  const realtype NAvogadro = 6.02214129e23;

  const int nSolventNames    = 12;
  const int nAminoacidNames  = 23;
  const int nNucleotideNames = 24;

  DefineStructure(AAProperty);

  struct AAProperty  {
    char     name[4];
    realtype hydropathy;
    realtype charge;
    realtype relSolvEnergy;
  };

  extern MMDB_DL_IMPORT(AAProperty const) AAProperties[nAminoacidNames];
  extern MMDB_DL_IMPORT(int const) AASimilarity[nAminoacidNames][nAminoacidNames];

  extern MMDB_DL_EXPORT int      GetAAPIndex     ( cpstr resName );  // 0..nAminoacidNames-1
  extern MMDB_DL_EXPORT realtype GetAAHydropathy ( cpstr resName );  // -4.5...+4.5
  extern MMDB_DL_EXPORT realtype GetAACharge     ( cpstr resName );
  extern MMDB_DL_EXPORT realtype GetAASolvationEnergy ( cpstr resName );
  extern MMDB_DL_EXPORT int      GetAASimilarity ( cpstr resName1,
                                    cpstr resName2 );  // 0..5

  extern MMDB_DL_IMPORT(cpstr const) StdSolventName[nSolventNames];
  extern MMDB_DL_IMPORT(cpstr const) NucleotideName[nNucleotideNames];

  extern MMDB_DL_EXPORT bool isSolvent    ( cpstr resName );
  extern MMDB_DL_EXPORT bool isAminoacid  ( cpstr resName );
  extern MMDB_DL_EXPORT bool isNucleotide ( cpstr resName );
  extern MMDB_DL_EXPORT int  isDNARNA     ( cpstr resName ); // 0,1(DNA),2(RNA)
  extern MMDB_DL_EXPORT bool isSugar      ( cpstr resName );

  extern MMDB_DL_EXPORT void  Get1LetterCode ( cpstr res3name, pstr   res1code );
  extern MMDB_DL_EXPORT void  Get1LetterCode ( cpstr res3name, char & res1code );
  extern MMDB_DL_EXPORT void  Get3LetterCode ( cpstr res1name, pstr   res3code );

}  // namespace mmdb

#endif

