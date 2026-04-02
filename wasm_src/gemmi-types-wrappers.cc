#include <string>
#include <vector>
#include <optional>

#include <gemmi/assembly.hpp>

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(gemmi_types) {
    register_vector<int>("VectorInt");
    register_vector<char>("VectorChar");
    register_vector<float>("VectorFloat");
    register_vector<double>("VectorDouble");
    register_vector<std::string>("VectorString");
    register_vector<std::vector<std::string>>("VectorVectorString");
    enum_<gemmi::HowToNameCopiedChain>("HowToNameCopiedChain")
        .value("Short", gemmi::HowToNameCopiedChain::Short)
        .value("AddNumber", gemmi::HowToNameCopiedChain::AddNumber)
        .value("Dup", gemmi::HowToNameCopiedChain::Dup)
    ;
    value_object<std::pair<std::string, int>>("PairStringInt")
    .field("first", &std::pair<std::string, int>::first)
    .field("second", &std::pair<std::string, int>::second)
    ;
    register_optional<std::pair<std::string, int>>();
}
