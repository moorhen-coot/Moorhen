#pragma once

#include <algorithm>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <string>
#include <vector>
#include <gemmi/calculate.hpp>
#include <gemmi/math.hpp>
#include <gemmi/model.hpp>


inline std::vector<double> calculate_chi_angles(
    const gemmi::Residue &residue, char altloc = '*')
{
    static const std::map<std::string, std::vector<std::string>> names = {
        {"ARG", {"N", "CA", "CB", "CG", "CD", "NE", "CZ"}},
        {"ASN", {"N", "CA", "CB", "CG", "OD1"}},
        {"ASP", {"N", "CA", "CB", "CG", "OD1"}},
        {"CYS", {"N", "CA", "CB", "SG"}},
        {"GLN", {"N", "CA", "CB", "CG", "CD", "OE1"}},
        {"GLU", {"N", "CA", "CB", "CG", "CD", "OE1"}},
        {"HIS", {"N", "CA", "CB", "CG", "ND1"}},
        {"ILE", {"N", "CA", "CB", "CG1", "CD1"}},
        {"LEU", {"N", "CA", "CB", "CG", "CD1"}},
        {"LYS", {"N", "CA", "CB", "CG", "CD", "CE", "NZ"}},
        {"MET", {"N", "CA", "CB", "CG", "SD", "CE"}},
        {"MSE", {"N", "CA", "CB", "CG", "SE", "CE"}},
        {"PHE", {"N", "CA", "CB", "CG", "CD1"}},
        {"PRO", {"N", "CA", "CB", "CG", "CD", "N"}},
        {"SER", {"N", "CA", "CB", "OG"}},
        {"THR", {"N", "CA", "CB", "OG1"}},
        {"TRP", {"N", "CA", "CB", "CG", "CD1"}},
        {"TYR", {"N", "CA", "CB", "CG", "CD1"}},
        {"VAL", {"N", "CA", "CB", "CG1"}},
    };
    const auto it = names.find(residue.name);
    if (it == names.end())
        return {};
    std::vector<const gemmi::Atom *> atoms(it->second.size(), nullptr);
    for (size_t i = 0; i < atoms.size(); i++)
        atoms[i] = residue.find_atom(it->second[i], altloc);
    std::vector<double> angles(atoms.size() - 3, NAN);
    for (size_t i = 0; i < angles.size(); i++)
        angles[i] = gemmi::deg(gemmi::calculate_dihedral_from_atoms(
            atoms[i], atoms[i + 1], atoms[i + 2], atoms[i + 3]));
    return angles;
}

class RotaRamaTable
{
public:
    RotaRamaTable(const std::filesystem::path &path)
    {
        if (!std::filesystem::exists(path))
            throw std::runtime_error("File not found: " + path.string());
        std::ifstream stream(path);
        init(stream);
    }

    RotaRamaTable(std::istream &stream) { init(stream); }

    double score(const std::vector<double> &angles) const
    {
        if (std::any_of(angles.begin(), angles.end(), [](double angle)
                        { return std::isnan(angle); }))
            return NAN;
        size_t index = angles_to_index(angles);
        return bins[index];
    }

    size_t num_angles() const { return dimensions.size(); }

private:
    struct Dimension
    {
        double lower;
        double upper;
        size_t bins;

        size_t bin(double angle) const
        {
            const double range = upper - lower;
            while (angle < lower)
                angle += range;
            while (angle >= upper)
                angle -= range;
            return size_t((angle - lower) / (range / bins));
        }
    };

    std::vector<Dimension> dimensions;
    std::vector<double> bins;

    void init(std::istream &stream)
    {
        std::string line;
        while (std::getline(stream, line))
        {
            std::istringstream iss(line);
            if (line.ends_with("true")) // wrapping is always true
            {
                std::string _;
                double lower, upper;
                size_t bins;
                iss >> _ >> _ >> lower >> upper >> bins;
                if (upper <= lower)
                    throw std::runtime_error("Upper must be greater than lower");
                if (bins == 0)
                    throw std::runtime_error("Number of bins must be greater than 0");
                dimensions.push_back({lower, upper, bins});
            }
            else if (line.starts_with("# List")) // between dimensions and data
            {
                size_t nbins = 1;
                for (const auto &dimension : dimensions)
                    nbins *= dimension.bins;
                bins = std::vector<double>(nbins, 0.0);
            }
            else if (!line.empty() && line[0] != '#')
            {
                std::vector<double> angles;
                for (size_t i = 0; i < dimensions.size(); i++)
                {
                    double angle;
                    iss >> angle;
                    angles.push_back(angle);
                }
                double score;
                iss >> score;
                size_t index = angles_to_index(angles);
                bins[index] = score;
            }
        }
    }

