#ifndef _MOORHEN_SMILSTOPDB_H
#define _MOORHEN_SMILSTOPDB_H
#include <string>
#include <utility>

std::pair<std::string, std::string> SmilesToPDB(const std::string &smile_cpp, const std::string &TLC, int nconf, int maxIters);
std::pair<std::string, std::string> MolTextToPDB(const std::string &mol_text_cpp, const std::string &TLC, int nconf, int maxIters, bool keep_orig_coords, bool minimize);
#endif /* _MOORHEN_SMILSTOPDB_H */
