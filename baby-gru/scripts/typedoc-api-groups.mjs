// @ts-check
/*
 * TypeDoc plugin for the API reference (typedoc.json): the members of an API group.
 *
 * MoorhenInstance's API groups (instance.files, instance.representation...) are getters returning an
 * object literal. TypeDoc lists the members of such an object in alphabetical order, and gives them
 * no anchor (only members of exported types get one), so files.batchLoadLigands came before
 * files.loadFiles and neither could be linked to. With this plugin they are:
 * - listed in source order, the order they are written in (the main call first);
 * - given an anchor each, "<group>-<member>" in lower case: MoorhenInstance.html#files-loadfiles,
 *   with the permalink icon the other members have (shown on hover, to copy the link from).
 */
import { Converter, KindRouter, ReflectionKind, Renderer } from "typedoc";

/** The object literal a getter returns: an API group's members are its children */
const isApiGroup = reflection => reflection.kindOf(ReflectionKind.TypeLiteral) && !!reflection.parent?.kindOf(ReflectionKind.GetSignature);

const sourceLine = reflection => reflection.sources?.[0]?.line ?? 0;
const bySource = (a, b) => sourceLine(a) - sourceLine(b);

/** The anchors given to the members of API groups, by the page (its reflection) they are on */
const memberAnchors = new Map();

/** The default router ("kind"), with anchors for the members of API groups */
class ApiGroupRouter extends KindRouter {
    /**
     * @param {import("typedoc").RouterTarget} target
     * @param {import("typedoc").RouterTarget} pageTarget
     */
    buildAnchors(target, pageTarget) {
        if ("kindOf" in target && isApiGroup(target)) {
            const group = target.parent.name;
            for (const member of target.children ?? []) {
                const anchor = this.getSlugger(pageTarget).slug(`${group}-${member.name}`);
                this.fullUrls.set(member, `${this.fullUrls.get(pageTarget)}#${anchor}`);
                this.anchors.set(member, anchor);
                if (!memberAnchors.has(pageTarget)) memberAnchors.set(pageTarget, new Set());
                memberAnchors.get(pageTarget).add(anchor);
            }
            return;
        }
        super.buildAnchors(target, pageTarget);
    }
}

/** @param {import("typedoc").Application} app */
export function load(app) {
    app.renderer.defineRouter("moorhen-api-groups", ApiGroupRouter);
    // After TypeDoc has sorted every member list (its GroupPlugin, priority -100)
    app.converter.on(
        Converter.EVENT_RESOLVE_END,
        context => {
            for (const reflection of context.project.getReflectionsByKind(ReflectionKind.TypeLiteral)) {
                if (!isApiGroup(reflection)) continue;
                reflection.children?.sort(bySource);
                reflection.groups?.forEach(group => group.children.sort(bySource));
            }
        },
        -200
    );
    // The theme gives a member of an object type its id, but no permalink icon: added to those of the
    // API groups, as the page's other icons are written (their path to the icon sheet depends on the page)
    app.renderer.on(Renderer.EVENT_END_PAGE, page => {
        const anchors = memberAnchors.get(page.model);
        if (!anchors || !page.contents) return;
        const icon = /<a href="#[^"]*" aria-label="([^"]*)" class="tsd-anchor-icon">(<svg.*?<\/svg>)<\/a>/s.exec(page.contents);
        if (!icon) return;
        page.contents = page.contents.replace(/<h5 id="([^"]+)">(.*?)<\/h5>/gs, (heading, id, content) =>
            anchors.has(id)
                ? `<h5 class="tsd-anchor-link" id="${id}">${content}<a href="#${id}" aria-label="${icon[1]}" class="tsd-anchor-icon">${icon[2]}</a></h5>`
                : heading
        );
    });
}
