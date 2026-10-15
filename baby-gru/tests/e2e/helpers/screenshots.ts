import { expect, test, type Locator, type Page } from "@playwright/test";
import type { CanvasScreenshotBaselineOptions, PageScreenshotBaselineOptions } from "./types";
//@ts-ignore
import { getWebGLCanvasLocator, setCanvasCaptureIsolation } from "./webglCanvas";
import * as fs from "fs";
import * as path from "path";

type ScreenshotComparisonPolicy = {
    label: string;
    threshold: number;
    maxDiffPixels?: number;
    maxDiffPixelRatio?: number;
};

/** Perceptual distance (YIQ, 0 to 1) below which two pixels count as the same colour. */
const DEFAULT_THRESHOLD = 0.2;

/** How much of the image may differ by more than that before the comparison fails. */
const DEFAULT_MAX_DIFF_PIXEL_RATIO = 0.01;

/**
 * How closely a screenshot has to match its baseline.
 *
 * This used to be exact - threshold 0, maxDiffPixels 0 - with a relaxed policy available behind an
 * environment variable "for headed runs", on the reasoning that headless would be deterministic.
 * It is not. Every one of these screenshots contains a WebGL canvas, and the GPU does not promise
 * the same pixel twice: silhouette antialiasing moves by a level or two between runs of the same
 * build on the same machine.
 *
 * Measured on two such runs: a full-window capture differed in 892 of 921,600 pixels with a maximum
 * delta of 22/255, and only two pixels above 16. A 300x300 canvas crop differed in 2,346 of 90,000,
 * of which 16 exceeded 64. The same test passed on three workers and failed on the fourth. That is
 * dithering, not a regression, and a suite that fails on it teaches people to ignore it - which is
 * how four genuinely stale baselines went unremarked for six weeks.
 *
 * The thresholds below discard that wobble and leave both comfortably inside the budget. The cost
 * is real and worth stating: a change touching under 1% of a small crop will no longer fail. Those
 * changes were already below the noise floor and could not be caught by this means anyway. What
 * screenshots can still catch is what they are good at - geometry moving, a pass not running, a
 * shader painting surfaces instead of edges - all of which run to tens of percent.
 *
 * The environment variables remain, so a run can be tightened or loosened without an edit.
 */
export function getScreenshotComparisonPolicy(): ScreenshotComparisonPolicy {
    const ratioFromEnv = Number(process.env.MOORHEN_E2E_HEADED_MAX_DIFF_PIXEL_RATIO ?? DEFAULT_MAX_DIFF_PIXEL_RATIO);
    const thresholdFromEnv = Number(process.env.MOORHEN_E2E_HEADED_THRESHOLD ?? DEFAULT_THRESHOLD);

    if (process.env.MOORHEN_E2E_STRICT_SCREENSHOTS === "1") {
        return { label: "strict", threshold: 0, maxDiffPixels: 0 };
    }

    return {
        label: "gpu-tolerant",
        threshold: Number.isFinite(thresholdFromEnv) ? thresholdFromEnv : DEFAULT_THRESHOLD,
        maxDiffPixelRatio: Number.isFinite(ratioFromEnv) ? ratioFromEnv : DEFAULT_MAX_DIFF_PIXEL_RATIO,
    };
}

export function withBrowserSpecificSuffix(snapshotName: string | string[], suffix: string): string | string[] {
    const applySuffix = (value: string): string => {
        const extMatch = value.match(/\.[^./]+$/);
        if (!extMatch) {
            return `${value}-${suffix}`;
        }

        const ext = extMatch[0];
        const stem = value.slice(0, -ext.length);
        return `${stem}-${suffix}${ext}`;
    };

    if (Array.isArray(snapshotName)) {
        if (snapshotName.length === 0) {
            return snapshotName;
        }
        const segments = [...snapshotName];
        segments[segments.length - 1] = applySuffix(segments[segments.length - 1]);
        return segments;
    }

    return applySuffix(snapshotName);
}

/**
 * Reusable strict pixel regression check for canvas output.
 * Baseline files are managed by Playwright snapshots (`--update-snapshots`).
 */
