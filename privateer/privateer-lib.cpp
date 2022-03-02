
// Library for the YSBL program Privateer (PRogramatic Identification of Various Anomalies Toothsome Entities Experience in Refinement)
// Licence: LGPL (https://www.gnu.org/licenses/lgpl.html)
//
// 2013-2016 Jon Agirre & Kevin Cowtan
// York Structural Biology Laboratory
// The University of York
// mailto: jon.agirre@york.ac.uk
// mailto: kevin.cowtan@york.ac.uk
//

#include "privateer-lib.h"

void privateer::coot::insert_coot_prologue_scheme ( std::fstream& output )
{
    output  << "; This script has been created by Privateer (Agirre, Iglesias, Rovira, Davies, Wilson and Cowtan, 2013-16)\n"
            << "(set-graphics-window-size 1873 968)\n"
            << "(set-graphics-window-position 0 0)\n"
            << "(set-go-to-atom-window-position 0 19)\n"
            << "(set-display-control-dialog-position 366 20)\n"
            << "(vt-surface 2)\n"
            << "(set-clipping-front  0.00)\n"
            << "(set-clipping-back  0.00)\n"
            << "(set-map-radius 10.00)\n"
            << "(set-iso-level-increment  0.0500)\n"
            << "(set-diff-map-iso-level-increment  0.0050)\n"
            << "(set-colour-map-rotation-on-read-pdb 21.00)\n"
            << "(set-colour-map-rotation-on-read-pdb-flag 1)\n"
            << "(set-colour-map-rotation-on-read-pdb-c-only-flag 1)\n"
            << "(set-swap-difference-map-colours 0)\n"
            << "(set-background-colour  0.00  0.00  0.00)\n"
            << "(set-symmetry-size 13.00)\n"
            << "(set-symmetry-colour-merge  0.50)\n"
            << "(set-symmetry-colour  0.10  0.20  0.80)\n"
            << "(set-symmetry-atom-labels-expanded 0)\n"
            << "(set-active-map-drag-flag 1)\n"
            << "(set-show-aniso 0)\n"
            << "(set-aniso-probability 50.00)\n"
            << "(set-smooth-scroll-steps 40)\n"
            << "(set-smooth-scroll-limit 10.00)\n"
            << "(set-font-size 2)\n"
            << "(set-rotation-centre-size  0.10)\n"
            << "(set-default-bond-thickness 5)\n"
            << "(scale-zoom  0.20)\n"
            << "(set-nomenclature-errors-on-read \"auto-correct\")"
            << "(set-run-state-file-status 0)\n";
}

void privateer::coot::insert_coot_files_loadup_scheme ( std::fstream& output, const clipper::String& pdb, const clipper::String& mapbest, const clipper::String& mapdiff, const clipper::String& mapomit, bool mode )
{
    if (!mode) output << "(handle-read-draw-molecule \"" << pdb << "\")\n";
    
    if ( mapbest == "" ) // no map output
    {
        output << "(set-last-map-colour 1.00  0.13  0.89)\n"
               << "(interesting-things-gui \"Validation report from Privateer\"\n\t(list\n\t\t";
    }
    else
    {
        if (!mode)
            output << "(handle-read-ccp4-map \""
            << mapbest
            << "\" 0)\n"
            << "(handle-read-ccp4-map \""
            << mapomit
            << "\" 1)\n";
        
        output << "(set-last-map-colour 1.00  0.13  0.89)\n"
               << "(interesting-things-gui \"Validation report from Privateer\"\n\t(list\n\t\t";
    }
}

void privateer::coot::insert_coot_files_loadup_python ( std::fstream& output, const clipper::String& pdb, const clipper::String& mapbest, const clipper::String& mapdiff, const clipper::String& mapomit, bool mode )
{
    if (!mode) output  << "handle_read_draw_molecule (\"" << pdb << "\")\n";

        if ( mapbest == "" ) // no map output
    {
        output << "set_last_map_colour  (1.00,  0.13,  0.89)\n"
               << "interesting_things_gui (\"Validation report from Privateer\",[\n";
    }
    else
    {
        if (!mode)
                output << "handle_read_ccp4_map (\"" << mapbest << "\", 0)\n" << "handle_read_ccp4_map (\"" << mapomit << "\", 1)\n";

            output << "set_last_map_colour  (1.00,  0.13,  0.89)\n"
           << "interesting_things_gui (\"Validation report from Privateer\",[\n";
    }
}

void privateer::coot::insert_coot_epilogue_scheme ( std::fstream& output )
{
    output  << "\n\n))\n(set-scroll-wheel-map 3)\n"
            << "(set-matrix 20.00)\n"
            << "(set-refine-with-torsion-restraints 1)\n"
            << "(set-show-symmetry-master 0)\n";
}

void privateer::coot::insert_coot_prologue_python ( std::fstream& output )
{

    output  << "# This script has been created by Privateer (Agirre, Iglesias, Rovira, Davies, Wilson and Cowtan, 2013-16)\n"
            << "set_graphics_window_size (1873, 968)\n"
        << "set_graphics_window_position (0, 0)\n"
        << "set_go_to_atom_window_position (0, 19)\n"
        << "vt_surface (2)\n"
        << "set_clipping_front  (0.00)\n"
        << "set_clipping_back  (0.00)\n"
        << "set_map_radius (10.00)\n"
        << "set_iso_level_increment  (0.0500)\n"
        << "set_diff_map_iso_level_increment  (0.0050)\n"
        << "set_colour_map_rotation_on_read_pdb (21.00)\n"
        << "set_colour_map_rotation_on_read_pdb_flag (1)\n"
        << "set_colour_map_rotation_on_read_pdb_c_only_flag (1)\n"
        << "set_swap_difference_map_colours (0)\n"
        << "set_background_colour  (0.00,  0.00,  0.00)\n"
        << "set_symmetry_size (13.00)\n"
        << "set_symmetry_colour_merge  (0.50)\n"
        << "set_symmetry_colour  (0.10,  0.20,  0.80)\n"
        << "set_symmetry_atom_labels_expanded (0)\n"
        << "set_active_map_drag_flag (1)\n"
        << "set_show_aniso (0)\n"
        << "set_aniso_probability (50.00)\n"
        << "set_smooth_scroll_steps (40)\n"
        << "set_smooth_scroll_limit (10.00)\n"
        << "set_font_size (2)\n"
        << "set_rotation_centre_size (0.10)\n"
        << "set_default_bond_thickness (4)\n"
        << "scale_zoom (0.20)\n"
        << "set_nomenclature_errors_on_read (\"auto-correct\")\n"
        << "set_run_state_file_status (0)\n"
            << "toggle_idle_spin_function\n";
}

void privateer::coot::insert_coot_epilogue_python ( std::fstream& output )
{
    output  << "\n\n])\nset_scroll_wheel_map (3)\n"
            << "set_matrix (20.00)\n"
            << "set_refine_with_torsion_restraints (1)\n"
            << "set_show_symmetry_master (0)\n";
}

