import type { WorkerResponse, cootCommandKwargs } from "./MoorhenCommandCentre";

/**
 * Thrown when a coot command fails: coot raised an exception in the worker, or the
 * worker could not reply at all (it failed to start, or its reply was unreadable).
 *
 * This is the single error type for failed coot commands, so callers can tell them
 * apart from other errors with `err instanceof CootCommandError`.
 */
export class CootCommandError extends Error {
    /** The coot command (or worker message type) that failed. */
    readonly command: string;
    /** The worker's console message for the failure, if there was one. */
    readonly consoleMessage?: string;

    constructor(command: string, consoleMessage?: string) {
        super(`Coot command ${command} failed${consoleMessage ? `: ${consoleMessage}` : ""}`);
        this.name = "CootCommandError";
        this.command = command;
        this.consoleMessage = consoleMessage;
    }
}

/**
 * Rejects a queued command that a newer command with the same squash key replaced before it was sent
 * (see WorkerWrapper). Not a failure: callers that squash expect it and ignore it.
 */
export class CommandSquashedError extends CootCommandError {
    /** The squash key shared by the command and the one that replaced it. */
    readonly squashKey: string;

    constructor(command: string, squashKey: string) {
        super(command);
        this.message = `Coot command ${command} was replaced by a newer one (${squashKey}) before it was sent`;
        this.name = "CommandSquashedError";
        this.squashKey = squashKey;
    }
}

/** The name to report for a command: the coot command, or else the worker message type. */
export const commandName = (kwargs: cootCommandKwargs): string => kwargs?.command ?? kwargs?.message ?? "unknown";

/**
 * Throw a {@link CootCommandError} if the worker replied with an Exception status.
 *
 * The worker always replies, and reports a failure as `result.status === "Exception"`
 * rather than rejecting, so callers that need to know about failures use this.
 */
export const throwIfCootFailed = (reply: WorkerResponse, kwargs: cootCommandKwargs): void => {
    if (reply?.data?.result?.status === "Exception") {
        throw new CootCommandError(commandName(kwargs), reply.data.consoleMessage);
    }
};