export async function assertCanvasScreenshotBaseline(host: Locator, options: CanvasScreenshotBaselineOptions): Promise<void> {
    const {
        snapshotName,
        canvasSelector = "canvas",
    } = options;

    const canvas = host.locator(canvasSelector).first();
    await expect(canvas).toBeVisible();
    const testInfo = test.info();
    const comparisonPolicy = getScreenshotComparisonPolicy();
    const maxDiffOption = comparisonPolicy.maxDiffPixelRatio !== undefined
        ? { maxDiffPixelRatio: comparisonPolicy.maxDiffPixelRatio }
        : { maxDiffPixels: comparisonPolicy.maxDiffPixels ?? 0 };
    const resolvedSnapshotName = withBrowserSpecificSuffix(snapshotName, testInfo.project.name);
    const normalizedSnapshotName = Array.isArray(resolvedSnapshotName) ? resolvedSnapshotName.join("/") : resolvedSnapshotName;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baselinePath = testInfo.snapshotPath(normalizedSnapshotName);
    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    try {
        await expect(canvas, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(resolvedSnapshotName, {
            animations: "disabled",
            caret: "hide",
            scale: "css",
            threshold: comparisonPolicy.threshold,
            ...maxDiffOption,
        });
    } catch (error) {
        await canvas.screenshot({ path: outputPath });

        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            [
                `Screenshot baseline mismatch for '${normalizedSnapshotName}'.`,
                `Project: ${testInfo.project.name}`,
                `Comparison mode: ${comparisonPolicy.label} (threshold=${comparisonPolicy.threshold}, ${comparisonPolicy.maxDiffPixelRatio !== undefined ? `maxDiffPixelRatio=${comparisonPolicy.maxDiffPixelRatio}` : `maxDiffPixels=${comparisonPolicy.maxDiffPixels ?? 0}`})`,
                `Expected baseline: ${baselinePath}`,
                `Captured current canvas: ${outputPath}`,
                "To refresh baselines:",
                "  npm run test:e2e:update-snapshots",
                "  npm run test:e2e:update-snapshots:chromium",
                "  npm run test:e2e:update-snapshots:firefox",
                "",
                "Original Playwright diff summary:",
                originalMessage,
            ].join("\n")
        );
    }
}

/**
 * Reusable strict pixel regression check for full-page/viewport UI output.
 * Baseline files are managed by Playwright snapshots (`--update-snapshots`).
 * Supports canvas-only capture with optional center-crop and snapshot subfolder organization.
 */
