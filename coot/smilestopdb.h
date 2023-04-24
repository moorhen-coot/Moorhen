#ifndef _MOORHEN_SMILSTOPDB_H
#define _MOORHEN_SMILSTOPDB_H
#include <string>

std::pair<std::string, std::string> SmilesToPDB(const std::string &smile_cpp, const std::string &TLC, int nconf, int maxIters);
#endif /* _MOORHEN_SMILSTOPDB_H */
