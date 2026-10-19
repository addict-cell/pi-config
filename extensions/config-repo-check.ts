/** Read-only GitHub check for this config repo, once per interactive Pi load.
 * Disable by removing this extension. /reload also runs a fresh check.
 * Requires gh on PATH with access to both repositories; never fetches or syncs.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);
const ENDPOINT = "repos/addict-cell/pi-config/compare/main...xiliumz:main";

function describeComparison(raw: string): { message: string; level: "info" | "warning" } {
	const { ahead_by: ahead, behind_by: behind } = JSON.parse(raw);
	if (!Number.isSafeInteger(ahead) || ahead < 0 || !Number.isSafeInteger(behind) || behind < 0) {
		throw new Error("Invalid comparison counts");
	}
	const prefix = "pi-config: xiliumz/main";
	if (ahead > 0) {
		return {
			message: `${prefix} has ${ahead} commit(s) missing from addict-cell/main${behind > 0 ? `; also ${behind} behind (diverged)` : " (ahead)"}. No sync performed.`,
			level: "warning",
		};
	}
	return {
		message: behind > 0
			? `${prefix} is ${behind} commit(s) behind addict-cell/main; not ahead.`
			: `${prefix} and addict-cell/main are in sync.`,
		level: "info",
	};
}

export default function (pi: ExtensionAPI) {
	let started = false;
	const controller = new AbortController();
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui" || started || controller.signal.aborted) return;
		started = true;
		// Do not delay startup while GitHub responds. Never inspect ctx.cwd.
		void execFileAsync("gh", ["api", "--hostname", "github.com", ENDPOINT,
			"--jq", "{ahead_by,behind_by}"], {
			timeout: 10000,
			maxBuffer: 65536,
			signal: controller.signal,
			env: { ...process.env, GH_PROMPT_DISABLED: "1" },
		}).then(({ stdout }) => {
			if (controller.signal.aborted) return;
			const { message, level } = describeComparison(stdout);
			ctx.ui.notify(message, level);
		}).catch(() => {
			if (!controller.signal.aborted) {
				ctx.ui.notify("pi-config: comparison unavailable. Check network and gh authentication/access; /reload to retry.", "warning");
			}
		});
	});
	pi.on("session_shutdown", () => controller.abort());
}
