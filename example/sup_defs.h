// $Id: sup_defs.h $
//  =================================================================
//
//   SUPERPOSE: Protein structure superposition based on SSM
//   algorithm. Please cite:
//
//   For pairwise alignment:
//     E. Krissinel & K. Henrick (2004) Acta Cryst. D60, 2256-2268.
//
//   For multiple alignment:
//     Krissinel, E. and Henrick, K.
//     Multiple Alignment of Protein Structures in Three Dimensions.
//     Computational Life Sciences, First International Symposium,
//     CompLife 2005, Konstanz, Germany, September 25-27, 2005, 67-78.
//     Proceedings Editors: Michael R. Berthold, Robert C. Glen,
//     Kay Diederichs, Oliver Kohlbacher, Ingrid Fischer.
//     ISBN: 978-3-540-29104-6 (Print) 978-3-540-31726-5
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
//  ----------------------------------------------------------------
//
//  **** Module  :  SUP_Defs <interface>
//       ~~~~~~~~~
//  **** Project :  SUPERPOSE
//       ~~~~~~~~~
//  **** Classes :  Program definitions
//       ~~~~~~~~~
//
//  E. Krissinel, 2003-2013
//
// =================================================================

#ifndef  __SUPERPOSE_DEFS__
#define  __SUPERPOSE_DEFS__

#include "ssm/ssm_defs.h"

#define  superpose_version    "1.05"
#define  superpose_date       "26-05-2017"

// _ccp4_ should be defined if compiled as part of CCP4 Suite
#undef _emulate_ccp4_

#endif
