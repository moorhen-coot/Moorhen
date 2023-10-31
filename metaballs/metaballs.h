#include <array>
#include <vector>
#include "MC.h"

namespace MoorhenMetaBalls {
    MC::mcMesh GenerateMeshFromPoints(const std::vector<std::array<float,4>> &points, float isoLevel, unsigned int n);
}
