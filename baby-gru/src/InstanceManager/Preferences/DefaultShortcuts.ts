export type Shortcut = {
    modifiers: string[];
    keyPress: string;
    label: string;
    viewOnly: boolean;
};

export const DEFAULT_SHORTCUTS: { [key: string]: Shortcut } = {
    decrease_front_clip: {
        modifiers: [],
        keyPress: "2",
        label: "Decrease front clip",
        viewOnly: true,
    },
    increase_front_clip: {
        modifiers: [],
        keyPress: "1",
        label: "Increase front clip",
        viewOnly: true,
    },
    decrease_back_clip: {
        modifiers: [],
        keyPress: "3",
        label: "Decrease back clip",
        viewOnly: true,
    },
    increase_back_clip: {
        modifiers: [],
        keyPress: "4",
        label: "Increase back clip",
        viewOnly: true,
    },
    go_to_residue: {
        modifiers: ["shiftKey"],
        keyPress: "g",
        label: "Go to residue",
        viewOnly: false,
    },
    sphere_refine: {
        modifiers: ["shiftKey"],
        keyPress: "r",
        label: "Refine sphere",
        viewOnly: false,
    },
    flip_peptide: {
        modifiers: ["shiftKey"],
        keyPress: "q",
        label: "Flip peptide",
        viewOnly: false,
    },
    triple_refine: {
        modifiers: ["shiftKey"],
        keyPress: "h",
        label: "Refine triplet",
        viewOnly: false,
    },
    auto_fit_rotamer: {
        modifiers: ["shiftKey"],
        keyPress: "j",
        label: "Autofit rotamer",
        viewOnly: false,
    },
    add_terminal_residue: {
        modifiers: ["shiftKey"],
        keyPress: "y",
        label: "Add terminal residue",
        viewOnly: false,
    },
    delete_residue: {
        modifiers: ["shiftKey"],
        keyPress: "d",
        label: "Delete residue",
        viewOnly: false,
    },
    eigen_flip: {
        modifiers: ["shiftKey"],
        keyPress: "e",
        label: "Eigen flip ligand",
        viewOnly: false,
    },
    undo: {
        modifiers: ["ctrlKey"],
        keyPress: "z",
        label: "Undo last action",
        viewOnly: false,
    },
    redo: {
        modifiers: ["ctrlKey", "shiftKey"],
        keyPress: "z",
        label: "Redo previous action",
        viewOnly: false,
    },
    show_shortcuts: {
        modifiers: [],
        keyPress: "h",
        label: "Show shortcuts",
        viewOnly: true,
    },
    restore_scene: {
        modifiers: [],
        keyPress: "r",
        label: "Restore scene",
        viewOnly: true,
    },
    clear_labels: {
        modifiers: [],
        keyPress: "c",
        label: "Clear labels",
        viewOnly: true,
    },
    move_up: {
        modifiers: [],
        keyPress: "arrowup",
        label: "Move model up",
        viewOnly: true,
    },
    move_down: {
        modifiers: [],
        keyPress: "arrowdown",
        label: "Move model down",
        viewOnly: true,
    },
    move_left: {
        modifiers: [],
        keyPress: "arrowleft",
        label: "Move model left",
        viewOnly: true,
    },
    move_right: {
        modifiers: [],
        keyPress: "arrowright",
        label: "Move model right",
        viewOnly: true,
    },
    go_to_blob: {
        modifiers: [],
        keyPress: "g",
        label: "Go to blob",
        viewOnly: true,
    },
    take_screenshot: {
        modifiers: [],
        keyPress: "s",
        label: "Take a screenshot",
        viewOnly: true,
    },
    residue_camera_wiggle: {
        modifiers: [],
        keyPress: "z",
        label: "Wiggle camera while rotating a residue",
        viewOnly: true,
    },
    measure_distances: {
        modifiers: [],
        keyPress: "m",
        label: "Measure distances and angles between atoms on click",
        viewOnly: true,
    },
    measure_angles: {
        modifiers: ["shiftKey"],
        keyPress: "m",
        label: "(Not enabled currently - use above)",
        viewOnly: true,
    },
    dist_ang_2d: {
        modifiers: [],
        keyPress: "a",
        label: "Measure arbitrary distances and angles",
        viewOnly: true,
    },
    label_atom: {
        modifiers: [],
        keyPress: "l",
        label: "Label an atom on click",
        viewOnly: true,
    },
    residue_selection: {
        modifiers: ["shiftKey"],
        keyPress: "shift",
        label: "Create a residue selection",
        viewOnly: false,
    },
    center_atom: {
        modifiers: ["altKey"],
        keyPress: "alt",
        label: "Center on clicked atom",
        viewOnly: true,
    },
    set_map_contour: {
        modifiers: ["ctrlKey"],
        keyPress: "control",
        label: "Set map contour on scroll",
        viewOnly: true,
    },
    jump_next_residue: {
        modifiers: [],
        keyPress: " ",
        label: "Jump to the next residue",
        viewOnly: true,
    },
    jump_previous_residue: {
        modifiers: ["shiftKey"],
        keyPress: " ",
        label: "Jump to the previous residue",
        viewOnly: true,
    },
    increase_map_radius: {
        modifiers: [],
        keyPress: "]",
        label: "Increase map radius",
        viewOnly: true,
    },
    decrease_map_radius: {
        modifiers: [],
        keyPress: "[",
        label: "Decrease map radius",
        viewOnly: true,
    },
    show_atom_info: {
        modifiers: [],
        keyPress: "i",
        label: "Show atom info",
        viewOnly: true,
    },
};