    int angles_to_index(const std::vector<double> &angles) const
    {
        if (angles.size() != dimensions.size())
            throw std::runtime_error("Number of angles does not equal number of dimensions");
        int index = 0;
        size_t n_bins = bins.size();
        for (int i = 0; i < angles.size(); i++)
        {
            n_bins /= dimensions[i].bins;
            index += n_bins * dimensions[i].bin(angles[i]);
        }
        return index;
    }
};

class Rama
{
public:
    const RotaRamaTable cispro;
    const RotaRamaTable general_noGPIVpreP;
    const RotaRamaTable gly_sym;
    const RotaRamaTable ileval_nopreP;
    const RotaRamaTable prepro_noGP;
    const RotaRamaTable transpro;

    Rama(const std::filesystem::path &dir)
        : cispro(RotaRamaTable(dir / "rama8000-cispro.data")),
          general_noGPIVpreP(RotaRamaTable(dir / "rama8000-general-noGPIVpreP.data")),
          gly_sym(RotaRamaTable(dir / "rama8000-gly-sym.data")),
          ileval_nopreP(RotaRamaTable(dir / "rama8000-ileval-nopreP.data")),
          prepro_noGP(RotaRamaTable(dir / "rama8000-prepro-noGP.data")),
          transpro(RotaRamaTable(dir / "rama8000-transpro.data")) {}

    const RotaRamaTable &which(const gemmi::Residue &prev,
                               const gemmi::Residue &res,
                               const gemmi::Residue &next) const
    {
        if (res.name == "GLY")
            return gly_sym;
        if (res.name == "PRO")
        {
            const double omega = gemmi::calculate_omega(prev, res);
            if (std::abs(omega) > M_PI_2)
                return transpro;
            return cispro;
        }
        if (next.name == "PRO")
            return prepro_noGP;
        if (res.name == "ILE" || res.name == "VAL")
            return ileval_nopreP;
        return general_noGPIVpreP;
    }

    double score(const gemmi::Residue &prev,
                 const gemmi::Residue &res,
                 const gemmi::Residue &next) const
    {
        const auto phipsi = gemmi::calculate_phi_psi(&prev, res, &next);
        const auto phi = gemmi::deg(phipsi[0]);
        const auto psi = gemmi::deg(phipsi[1]);
        return which(prev, res, next).score({phi, psi});
    }
};

class Rota
{
public:
    std::unordered_map<std::string, std::shared_ptr<RotaRamaTable>> tables;

    Rota(const std::filesystem::path &dir)
    {
        tables["ARG"] = std::make_shared<RotaRamaTable>(dir / "rota8000-arg.data");
        tables["ASN"] = std::make_shared<RotaRamaTable>(dir / "rota8000-asn.data");
        tables["ASP"] = std::make_shared<RotaRamaTable>(dir / "rota8000-asp.data");
        tables["CYS"] = std::make_shared<RotaRamaTable>(dir / "rota8000-cys.data");
        tables["GLN"] = std::make_shared<RotaRamaTable>(dir / "rota8000-gln.data");
        tables["GLU"] = std::make_shared<RotaRamaTable>(dir / "rota8000-glu.data");
        tables["HIS"] = std::make_shared<RotaRamaTable>(dir / "rota8000-his.data");
        tables["ILE"] = std::make_shared<RotaRamaTable>(dir / "rota8000-ile.data");
        tables["LEU"] = std::make_shared<RotaRamaTable>(dir / "rota8000-leu.data");
        tables["LYS"] = std::make_shared<RotaRamaTable>(dir / "rota8000-lys.data");
        tables["MET"] = std::make_shared<RotaRamaTable>(dir / "rota8000-met.data");
        tables["MSE"] = tables["MET"];
        tables["PHE"] = std::make_shared<RotaRamaTable>(dir / "rota8000-phetyr.data");
        tables["PRO"] = std::make_shared<RotaRamaTable>(dir / "rota8000-pro.data");
        tables["SER"] = std::make_shared<RotaRamaTable>(dir / "rota8000-ser.data");
        tables["THR"] = std::make_shared<RotaRamaTable>(dir / "rota8000-thr.data");
        tables["TRP"] = std::make_shared<RotaRamaTable>(dir / "rota8000-trp.data");
        tables["TYR"] = tables["PHE"];
        tables["VAL"] = std::make_shared<RotaRamaTable>(dir / "rota8000-val.data");
    }

    double score(const gemmi::Residue &residue) const
    {
        const auto it = tables.find(residue.name);
        if (it == tables.end())
            return NAN;
        auto angles = calculate_chi_angles(residue);
        const size_t n = it->second->num_angles();
        angles = std::vector<double>(angles.begin(), angles.begin() + n);
        return it->second->score(angles);
    }
};
