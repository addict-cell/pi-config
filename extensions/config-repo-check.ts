/** Read-only GitHub check for this config repo, once per interactive Pi load.
 * Disable by removing this extension. /reload also runs a fresh check.
 * Only notify when addict-cell/main is behind or diverged; otherwise stay silent.
 * Requires gh on PATH with access to both repositories; never fetches or syncs.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);
// GitHub counts the head (addict-cell) relative to the base (xiliumz).
const ENDPOINT = "repos/xiliumz/pi-config/compare/main...addict-cell:main";

function describeComparison(raw: string): { message: string; level: "warning" } | undefined {
	const { ahead_by: ahead, behind_by: behind } = JSON.parse(raw);
	if (!Number.isSafeInteger(ahead) || ahead < 0 || !Number.isSafeInteger(behind) || behind < 0) {
		throw new Error("Invalid comparison counts");
	}
	if (behind === 0) return undefined;
	const prefix = "pi-config: addict-cell/main";
	if (ahead > 0) {
		return {
			message: `${prefix} has ${ahead} commit(s) missing from xiliumz/main; also ${behind} behind (diverged). No sync performed.`,
			level: "warning",
		};
	}
	return {
		message: `${prefix} is ${behind} commit(s) behind xiliumz/main. No sync performed.`,
		level: "warning",
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
			const result = describeComparison(stdout);
			if (result) ctx.ui.notify(result.message, result.level);
		}).catch(() => { /* Stay silent unless behind or diverged is confirmed. */ });
	});
	pi.on("session_shutdown", () => controller.abort());
}
