import { useSelector } from "react-redux";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import type { WorkerQueueEntry } from "@/InstanceManager/CommandCentre/WorkerWrapper";
import { RootState } from "../../store/MoorhenReduxStore";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenStack } from "../interface-base";

/** Refresh rate of the "for" times while the modal is open */
const TICK_MS = 250;

const formatMs = (ms: number | null): string => (ms === null ? "-" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

const cellStyle = { padding: "0.1rem 0.5rem", textAlign: "left" as const, whiteSpace: "nowrap" as const };

const EntryRow = (props: { entry: WorkerQueueEntry; since: number; now: number; label: string }) => (
    <tr>
        <td style={cellStyle}>{props.label}</td>
        <td style={cellStyle}>{props.entry.command}</td>
        <td style={cellStyle}>{props.entry.squashKey ?? ""}</td>
        <td style={cellStyle}>{formatMs(props.now - props.since)}</td>
    </tr>
);

/**
 * Dev tool: the worker command queue (`instance.workerCommand`, see WorkerWrapper): the command running, the commands
 * waiting with their squash keys, and counts. Read from the wrapper, not the redux store.
 */
export const WorkerQueueModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);
    const width = useSelector((state: RootState) => state.sceneSettings.width);
    const height = useSelector((state: RootState) => state.sceneSettings.height);

    const worker = useMoorhenInstance().workerCommand;
    const status = useSyncExternalStore(worker.subscribe, worker.getStatus);

    const [now, setNow] = useState(() => performance.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(performance.now()), TICK_MS);
        return () => clearInterval(interval);
    }, []);

    const body = (
        <MoorhenStack direction="vertical" gap="0.5rem">
            <div>
                Completed {status.completed} · squashed {status.squashed} · failed {status.failed} · last command took{" "}
                {formatMs(status.lastDurationMs)}
            </div>
            <table>
                <thead>
                    <tr>
                        <th style={cellStyle}></th>
                        <th style={cellStyle}>Command</th>
                        <th style={cellStyle}>Squash key</th>
                        <th style={cellStyle}>For</th>
                    </tr>
                </thead>
                <tbody>
                    {status.running ? (
                        <EntryRow entry={status.running} since={status.running.sentAt} now={now} label="running" />
                    ) : (
                        <tr>
                            <td style={cellStyle}>idle</td>
                        </tr>
                    )}
                    {status.waiting.map((entry, index) => (
                        <EntryRow key={index} entry={entry} since={entry.queuedAt} now={now} label={`${index + 1}`} />
                    ))}
                </tbody>
            </table>
            <div style={{ opacity: 0.7 }}>Only commands sent through the worker wrapper; direct commandCentre calls are not queued.</div>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.WORKER_QUEUE}
            left={width / 6}
            top={height / 4}
            minHeight={convertViewtoPx(20, height)}
            minWidth={convertRemToPx(30)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(60, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Worker command queue"
            resizeNodeRef={resizeNodeRef}
            body={body}
        />
    );
};