export async function assertPageScreenshotBaseline(page: Page, options: PageScreenshotBaselineOptions): Promise<void> {
    if (process.env.MOORHEN_E2E_DISABLE_STRICT_CANVAS_BASELINE === "1") {
        return;
    }

    const {
        snapshotName,
        fullPage = false,
        canvasOnly = false,
        canvasSelector = "canvas",
        webComponentId = "moorhen-test",
        isolateCanvas = true,
        snapshotSubfolder,
        centerCrop,
    } = options;
    const testInfo = test.info();
    const comparisonPolicy = getScreenshotComparisonPolicy();
    const maxDiffOption = comparisonPolicy.maxDiffPixelRatio !== undefined
        ? { maxDiffPixelRatio: comparisonPolicy.maxDiffPixelRatio }
        : { maxDiffPixels: comparisonPolicy.maxDiffPixels ?? 0 };
    const resolvedSnapshotName = withBrowserSpecificSuffix(snapshotName, testInfo.project.name);
    const baseName = Array.isArray(resolvedSnapshotName) ? resolvedSnapshotName.join("/") : resolvedSnapshotName;
    const screenshotPath = snapshotSubfolder
        ? (Array.isArray(resolvedSnapshotName)
            ? [snapshotSubfolder, ...resolvedSnapshotName]
            : [snapshotSubfolder, resolvedSnapshotName])
        : resolvedSnapshotName;
    const normalizedSnapshotName = Array.isArray(screenshotPath) ? screenshotPath.join("/") : screenshotPath;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const screenshotPathValue = Array.isArray(screenshotPath) ? screenshotPath.join("/") : screenshotPath;
    const parsedScreenshotExt = path.extname(screenshotPathValue);
    const screenshotExt = parsedScreenshotExt || ".png";
    const screenshotArg = parsedScreenshotExt
        ? screenshotPathValue.slice(0, -parsedScreenshotExt.length)
        : screenshotPathValue;
    const testFileBaseName = path.basename(testInfo.file).replace(path.extname(testInfo.file), "");
    const baselinePath = path.join(path.dirname(testInfo.file), "snapshots", `${testFileBaseName}-${screenshotArg}${screenshotExt}`);

    if (snapshotSubfolder && !fs.existsSync(baselinePath)) {
        // Backward compatibility: migrate existing subfolder baselines from the legacy shared path.
        const snapshotDirParent = path.dirname(testInfo.snapshotDir);
        const legacyBaselinePath = path.join(snapshotDirParent, "snapshots", snapshotSubfolder, baseName);
        if (fs.existsSync(legacyBaselinePath)) {
            fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
            fs.copyFileSync(legacyBaselinePath, baselinePath);
        }
    }

    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    const screenshotOptions = {
        animations: "disabled" as const,
        caret: "hide" as const,
        scale: "css" as const,
        threshold: comparisonPolicy.threshold,
        ...maxDiffOption,
    };

    const targetCanvas = canvasOnly
        ? (canvasSelector === "canvas" ? await getWebGLCanvasLocator(page, webComponentId) : page.locator(canvasSelector).first())
        : null;

    const shouldUseCenterCrop = Boolean(targetCanvas && centerCrop && canvasOnly);
    const shouldIsolateCanvas = Boolean(targetCanvas && isolateCanvas && canvasSelector === "canvas");

    try {
        if (shouldIsolateCanvas) {
            await setCanvasCaptureIsolation(page, webComponentId, true);
        }

        if (shouldUseCenterCrop && targetCanvas && centerCrop) {
            const canvasBox = await targetCanvas.boundingBox();
            if (!canvasBox) {
                throw new Error(`Canvas bounding box could not be determined for center crop`);
            }

            const centerX = canvasBox.x + canvasBox.width / 2;
            const centerY = canvasBox.y + canvasBox.height / 2;
            const cropX = Math.max(0, centerX - centerCrop.width / 2);
            const cropY = Math.max(0, centerY - centerCrop.height / 2);
            await expect(page, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(screenshotPath, {
                ...screenshotOptions,
                clip: {
                    x: cropX,
                    y: cropY,
                    width: centerCrop.width,
                    height: centerCrop.height,
                },
            });
        } else if (targetCanvas) {
            await expect(targetCanvas).toBeVisible();
            await expect(
                targetCanvas,
                `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`
            ).toHaveScreenshot(screenshotPath, screenshotOptions);
        } else {
            await expect(page, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(screenshotPath, {
                ...screenshotOptions,
                fullPage,
            });
        }
    } catch (error) {
        if (shouldUseCenterCrop && targetCanvas && centerCrop) {
            const canvasBox = await targetCanvas.boundingBox();
            if (canvasBox) {
                const centerX = canvasBox.x + canvasBox.width / 2;
                const centerY = canvasBox.y + canvasBox.height / 2;
                const cropX = Math.max(0, centerX - centerCrop.width / 2);
                const cropY = Math.max(0, centerY - centerCrop.height / 2);
                await page.screenshot({
                    path: outputPath,
                    clip: { x: cropX, y: cropY, width: centerCrop.width, height: centerCrop.height },
                });
            }
        } else if (targetCanvas) {
            await targetCanvas.screenshot({ path: outputPath });
        } else {
            await page.screenshot({ path: outputPath, fullPage });
        }

        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            [
                `Screenshot baseline mismatch for '${normalizedSnapshotName}'.`,
                `Project: ${testInfo.project.name}`,
                `Page URL: ${page.url()}`,
                `Capture target: ${targetCanvas ? `canvas (${canvasSelector === "canvas" ? `webgl:${webComponentId}` : canvasSelector})` : `page (fullPage=${fullPage})`}`,
                `Comparison mode: ${comparisonPolicy.label} (threshold=${comparisonPolicy.threshold}, ${comparisonPolicy.maxDiffPixelRatio !== undefined ? `maxDiffPixelRatio=${comparisonPolicy.maxDiffPixelRatio}` : `maxDiffPixels=${comparisonPolicy.maxDiffPixels ?? 0}`})`,
                `Expected baseline: ${baselinePath}`,
                `Captured current screenshot: ${outputPath}`,
                "To refresh baselines:",
                "  npm run test:e2e:update-snapshots",
                "  npm run test:e2e:update-snapshots:chromium",
                "  npm run test:e2e:update-snapshots:firefox",
                "",
                "Original Playwright diff summary:",
                originalMessage,
            ].join("\n")
        );
    } finally {
        if (shouldIsolateCanvas) {
            await setCanvasCaptureIsolation(page, webComponentId, false);
        }
    }
}
