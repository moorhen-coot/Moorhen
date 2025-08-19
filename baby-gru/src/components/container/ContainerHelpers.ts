import { RefObject } from "react"
import type { moorhen }from "../../types/moorhen"

export const cootAPIHelpers = {
    setMakeBackups: async (commandCentre: RefObject<moorhen.CommandCentre>, makeBackups: boolean) => {
        if (!commandCentre?.current) return
        await commandCentre.current.cootCommand({
            command: "set_make_backups",
            commandArgs: [makeBackups],
            returnType: "status",
        }, false)
    },

    setSamplingRate: async (commandCentre: RefObject<moorhen.CommandCentre>, rate: number) => {
        if (!commandCentre?.current) return
        await commandCentre.current.cootCommand({
            command: "set_map_sampling_rate",
            commandArgs: [rate],
            returnType: "status",
        }, false)
    },

    setDrawMissingLoops: async (commandCentre: RefObject<moorhen.CommandCentre>, drawMissingLoops: boolean) => {
        if (!commandCentre?.current) return
        await commandCentre.current.cootCommand({
            command: "set_draw_missing_residue_loops",
            commandArgs: [drawMissingLoops],
            returnType: "status",
        }, false)
    }
}