void privateer::coot::insert_coot_command ( std::fstream& output, std::string command )
{
    output << command << "\n" ;
}

void privateer::coot::insert_coot_go_to_sugar_scheme ( std::fstream& output, const clipper::Coord_orth& sugar_centre, const clipper::String& diagnostic )
{
    output  << "\t(list\t\"" << diagnostic << "\"\t" << sugar_centre.x() << "\t" << sugar_centre.y() << "\t" << sugar_centre.z() << ")\n";
}

void privateer::coot::insert_coot_go_to_sugar_python ( std::fstream& output, const clipper::Coord_orth& sugar_centre, const clipper::String& diagnostic )
{
    output  << "\t[\"" << diagnostic << "\",\t" << sugar_centre.x() << ",\t" << sugar_centre.y() << ",\t" << sugar_centre.z() << "],\n";
}

void privateer::coot::insert_coot_statusbar_text_scheme ( std::fstream& output, clipper::String& text)
{
    output  << "(add-status-bar-text \"" << text << "\")" ;
}

void privateer::coot::insert_coot_statusbar_text_python ( std::fstream& output, clipper::String& text )
{
    output  << "add_status_bar_text (\"" << text << "\")" ;
}




///////// Privateer's glycoplot library /////////

std::string privateer::glycoplot::get_colour ( Colour colour, bool original_style, bool inverted )
{
    if ( inverted ) // ask for the opposite colour if we're swapping blacks and whites
    {
        if ( colour == white ) colour = black;
        else if ( colour == black ) colour = white;
    }
    
    if ( original_style )    // Essentials of glycobiology, 3rd edition //
    {
        switch (colour)
        {
            case blue:
                return "#0000fa;";
            case green:
                return "#00c832;";
            case black:
                return "#000000;";
            case orange:
                return "#fa6400;";
            case yellow:
                return "#ffff00;";
            case tan:
                return "#966432;";
            case purple:
                return "#7d007d;";
            case red:
                return "#fa0000;";
            case cyan:
                return "#c8fafa;";
            case white:
                return "#ffffff;";
        }
        return "#ffffff;";
    }
    else        // Use Privateer's washed-out colours, less disruptive in a publication //
    {
        switch (colour)
        {
            case blue:
                return "#014f87;";
            case green:
                return "#3b994f;";
            case black:
                return "#000000;";
            case orange:
                return "#f98400;";
            case yellow:
                return "#fabc1d;";
            case tan:
                return "#a68442;";
            case purple:
                return "#a5197d;";
            case red:
                return "#b70017;";
            case cyan:
                return "#c8fafa;";
            case white:
                return "#ffffff;";
        }
        
        return "#ffffff;";
    }
}

void privateer::glycoplot::Plot::write_svg_header   ( std::fstream& of )
{
    
    of << "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n\n"
       << "<!-- Generator: Privateer (YSBL, University of York, distributed by CCP4) -->\n"
       << "<!-- Please reference: Agirre, Iglesias, Rovira, Davies, Wilson & Cowtan (2015) Nat Struct & Mol Biol 22(11), 833-834 -->\n\n"
       << "<svg xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n"
       << "     xmlns:cc=\"http://creativecommons.org/ns#\"\n"
       << "     xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n"
       << "     xmlns:svg=\"http://www.w3.org/2000/svg\"\n"
       << "     xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n"
       << "     xmlns=\"http://www.w3.org/2000/svg\"\n"
       << "     version=\"1.1\"\n"
       << "     width=\"" << get_width() << "\" \n"
       << "     height=\"" << get_height() << "\" \n"
       << "     viewBox=\"" << get_viewbox() << " \"\n"
       << "     preserveAspectRatio=\"xMinYMinXMaxYMax meet\">\n\n"
       << "  <style>\n"
       << "    .my_blue   { fill:" << get_colour ( blue, original_colour_scheme ) << " }\n"
       << "    .my_red    { fill:" << get_colour ( red, original_colour_scheme  ) << " }\n"
       << "    .my_yellow { fill:" << get_colour ( yellow, original_colour_scheme  ) << " }\n"
       << "  </style>\n";
    
}

