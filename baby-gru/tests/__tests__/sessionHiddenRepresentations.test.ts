/**
 * Hidden representations in sessions: the session's scenes keep them (with their visibility), and loading
 * shows the selected scene. Loading used to build what is shown from the session's own representation
 * list, which has shown ones only, so a hidden one (a hidden ligand's, its pocket) came back as nothing.
 */
import { addCustomRepresentation } from "@/store/moleculesSlice";
import { moorhensession } from "@/protobuf/MoorhenSession";
import { MoleculeRepresentation } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { createCloudInstance, jobUrl, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(180000);

let first: CloudInstance;
let second: CloudInstance;

beforeAll(loadCootModules);

afterEach(async () => {
    await first?.cleanup();
    await second?.cleanup();
});

const shown = (cloud: CloudInstance) =>
    Object.fromEntries(cloud.instance.getMoleculeList()[0].representations.map(rep => [rep.cid, rep.visible]));

test("a hidden representation comes back hidden, through a .pb session file", async () => {
    first = await createCloudInstance();
    await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "5a3h.pdb" }, "cloud");
    const molecule = first.instance.getMoleculeList()[0];
    const hidden = await MoleculeRepresentation.create({ representationStyle: "CBs", molecule, ruleType: "cid", cid: "//A/35-40", isCustom: true });
    first.store.dispatch(addCustomRepresentation(hidden));
    hidden.hide();
    expect(shown(first)["//A/35-40"]).toBe(false);

    // Saved as a session file is: protobuf
    const session = await first.instance.getTimeCapsuleRef().current.fetchSession(false);
    const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
    second = await createCloudInstance();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    expect(await MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, second.instance)).toBe(0);

    // The shown ones shown, the hidden one there and hidden
    expect(shown(second)).toEqual(shown(first));
    const restored = second.instance.getMoleculeList()[0].representations.find(rep => rep.cid === "//A/35-40");
    expect(restored.interfaceOption.visible).toBe(true);
});
