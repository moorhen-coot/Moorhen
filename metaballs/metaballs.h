#include <array>
#include <vector>

typedef struct moorhenMesh : public MC::mcMesh {
	public:
		std::vector<std::array<float,4>> colors;
} moorhenMesh;


namespace MoorhenMetaBalls {
    moorhenMesh GenerateMeshFromPoints(const std::vector<std::pair<std::array<float,4>,std::array<float,4>>> &points, float isoLevel, float gridSize, int n_threads=4);
}