void privateer::glycoplot::Plot::write_svg_definitions( std::fstream& of )
{
    of << "  <defs>\n"
    
       // colour patterns for two-colour shapes
    
       << "    <filter id=\"displace\">\n"
       << "      <feTurbulence  baseFrequency=\".05\" numOctaves=\"3\" result=\"myturbulence\" />\n"
       << "      <feDisplacementMap in=\"SourceGraphic\" in2=\"myturbulence\" scale=\"10\" />\n"
       << "    </filter>\n\n"
    
       // use with filter="url(#displace)"
    
       << "    <!-- Half-yellow pattern --> \n"
       << "      <pattern id=\"half_yellow\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( yellow, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"

       << "    <!-- Half-blue pattern --> \n"
       << "      <pattern id=\"half_blue\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( blue, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "    <!-- Half-green pattern --> \n"
       << "      <pattern id=\"half_green\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( green, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "    <!-- yellow_left pattern --> \n"
       << "      <pattern id=\"yellow_left\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( yellow, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='25 0, 25 50, 0 25' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"

       << "    <!-- blue_up pattern --> \n"
       << "      <pattern id=\"blue_up\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( blue, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 50 25, 25 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "    <!-- green_right pattern --> \n"
       << "      <pattern id=\"green_right\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( green, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 25 50, 25 0' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "    <!-- tan_down pattern --> \n"
       << "      <pattern id=\"tan_down\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( tan, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 50 25, 25 0' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       // hexoses, circles
    
       << "    <!--  Glc   --> "
       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"glc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( blue, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!--  Gal   --> "
       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"gal\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( yellow, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       << "    <!--  Man   --> "
       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"man\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       << "    <!--  Fuc   --> "
       << "<polygon points='0 50, 25 0, 50 50' rx=\"0\" ry=\"0\" id=\"fuc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( red, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!--  Xyl   --> "
       << "<polygon points='39.5,50 24.5,37.5 9.5,50 14.5,32.5 0,20 19.5,20 24.5,0 29.5,20 50,20 34.5,32.5' rx=\"0\" ry=\"0\" id=\"xyl\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( orange, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       // n-acetyl hexosamines, squares
    
       << "    <!-- GlcNAc --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"glcnac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( blue, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- GalNAc --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"galnac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( yellow, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- ManNAc --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"mannac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       // hexosamines, squares in two colours

       << "    <!-- GlcN --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"glcn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_blue);"
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- GalN --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"galn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_yellow);"
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- ManN --> "
       <<  "<rect width =\"50\" height=\"50\" id=\"mann\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_green);"
       << "stroke-width:2.8;\" />\n"

       // acidic sugars, diamond shapes in one or two colours

       << "    <!-- Neu5Ac --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"neu5ac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( purple, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- Neu5Gc --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"neu5gc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( cyan, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- KDN --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"kdn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- GlcA --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"glca\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#blue_up);"
       << "stroke-width:2.8;\" />\n"

       << "    <!-- IdoA --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"idoa\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#tan_down);"
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- GalA --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"gala\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#yellow_left);"
       << "stroke-width:2.8;\" />\n"
    
       << "    <!-- ManA --> "
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"mana\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#green_right);"
       << "stroke-width:2.8;\" />\n"
    
       // bond types, continuous and dashed lines
    
       << "    <!-- alpha  --> "
       << "<line x1=\"0\" y1=\"0\" x2=\"110\" y2=\"0\" style=\"stroke:" << get_colour(black, original_colour_scheme, inverted_background ) << " stroke-width:2; stroke-linecap:round; stroke-dasharray:9,6;\" id=\"alpha\" />\n"
    
       << "    <!--  beta  --> "
       << "<line x1=\"0\" y1=\"0\" x2=\"110\" y2=\"0\" style=\"stroke:" << get_colour(black, original_colour_scheme, inverted_background ) << " stroke-width:2; stroke-linecap:round;\" id=\"beta\" />\n"
    
       // a generic hexagon shape for unsupported sugars
    
       << "    <!-- Other  --> "
       << "<polygon points='25 0, 50 11, 50 38, 25 50, 0 38, 0 11' rx=\"0\" ry=\"0\" id=\"unk\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( white, original_colour_scheme )
       << "stroke-width:4.0; \" />\n"
    
       << "  </defs>\n\n" ;
    
}

void privateer::glycoplot::Plot::write_svg_contents ( std::fstream& of )
{
    of << "<title>" << get_title() << "</title>\n";
    
    for (int i = 0; i < list_of_shapes.size() ; i ++)
    {
        of << list_of_shapes[i]->get_XML();
    }
} //!< doesn't add html anchors, as SVG files are supposed to be standalone and not linked to any other CCP4 application


void privateer::glycoplot::Plot::write_svg_footer ( std::fstream& of )
{
    of << "\n</svg>" ;
}


std::string privateer::glycoplot::Plot::get_svg_string_header   ( )
{
    std::ostringstream of;
    
    of << "<svg xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n"
       << "     xmlns:cc=\"http://creativecommons.org/ns#\"\n"
       << "     xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n"
       << "     xmlns:svg=\"http://www.w3.org/2000/svg\"\n"
       << "     xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n"
       << "     xmlns=\"http://www.w3.org/2000/svg\"\n"
       << "     version=\"1.1\"\n"
       << "     width=\"" << get_width() << "\" \n"
       << "     height=\"" << get_height() << "\" \n"
       << "     viewBox=\"" << get_viewbox() << " \"\n"
       << "     preserveAspectRatio=\"xMinYMinXMaxYMax meet\">\n\n"
       << "  <style>\n"
       << "    .my_blue   { fill:" << get_colour ( blue, original_colour_scheme ) << " }\n"
       << "    .my_red    { fill:" << get_colour ( red, original_colour_scheme  ) << " }\n"
       << "    .my_yellow { fill:" << get_colour ( yellow, original_colour_scheme  ) << " }\n"
       << "  </style>\n";
    
    return of.str();
}


std::string privateer::glycoplot::Plot::get_svg_string_contents ( )
{
    std::ostringstream of;
    
        of << "  <defs>\n"
    
       // lightweight representation for string streams

       << "      <filter id=\"displace\">\n"
       << "        <feTurbulence  baseFrequency=\".05\" numOctaves=\"3\" result=\"myturbulence\" />\n"
       << "        <feDisplacementMap in=\"SourceGraphic\" in2=\"myturbulence\" scale=\"10\" />\n"
       << "      </filter>\n\n"
    
       // use with filter="url(#displace)"
    
       << "      <pattern id=\"half_yellow\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( yellow, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"

       << "      <pattern id=\"half_blue\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( blue, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "      <pattern id=\"half_green\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <rect width=\"50\" height=\"50\" x=\"0\" y=\"0\" style=\"stroke:"
       << "none; " << "fill:" << get_colour ( green, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 0, 0 50, 50 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "      <pattern id=\"yellow_left\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( yellow, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='25 0, 25 50, 0 25' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"

       << "      <pattern id=\"blue_up\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( blue, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 50 25, 25 50' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "      <pattern id=\"green_right\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( green, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 25 50, 25 0' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       << "      <pattern id=\"tan_down\" x=\"0\" y=\"0\" width=\"50\" height=\"50\" patternUnits=\"userSpaceOnUse\" >\n"
       << "        <polygon points='25 0, 50 25, 25 50, 0 25' style=\"stroke:"
       << "none; " << "fill:" << get_colour ( tan, original_colour_scheme ) << "\"/>\n"
       << "        <polygon points='0 25, 50 25, 25 0' rx=\"0\" ry=\"0\" style=\"stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " stroke-width:1.5; fill:"
       << get_colour ( white, original_colour_scheme ) << "\" />\n"
       << "      </pattern>\n"
    
       // hexoses, circles
    
       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"glc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( blue, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"gal\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( yellow, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       <<  "<circle r =\"25\" cx =\"25\" cy =\"25\" id=\"man\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       << "<polygon points='0 50, 25 0, 50 50' rx=\"0\" ry=\"0\" id=\"fuc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( red, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='39.5,50 24.5,37.5 9.5,50 14.5,32.5 0,20 19.5,20 24.5,0 29.5,20 50,20 34.5,32.5' rx=\"0\" ry=\"0\" id=\"xyl\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( orange, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       // n-acetyl hexosamines, squares
    
       <<  "<rect width =\"50\" height=\"50\" id=\"glcnac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( blue, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       <<  "<rect width =\"50\" height=\"50\" id=\"galnac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( yellow, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       <<  "<rect width =\"50\" height=\"50\" id=\"mannac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"

       // hexosamines, squares in two colours

       <<  "<rect width =\"50\" height=\"50\" id=\"glcn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_blue);"
       << "stroke-width:2.8;\" />\n"
    
       <<  "<rect width =\"50\" height=\"50\" id=\"galn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_yellow);"
       << "stroke-width:2.8;\" />\n"
    
       <<  "<rect width =\"50\" height=\"50\" id=\"mann\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#half_green);"
       << "stroke-width:2.8;\" />\n"

       // acidic sugars, diamond shapes in one or two colours

       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"neu5ac\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( purple, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"neu5gc\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( cyan, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"kdn\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( green, original_colour_scheme )
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"glca\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#blue_up);"
       << "stroke-width:2.8;\" />\n"

       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"idoa\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#tan_down);"
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"gala\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#yellow_left);"
       << "stroke-width:2.8;\" />\n"
    
       << "<polygon points='25 0, 50 25, 25 50, 0 25' rx=\"0\" ry=\"0\" id=\"mana\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill: url(#green_right);"
       << "stroke-width:2.8;\" />\n"
    
       // bond types, continuous and dashed lines
    
       << "<line x1=\"0\" y1=\"0\" x2=\"110\" y2=\"0\" style=\"stroke:" << get_colour(black, original_colour_scheme, inverted_background ) << " stroke-width:2; stroke-linecap:round; stroke-dasharray:9,6;\" id=\"alpha\" />\n"
    
       << "<line x1=\"0\" y1=\"0\" x2=\"110\" y2=\"0\" style=\"stroke:" << get_colour(black, original_colour_scheme, inverted_background ) << " stroke-width:2; stroke-linecap:round;\" id=\"beta\" />\n"
    
       // a generic hexagon shape for unsupported sugars
    
       << "<polygon points='25 0, 50 11, 50 38, 25 50, 0 38, 0 11' rx=\"0\" ry=\"0\" id=\"unk\" style=\" stroke:"
       << get_colour ( black, original_colour_scheme, inverted_background ) << " fill:" << get_colour ( white, original_colour_scheme )
       << "stroke-width:4.0; \" />\n"
    
       << "  </defs>\n\n" ;
    
    for (int i = 0; i < list_of_shapes.size() ; i ++)
    {
        of << "<a xmlns=\"http://www.w3.org/2000/svg\" id=\"anchor\" xlink:href=\""
           << list_of_shapes[i]->get_mmdbsel() << "\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" target=\"_top\">";
        of << list_of_shapes[i]->get_XML();
        of << "</a>\n";
    }
    
    return of.str();
}


std::string privateer::glycoplot::Plot::get_svg_string_footer ( )
{
    std::ostringstream of;
    
    of << "</svg>" ;
    
    return of.str();
}


bool privateer::glycoplot::Plot::write_to_file  ( std::string file_path )
{
    std::fstream out;
    
    out.open( file_path.c_str(), std::fstream::out);
    
    write_svg_header      ( out );
    write_svg_definitions ( out );
    write_svg_contents    ( out );
    write_svg_footer      ( out );
    
    out.close();
    
    return false;
}


std::string privateer::glycoplot::Plot::get_XML  ( )
{
    return get_svg_string_header() + get_svg_string_contents() + get_svg_string_footer();
}


bool privateer::glycoplot::Plot::plot_glycan ( clipper::MGlycan glycan, bool oxford_angles )
{

    this->set_size(3000,3000);
    
    const clipper::String type = glycan.get_type();
    privateer::glycoplot::GlycanRoot *root;
    std::string mmdbsel = "mmdb:///" + glycan.get_chain().substr(0,1) + "/" + glycan.get_root().first.id().trim();

    // first, let us draw the root

    if ( type == "n-glycan" )
        root = new privateer::glycoplot::GlycanRoot(2768, 990, "N", glycan.get_root().first.type(), glycan.get_chain().substr(0,1) + "/" + glycan.get_root().first.id().trim(), "N-glycosylation. " + glycan.get_root_description(), mmdbsel );
    else if ( type == "o-glycan" )
        root = new privateer::glycoplot::GlycanRoot(2768, 990, "O", glycan.get_root().first.type(), glycan.get_chain().substr(0,1) + "/" + glycan.get_root().first.id().trim(), "O-glycosylation. "+ glycan.get_root_description(), mmdbsel );
    else if ( type == "s-glycan" )
        root = new privateer::glycoplot::GlycanRoot(2768, 990, "S",glycan.get_root().first.type(), glycan.get_chain().substr(0,1) + "/" + glycan.get_root().first.id().trim(), "S-glycosylation. "+ glycan.get_root_description(), mmdbsel );
    else return true;
    
    add_block ( root );
    
    // then a linkage, sounds easy
    
    if ( glycan.get_root().second.anomer() == "alpha" )
    {
        AlphaBond *first_bond = new AlphaBond( 2800, 1015, side, glycan.get_link_description(), mmdbsel ); // Fix me: add NAG-ASN torsions for instance
        add_link ( first_bond );
    }
    else
    {
        BetaBond *first_bond = new BetaBond( 2800, 1015, side, glycan.get_link_description(), mmdbsel );
        add_link ( first_bond );
    }
    
    // let the fun begin: paint the tree with yet another recursive function
    
    const clipper::MGlycan::Node node = glycan.get_node ( 0 ); // get the first node
    
    recursive_paint ( glycan, node, 2685, 990 ); // and initiate House Party protocol
    
    this->tighten_viewbox();
    
    return false;
}

void privateer::glycoplot::Plot::recursive_paint ( clipper::MGlycan mg, clipper::MGlycan::Node node, int x, int y, bool oxford_angles )
{

    const clipper::MSugar& sugar = node.get_sugar();
    
    std::string mmdbsel = "mmdb:///" + mg.get_chain().substr(0,1) + "/" + sugar.id().trim();
    std::string sugname = carbname_of ( sugar.type() );
    
    if ( sugname == "Glc" )
    {
        Glc * glc = new Glc (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel );
        add_block ( glc );
    }
    else if ( sugname == "Gal" )
    {
        Gal * gal = new Gal (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( gal );
    }
    else if ( sugname == "Man" )
    {
        Man * man = new Man (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( man );
    }
    else if ( sugname == "Fuc" )
    {
        Fuc * fuc = new Fuc (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( fuc );
    }
    else if ( sugname == "Xyl" )
    {
        Xyl * xyl = new Xyl (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( xyl );
    }
    else if ( sugname == "GlcN" )
    {
        GlcN * glcn = new GlcN (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( glcn );
    }
    else if ( sugname == "GalN" )
    {
        GalN * galn = new GalN (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( galn );
    }
    else if ( sugname == "ManN" )
    {
        ManN * mann = new ManN (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel );
        add_block ( mann );
    }
    else if ( sugname == "GlcNAc" )
    {
        GlcNAc * glcnac = new GlcNAc (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( glcnac );
    }
    else if ( sugname == "GalNAc" )
    {
        GalNAc * galnac = new GalNAc (x, y, get_svg_tooltip ( sugar, validation ) , mmdbsel );
        add_block ( galnac );
    }
    else if ( sugname == "ManNAc" )
    {
        ManNAc * mannac = new ManNAc (x, y, get_svg_tooltip ( sugar, validation ) , mmdbsel );
        add_block ( mannac );
    }
    else if ( sugname == "GlcA" )
    {
        GlcA * glca = new GlcA (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( glca );
    }
    else if ( sugname == "GalA" )
    {
        GalA * gala = new GalA (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( gala );
    }
    else if ( sugname ==  "ManA" )
    {
        ManA * mana = new ManA (x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( mana );
    }
    else if ( sugname ==  "Neu5Gc" )
    {
        Neu5Gc *neu5gc = new Neu5Gc ( x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( neu5gc );
    }
    else if ( sugname ==  "Neu5Ac" )
    {
        Neu5Ac *neu5ac = new Neu5Ac ( x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( neu5ac );
    }
    else if ( sugname ==  "IdoA" )
    {
        IdoA *idoa = new IdoA ( x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( idoa );
    }
    else if ( sugname ==  "KDN" )
    {
        KDN *kdn = new KDN ( x, y, get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( kdn );
    }
    else
    {
        Unk *unk = new Unk ( x, y, *(sugar.type().substr(0,1).c_str()), get_svg_tooltip ( sugar, validation ), mmdbsel  );
        add_block ( unk );
    }
    
    int up_down = 0; // number of special cases with perpendicular link
    int branches = node.number_of_connections();
    
    // decide here based on 2D notation
    //////////////////////////////////////
    
    if ( oxford_angles )
    {
        for ( int j = 0; j < node.number_of_connections(); j++)
        {
            clipper::MGlycan::Linkage link = node.get_connection(j);
            const clipper::MGlycan::Node& linked_node = mg.get_node(link.get_linked_node_id());
        
            Link_type orientation;
        
            if ( link.get_order() >= 7 ) // up. should be == 8, but just to prevent unforeseen circumstances
            {
                orientation = up;
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
        
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x + 25, y + 35, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x + 25, y + 35, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x, y - 80 );
            }
            if ( link.get_order() == 6 ) // up-left
            {
                orientation = up_side;
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
        
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x + 25, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x + 25, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x - 80, y - 80 );
            }
            if ( link.get_order() == 4 ) // left
            {
                orientation = side;
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
        
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x + 35, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x + 35, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x - 80, y );
            }
            if ( link.get_order() == 3 ) // left-down
            {
                orientation = down_side;
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
        
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x + 25, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x + 25, y + 25, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x - 80, y + 80 );
            }
            if ( link.get_order() == 2 ) // down
            {
                orientation = down;
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
        
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x + 25, y + 15, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x + 25, y + 15, orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x, y + 80 );
            }
        }
    }       /// end oxford notation
            ////////////////////////////
    else
    {
        for ( int j = 0; j < node.number_of_connections(); j++)
        {
            clipper::MGlycan::Linkage link = node.get_connection(j);
            const clipper::MGlycan::Node& linked_node = mg.get_node(link.get_linked_node_id());
        
            // first deal with a couple of special cases: Fucose and Xylose
        
            if ( carbname_of(linked_node.get_sugar().type()) == "Fuc" )
            {
                up_down++;
            
                if ( link.get_order() == 3 ) // it goes up
                {
                    if ( link.get_anomericity ( ) == "alpha" )
                    {
                        AlphaBond * new_bond = new AlphaBond( x+25, y + 25, up, link.get_description(), mmdbsel );
                        add_link ( new_bond );
                    }
                    else
                    {
                        BetaBond * new_bond = new BetaBond( x+25, y + 25, up, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    recursive_paint ( mg, linked_node, x, y - 110 );
                }
                else // down it goes, then
                {
                    if ( link.get_anomericity ( ) == "alpha" )
                    {
                        AlphaBond * new_bond = new AlphaBond( x+25, y + 25, down, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    else
                    {
                        BetaBond * new_bond = new BetaBond( x+25, y + 25, down, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    recursive_paint ( mg, linked_node, x, y + 110 );
                }
            }
            else if ( carbname_of(linked_node.get_sugar().type()) == "Xyl" )
            {
                up_down++;
            
                if ( link.get_order() == 3 ) // it goes up
                {
                    if ( link.get_anomericity ( ) == "alpha" )
                    {
                        AlphaBond * new_bond = new AlphaBond( x+25, y + 25, up, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    else
                    {
                        BetaBond * new_bond = new BetaBond( x+25, y + 25, up, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    recursive_paint ( mg, linked_node, x, y - 110 );
                }
                else // down it goes, then
                {
                    if ( link.get_anomericity ( ) == "alpha" )
                    {
                        AlphaBond * new_bond = new AlphaBond( x+25, y + 25, down, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    else
                    {
                        BetaBond * new_bond = new BetaBond( x+25, y + 25, down, link.get_description(), mmdbsel  );
                        add_link ( new_bond );
                    }
                    recursive_paint ( mg, linked_node, x, y + 110 );
                }
            }
            else // pseudo-general case
            {
                Link_type orientation;
                int sign = 0;
            
                switch (branches - j - up_down)
                {
                    case 3:
                        orientation = up_side;
                        sign = -1;
                        break;
                    case 2:
                        orientation = side;
                        break;
                    case 1:
                        if ( branches != 1 )
                        {
                            orientation = down_side;
                            sign = 1;
                        }
                        else
                        {
                            orientation = side;
                            sign = 0;
                        }
                        break;
                    default:
                        orientation = side;
                        break;
                }
            
                bool is_ketose = false;
            
                if ( linked_node.get_sugar().full_type() == "ketose" ) // ketoses
                    is_ketose = true;
            
                if ( link.get_anomericity ( ) == "alpha" )
                {
                    AlphaBond * new_bond = new AlphaBond( x, y + 25 + (sign * 15), orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                else
                {
                    BetaBond * new_bond = new BetaBond( x, y + 25 + (sign * 15), orientation, link.get_description(is_ketose), mmdbsel  );
                    add_link ( new_bond );
                }
                recursive_paint ( mg, linked_node, x - 110, y + ( sign * 80 ) );
            }
        }
    }
}


/*! Remodel the SVG viewport to the contents
 * 	\return A std::vector<int> containing the new viewport coordinates, in this order: ( x0, y0, x1, y1 )
 */

void privateer::glycoplot::Plot::tighten_viewbox ()
{
  
    int min_x, min_y, max_x, max_y;
    min_x = 99999; max_x = this->width-60;
    min_y = 99999; max_y = 0;
    
    for ( int i = 0; i < list_of_shapes.size() ; i++ )
    {
        if ( list_of_shapes[i]->get_x() < min_x )
            min_x = list_of_shapes[i]->get_x();

        if ( list_of_shapes[i]->get_y() < min_y )
            min_y = list_of_shapes[i]->get_y();
        if ( list_of_shapes[i]->get_y() > max_y )
            max_y = list_of_shapes[i]->get_y();
    }
       
    std::vector<int> new_viewbox;
    new_viewbox.push_back ( min_x -10 );
    new_viewbox.push_back ( min_y -10 );
    new_viewbox.push_back ( max_x -min_x );
    new_viewbox.push_back ( max_y -min_y +70 );
    this->set_viewbox ( new_viewbox );
    smaller ? this->set_size((max_x-min_x)*0.7, (max_y-min_y+70)*0.7) : this->set_size(max_x-min_x, max_y-min_y+70);

}


bool privateer::glycoplot::Plot::plot_demo ( )
{
    // add positioning, etc 
    
    this->set_size_and_viewbox(1000, 500);
    
    privateer::glycoplot::Glc *glc = new privateer::glycoplot::Glc (60,  60, "Glucose" );
    privateer::glycoplot::Gal *gal = new privateer::glycoplot::Gal (170, 60, "Galactose" );
    privateer::glycoplot::Man *man = new privateer::glycoplot::Man (280, 60, "Mannose" );
    privateer::glycoplot::Fuc *fuc = new privateer::glycoplot::Fuc (390, 60, "Fucose" );
    privateer::glycoplot::Xyl *xyl = new privateer::glycoplot::Xyl (500, 60, "Xylose");

    privateer::glycoplot::GlcN *glcn = new privateer::glycoplot::GlcN (60,  170, "Glucosamine" );
    privateer::glycoplot::GalN *galn = new privateer::glycoplot::GalN (170, 170, "Galactosamine" );
    privateer::glycoplot::ManN *mann = new privateer::glycoplot::ManN (280, 170, "Mannosamine" );

    privateer::glycoplot::GlcA *glca = new privateer::glycoplot::GlcA (390, 170, "Glucuronic acid" );
    privateer::glycoplot::GalA *gala = new privateer::glycoplot::GalA (500, 170, "Galacturonic acid" );
    privateer::glycoplot::ManA *mana = new privateer::glycoplot::ManA (610, 170, "Mannuronic acid" );
    privateer::glycoplot::IdoA *idoa = new privateer::glycoplot::IdoA (720, 170, "Iduronic acid" );
    privateer::glycoplot::Neu5Ac *neu5ac = new privateer::glycoplot::Neu5Ac (830, 170, "N-acetyl Neuraminic acid" );
    privateer::glycoplot::Neu5Gc *neu5gc = new privateer::glycoplot::Neu5Gc (940, 170, "N-glycolyl Neuraminic acid" );
    privateer::glycoplot::KDN *kdn = new privateer::glycoplot::KDN (390, 280, "KDN" );
    privateer::glycoplot::Unk *unk = new privateer::glycoplot::Unk (500, 280, 'U', "Unknown" );


    privateer::glycoplot::GlcNAc *glcnac = new privateer::glycoplot::GlcNAc (60,  280, "N-acetyl D-Glucosamine" );
    privateer::glycoplot::GalNAc *galnac = new privateer::glycoplot::GalNAc (170, 280, "N-acetyl D-Galactosamine" );
    privateer::glycoplot::ManNAc *mannac = new privateer::glycoplot::ManNAc (280, 280, "N-acetyl D-Mannosamine" );

    privateer::glycoplot::GlycanRoot *gn = new privateer::glycoplot::GlycanRoot(160, 400, "n", "ASN", "A/62", "n-glycosylation");
    privateer::glycoplot::GlycanRoot *go = new privateer::glycoplot::GlycanRoot(460, 400, "o", "THR", "T/1000", "o-glycosylation");
    privateer::glycoplot::GlycanRoot *gs = new privateer::glycoplot::GlycanRoot(760, 400, "s", "CYS", "C/4", "s-glycosylation");
    
    privateer::glycoplot::AlphaBond *ab  = new privateer::glycoplot::AlphaBond ( 750, 305, side, "Alpha bond" );
    privateer::glycoplot::BetaBond *bb   = new privateer::glycoplot::BetaBond ( 900, 305, side, "Beta bond" );
    
    add_block(glc);  add_block(gal);  add_block(man);    add_block(fuc);    add_block(xyl);    add_block(glcn);   add_block(galn);
    add_block(mann); add_block(glca); add_block(gala);   add_block(mana);   add_block(idoa);   add_block(neu5ac); add_block(neu5gc);
    add_block(kdn);  add_block(unk);  add_block(glcnac); add_block(galnac); add_block(mannac); add_block(gn);     add_block(go);
    add_block(gs);   add_link(ab);    add_link (bb);

    return false;
}

// get XML from hexoses

std::string privateer::glycoplot::Glc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#glc\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::Man::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#man\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::Gal::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#gal\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::Fuc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#fuc\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    return tmp.str();
}

std::string privateer::glycoplot::Xyl::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#xyl\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}


// get XML from hexosamines

std::string privateer::glycoplot::GalN::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#galn\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}

std::string privateer::glycoplot::GlcN::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#glcn\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}

std::string privateer::glycoplot::ManN::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#mann\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}


// get XML from N-acetyl hexosamines

std::string privateer::glycoplot::GlcNAc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#glcnac\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}

std::string privateer::glycoplot::GalNAc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#galnac\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}

std::string privateer::glycoplot::ManNAc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#mannac\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}


// get XML from acidic sugars

std::string privateer::glycoplot::Neu5Ac::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#neu5ac\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::Neu5Gc::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#neu5gc\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::KDN::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#kdn\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::GlcA::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#glca\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::ManA::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#mana\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::GalA::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#gala\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}

std::string privateer::glycoplot::IdoA::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#idoa\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";

    
    return tmp.str();
}


std::string privateer::glycoplot::Unk::get_XML ()
{
    std::ostringstream tmp;
    
    tmp   <<  "  <use xlink:href=\"#unk\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\" >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n"
          <<  "<text x=\"" << get_x() + 25 << "\""
          <<  " y=\"" << get_y() +34 << "\" text-anchor=\"middle\" font-family=\"Helvetica\" font-size=\"24\" font-weight=\"bold\">" << code << "</text>\n";

    
    return tmp.str();
}

// plus, get XML from the glycan root (protein part)

std::string privateer::glycoplot::GlycanRoot::get_XML ()
{
    std::ostringstream tmp;
    std::string link_name = get_link_atom();
    std::string link_colour = "my_blue";
    
    if ( link_name == "o" ) link_colour = "my_red";
    else if ( link_name == "s" ) link_colour = "my_yellow";
    
    tmp << "  <g id=\"glycan_root\" transform=\"translate(" << get_x() << " " << get_y() << ")\" >\n"
        << "    <rect width=\"160\" height=\"50\" rx=\"10\" ry=\"10\" style=\"stroke:#000000;"
        << " fill:#ffffff; stroke-width:2.0;\" />\n"
        << "    <line x1=\"30\" y1=\"0\" x2=\"30\" y2=\"50\" style=\"stroke:#000000;"
        << " fill:#ffffff; stroke-width:2.0;\" />\n"
        << "    <text x=\"7\" y=\"32\" class=\"" << link_colour << "\" font-weight=\"bold\" font-family=\"Helvetica\" font-size=\"24\">"
        << link_name << "</text>\n"
        << "    <text x=\"92\" y=\"32\" fill=\"black\" text-anchor=\"middle\" font-weight=\"bold\" font-family=\"Helvetica\" font-size=\"24\">"
        << get_root_name() << "<tspan baseline-shift=\"sub\" font-weight=\"normal\" font-size=\"20\">" << get_root_id() << "</tspan></text>\n"
        << "</g>\n";
    
    return tmp.str();
}


// last but not least, get XML from the bonds

std::string privateer::glycoplot::AlphaBond::get_XML ()
{
    std::ostringstream tmp;
    
    std::string transformation = "";
    
    switch ( this->bond_type )
    {
        case up:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(-90 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
        }
        case up_side:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(-135 " << get_x() << " " << get_y() << ")\""; // was -135
            transformation = stream.str();
            break;
        }
        case down_side:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(-225 " << get_x() << " " << get_y() << ")\""; // was -180
            transformation = stream.str();
            break;
        }
        case down:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(90 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
        }
        default:
            std::stringstream stream;
            stream << " transform=\"rotate(180 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
    }
    
    tmp   <<  "  <use xlink:href=\"#alpha\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\"" << transformation << " >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}


std::string privateer::glycoplot::BetaBond::get_XML ()
{
    std::ostringstream tmp;
    
    std::string transformation = "";
    
    switch ( this->bond_type )
    {
        case up:
        {
        
            std::stringstream stream;
            stream << " transform=\"rotate(-90 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
    
        }
        case up_side:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(-135 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
        }
        case down_side:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(-225 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
        }
        case down:
        {
            std::stringstream stream;
            stream << " transform=\"rotate(90 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
            break;
        }
        default:
            std::stringstream stream;
            stream << " transform=\"rotate(180 " << get_x() << " " << get_y() << ")\"";
            transformation = stream.str();
    }
    tmp   <<  "  <use xlink:href=\"#beta\" x=\"" << get_x() << "\""
          <<  " y=\"" << get_y() << "\" id=\"" << get_id() << "\"" << transformation << " >"
          <<  "<title>" << get_tooltip() << "</title>"
          <<  "</use>\n";
    
    return tmp.str();
}

std::string privateer::scripting::get_annotated_glycans ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system )
{
    std::ostringstream of_xml;
    
    clipper::MMDBfile mfile;
    clipper::MiniMol mmol;

    const int mmdbflags = mmdb::MMDBF_IgnoreBlankLines | mmdb::MMDBF_IgnoreDuplSeqNum |
                          mmdb::MMDBF_IgnoreNonCoorPDBErrors | mmdb::MMDBF_IgnoreRemarks |
                          mmdb::MMDBF_EnforceUniqueChainID;

    mfile.SetFlag( mmdbflags );
    
    mfile.read_file( pdb_filename );
    mfile.import_minimol( mmol );
    
    if ( mmol.cell().is_null() )  // fixme: crystal-less NMR models were causing trouble
        mmol.init ( clipper::Spacegroup::p1(), clipper::Cell(clipper::Cell_descr ( 300, 300, 300, 90, 90, 90 )) );
    
    const clipper::MAtomNonBond& manb = clipper::MAtomNonBond( mmol, 1.0 );
        
    clipper::MGlycology mgl = clipper::MGlycology(mmol, manb, expression_system);

    std::vector < clipper::MGlycan > list_of_glycans = mgl.get_list_of_glycans();
    
    of_xml << "<privateer>\n" ;
    
    for ( int i = 0 ; i < list_of_glycans.size() ; i++ )
    {
        privateer::glycoplot::Plot plot(false, original_colour_scheme, list_of_glycans[i].get_root_by_name(), false, true, true, true);
        plot.plot_glycan ( list_of_glycans[i] );

        of_xml << "  <glycan type=\"" << list_of_glycans[i].get_type() << "\" root=\""
               << "/" + list_of_glycans[i].get_chain().substr(0,1)
                      + "/" + list_of_glycans[i].get_root().first.id().trim()
                      + "(" + list_of_glycans[i].get_root().first.type().trim() + ")\""
               << " chain=\"" << list_of_glycans[i].get_chain().substr(0,1) << "\">\n";
    
        of_xml << "    <svg_graphics>\n" << plot.get_svg_string_header()
               << plot.get_svg_string_contents() << plot.get_svg_string_footer()
               << "    </svg_graphics>\n";
    
        std::vector< clipper::MSugar> sugars = list_of_glycans[i].get_sugars();
        
        for ( int j = 0 ; j < sugars.size(); j++ )
        {
            of_xml << "    <sugar id=\""
                   << "/" + list_of_glycans[i].get_chain().substr(0,1)
                          + "/" + sugars[j].id().trim()
                          + "(" + sugars[j].type().trim() << ")\" >\n";
            
            of_xml << "      <detected_type>"    << sugars[j].type_of_sugar()               << "</detected_type>\n"
                   << "      <cremer-pople_Q>"   << sugars[j].puckering_amplitude()         << "</cremer-pople_Q>\n"
                   << "      <cremer-pople_Phi>" << sugars[j].cremer_pople_params()[1]      << "</cremer-pople_Phi>\n";
            if (sugars[j].ring_cardinality() == 6 )
                of_xml << "      <cremer-pople_Theta>" << sugars[j].get_bfactor()           << "</cremer-pople_Theta>\n";
            
            of_xml << "      <mean_bfactor>"     << sugars[j].get_bfactor()                 << "</mean_bfactor>\n"
                   << "      <conformation>"     << sugars[j].conformation_name()           << "</conformation>\n"
                   << "      <anomer>"           << sugars[j].anomer()                      << "</anomer>\n"
                   << "      <hand>"             << sugars[j].handedness()                  << "</hand>\n"
                   << "      <stacked_against>\n";
        
            std::vector < std::pair < clipper::MAtomIndexSymmetry, clipper::ftype > > contacts = sugars[j].get_stacked_residues();
        
            for ( int cont = 0 ; cont < contacts.size() ; cont++ )
                of_xml << "        <residue id=\"/" << mmol[contacts[cont].first.polymer()].id().substr(0,1) << "/"
                                                   << mmol[contacts[cont].first.polymer()][contacts[cont].first.monomer()].id().trim()
                                                   << "(" << mmol[contacts[cont].first.polymer()][contacts[cont].first.monomer()].type().trim()
                                                   << ")\" >\n"
                                                   << "          <angle>" << contacts[cont].second << "</angle>\n"
                                                   << "        </residue>\n";
               of_xml << "      </stacked_against>\n";
        
        
            of_xml << "      <validation>\n"
                   << "        <conformation>"   << b2s(sugars[j].ok_with_conformation())   << "</conformation>\n"
                   << "        <anomer>"         << b2s(sugars[j].ok_with_anomer())         << "</anomer>\n"
                   << "        <hand>"           << b2s(sugars[j].ok_with_chirality())      << "</hand>\n"
                   << "        <puckering>"      << b2s(sugars[j].ok_with_puckering())      << "</puckering>\n"
                   << "      </validation>\n";
            
            of_xml << "    </sugar>\n";
        }
        
        of_xml << "  </glycan>\n" ;
    }
    
    of_xml << "</privateer>\n";
    
    return of_xml.str();
}


std::string privateer::scripting::get_annotated_glycans_hierarchical ( std::string pdb_filename, bool original_colour_scheme, std::string expression_system )
{
    std::ostringstream of_xml;
    
    clipper::MMDBfile mfile;
    clipper::MiniMol mmol;

    const int mmdbflags = mmdb::MMDBF_IgnoreBlankLines | mmdb::MMDBF_IgnoreDuplSeqNum |
                          mmdb::MMDBF_IgnoreNonCoorPDBErrors | mmdb::MMDBF_IgnoreRemarks |
                          mmdb::MMDBF_EnforceUniqueChainID;

    mfile.SetFlag( mmdbflags );
    
    mfile.read_file( pdb_filename );
    mfile.import_minimol( mmol );
    
    if ( mmol.cell().is_null() )  // fixme: crystal-less NMR models were causing trouble
        mmol.init ( clipper::Spacegroup::p1(), clipper::Cell(clipper::Cell_descr ( 300, 300, 300, 90, 90, 90 )) );
    
    const clipper::MAtomNonBond& manb = clipper::MAtomNonBond( mmol, 1.0 );
        
    const clipper::MGlycology& mgl = clipper::MGlycology(mmol, manb, expression_system);

    const std::vector < clipper::MGlycan >& list_of_glycans = mgl.get_list_of_glycans();
    
    of_xml << "<privateer>\n" ;
    
    for ( int i = 0 ; i < list_of_glycans.size() ; i++ )
    {
        privateer::glycoplot::Plot plot(false, original_colour_scheme, list_of_glycans[i].get_root_by_name(), false, true, true, true);
        plot.plot_glycan ( list_of_glycans[i] );
    
        of_xml << "  <glycan type=\"" << list_of_glycans[i].get_type() << "\" root=\""
               << "/" + list_of_glycans[i].get_chain().substr(0,1)
                      + "/" + list_of_glycans[i].get_root().first.id().trim()
                      + "(" + list_of_glycans[i].get_root().first.type().trim() + ")\""
               << " chain=\"" << list_of_glycans[i].get_chain().substr(0,1) << "\">\n";
    
        of_xml << "    <svg_graphics>\n" << plot.get_svg_string_header()
               << plot.get_svg_string_contents() << plot.get_svg_string_footer()
               << "    </svg_graphics>\n";

        const clipper::MGlycan::Node& first_node = list_of_glycans[i].get_node(0);
    
        // create the first connection, which does not really exist as it is not a sugar-sugar linkage
        clipper::MGlycan::Linkage link (0, first_node.get_sugar().anomer(), 0);
        link.set_torsions (list_of_glycans[i].get_glycosylation_torsions()[0], list_of_glycans[i].get_glycosylation_torsions()[1]);
    
        of_xml << print_node ( mmol, list_of_glycans[i], first_node, list_of_glycans[i].get_chain().substr(0,1), link );

        of_xml << "  </glycan>\n";
    
        plot.delete_shapes();
        
    }
    
    of_xml << "</privateer>\n";
    
    return of_xml.str();
}


std::string privateer::scripting::print_node ( const clipper::MiniMol& mmol, const clipper::MGlycan& mg, const clipper::MGlycan::Node& node, const std::string chain, const clipper::MGlycan::Linkage& connection )
{
    std::ostringstream of_xml;
    
    const clipper::MSugar& sugar = node.get_sugar();

    of_xml << "    <sugar id=\""
                   << "/" + chain.substr(0,1)
                          + "/" + sugar.id().trim()
                          + "(" + sugar.type().trim() << ")\" >\n";
    
    of_xml << "      <link>\n"
           << "        <anomericity>"    << sugar.anomer()                      << "</anomericity>\n"
           << "        <connected_to>"   << connection.get_order()              << "</connected_to>\n"
           << "        <phi>"            << connection.get_torsions()[0]        << "</phi>\n"
           << "        <psi>"            << connection.get_torsions()[1]        << "</psi>\n";
    if ( connection.get_order() == 6 )
           of_xml << "        <omega>"   << connection.get_torsions()[2]        << "</omega>\n";
    of_xml << "      </link>\n";
    
    of_xml << "      <detected_type>"    << sugar.type_of_sugar()               << "</detected_type>\n"
           << "      <cremer-pople_Q>"   << sugar.puckering_amplitude()         << "</cremer-pople_Q>\n"
           << "      <cremer-pople_Phi>" << sugar.cremer_pople_params()[1]      << "</cremer-pople_Phi>\n";
    
    if (sugar.ring_cardinality() == 6 )
        of_xml << "      <cremer-pople_Theta>" << sugar.get_bfactor()           << "</cremer-pople_Theta>\n";
    
    of_xml << "      <mean_bfactor>"     << sugar.get_bfactor()                 << "</mean_bfactor>\n"
           << "      <conformation>"     << sugar.conformation_name()           << "</conformation>\n"
           << "      <anomer>"           << sugar.anomer()                      << "</anomer>\n"
           << "      <hand>"             << sugar.handedness()                  << "</hand>\n"
    
           << "      <stacked_against>\n";
        
           std::vector < std::pair < clipper::MAtomIndexSymmetry, clipper::ftype > > contacts = sugar.get_stacked_residues();
        
           for ( int cont = 0 ; cont < contacts.size() ; cont++ )
               of_xml << "        <residue id=\"/" << mmol[contacts[cont].first.polymer()].id().substr(0,1) << "/"
                                                   << mmol[contacts[cont].first.polymer()][contacts[cont].first.monomer()].id().trim()
                                                   << "(" << mmol[contacts[cont].first.polymer()][contacts[cont].first.monomer()].type().trim()
                                                   << ")\" >\n"
                                                   << "          <angle>" << contacts[cont].second << "</angle>\n"
                                                   << "        </residue>\n";
               of_xml << "      </stacked_against>\n"
    
    
    
           << "      <validation>\n"
           << "        <conformation>"   << b2s(sugar.ok_with_conformation())   << "</conformation>\n"
           << "        <anomer>"         << b2s(sugar.ok_with_anomer())         << "</anomer>\n"
           << "        <hand>"           << b2s(sugar.ok_with_chirality())      << "</hand>\n"
           << "        <puckering>"      << b2s(sugar.ok_with_puckering())      << "</puckering>\n"
           << "      </validation>\n";
    
    for ( int j = 0; j < node.number_of_connections(); j++)
    {
        clipper::MGlycan::Node node_no_const = node;
        const clipper::MGlycan::Linkage link = node_no_const.get_connection(j);
        const clipper::MGlycan::Node& linked_node = mg.get_node(link.get_linked_node_id());
        of_xml << print_node ( mmol, mg, linked_node, chain, link );
    }
    
    of_xml << "    </sugar>\n";

    return of_xml.str();
}

void privateer::scripting::svg_graphics_demo ( bool original_colour_scheme, bool inverted_background )
{
    privateer::glycoplot::Plot plot(false, original_colour_scheme, "demo", inverted_background );
    plot.plot_demo ( );
    plot.write_to_file ( "privateer-glycoplot_demo.svg" );
    plot.delete_shapes();
}

std::vector <char> privateer::util::number_of_conformers ( clipper::MMonomer& mmon )
{
    std::vector<char> alt_confs;
    
    bool a = false;
    bool b = false;
    
    for ( int i = 0; i < mmon.size(); i++ )
    {
        clipper::String identifier = mmon[i].id();
        if (identifier.size() > 5)
        {
            if ( identifier[5] == 'A' && !a )
            {
                alt_confs.push_back ('A'); a=true;
            }
            else if ( identifier[5] == 'B' && !b )
            {
                alt_confs.push_back ('B'); b=true;
            }
        }
    }
    return alt_confs;
}

