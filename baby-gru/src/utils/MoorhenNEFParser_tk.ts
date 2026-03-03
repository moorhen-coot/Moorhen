// parser for NEF files to extract NOE restraints 

// define NOE restraint object structure
export interface NOERestraint {
    chain1: string
    res1: number
    atom1: string
    chain2: string
    res2: number
    atom2: string
}

// read through NEF file and extract relevant information
export function parseNEF_NOEs(nefText: string): NOERestraint[] {
    const lines = nefText.split(/\r?\n/)
    const restraints: NOERestraint[] = []

    // let headers: string[] = []
    let readingLoop = false
    let inRestraintsLoop = false
    let nextLoopIsNOERestraints = false 
    const dataHeaders = []
    const dataRows = []

    for (const rawLine of lines) {
        const line = rawLine.trim()

        if (line === "loop_") {
            // headers = []
            readingLoop = true
            // continue
        }

        // if (!readingLoop) continue

        // if (line.startsWith("_")) {
        //     headers.push(line)
        //     continue
        // }z

        // if (line === "" || line.startsWith("stop_")) {
        if (line.startsWith("stop_")) {
            readingLoop = false
            inRestraintsLoop = false
            nextLoopIsNOERestraints = false 
            continue
        }

        // if (line.trim().startsWith("_nef_distance_restraint_list.restraint_origin") && line.trim().toUpperCase().endsWith("NOE"))
        if (line.includes("origin") && line.includes("noe")){
            nextLoopIsNOERestraints = true 
                if (line.includes("origin")){}
                    // console.log(line.trim())
                    // console.log(nextLoopIsNOERestraints)

            }

        if (nextLoopIsNOERestraints) {
            console.log(line)
        }

        if (readingLoop && nextLoopIsNOERestraints){
            console.log(line.trim())
            if (line.trim().startsWith("_nef_distance_restraint.")){
                inRestraintsLoop = true
                if (line !== ""){
                dataHeaders.push(line)
                    }
                }

            else if (inRestraintsLoop && line !== ""){
                dataRows.push(line)
            }
        }

        
    }
    console.log(dataRows)
    console.log(dataHeaders)
    dataRows.forEach(row => {
        
            restraints.push({

            chain1 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.chain_code_1")],
            res1 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.sequence_code_1")],
            atom1 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.atom_name_1")],
            chain2 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.chain_code_2")],
            res2 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.sequence_code_2")],
            atom2 : row.split(/\s+/)[dataHeaders.indexOf("_nef_distance_restraint.atom_name_2")]
            })
        }   
    )
    console.log(restraints)
    return restraints
}
