import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { compileFunction } from "node:vm";

const source = stripTypeScriptTypes(
	readFileSync(new URL("../extensions/config-repo-check.ts", import.meta.url), "utf8"),
).replace(/^import .*;\r?\n/gm, "")
	.replace("const execFileAsync = promisify(execFile);", "")
	.replace(/export default function\s*\(/, "function register(");
const load = compileFunction(`${source}; return { describeComparison, register };`, ["execFileAsync"]);
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function setup(execute = async () => ({ stdout: '{"ahead_by":2,"behind_by":0}' })) {
	const calls: any[][] = [];
	const notices: any[][] = [];
	const handlers: Record<string, Function> = {};
	const api = load(async (...args: any[]) => { calls.push(args); return execute(); });
	api.register({ on: (event: string, handler: Function) => { handlers[event] = handler; } });
	const ctx = { mode: "tui", cwd: "/unrelated/project", ui: {
		notify: (...args: any[]) => notices.push(args),
	} };
	return { ...api, calls, notices, handlers, ctx };
}

test("reports ahead, behind, identical and diverged in the correct direction", () => {
	const s = setup();
	for (const [ahead_by, behind_by, text, level] of [
		[2, 0, /2 commit\(s\) missing.*\(ahead\)/, "warning"],
		[0, 3, /3 commit\(s\) behind.*not ahead/, "info"],
		[0, 0, /in sync/, "info"],
		[4, 2, /4 commit\(s\) missing.*2 behind \(diverged\)/, "warning"],
	] as const) {
		const result = s.describeComparison(JSON.stringify({ ahead_by, behind_by }));
		assert.match(result.message, text);
		assert.equal(result.level, level);
	}
});

test("rejects malformed or missing counts", () => {
	const s = setup();
	for (const raw of ["not json", "null", "{}", '{"ahead_by":-1,"behind_by":0}',
		'{"ahead_by":"1","behind_by":0}', '{"ahead_by":0.5,"behind_by":0}']) {
		assert.throws(() => s.describeComparison(raw));
	}
});

test("nonblocking startup checks only fixed config repo once, irrespective of cwd", async () => {
	const s = setup();
	assert.equal(s.handlers.session_start({}, s.ctx), undefined);
	s.handlers.session_start({}, s.ctx);
	await flush();
	assert.equal(s.calls.length, 1);
	const [command, args, options] = s.calls[0];
	assert.equal(command, "gh");
	assert.deepEqual(args, ["api", "--hostname", "github.com",
		"repos/addict-cell/pi-config/compare/main...xiliumz:main", "--jq", "{ahead_by,behind_by}"]);
	assert.equal(options.timeout, 10000);
	assert.equal(options.env.GH_PROMPT_DISABLED, "1");
	assert.equal(s.notices.length, 1);
});

test("skips print, JSON and RPC modes", async () => {
	const s = setup();
	for (const mode of ["print", "json", "rpc"]) s.handlers.session_start({}, { ...s.ctx, mode });
	await flush();
	assert.equal(s.calls.length, 0);
});

test("network, authentication, timeout and malformed responses report unavailable", async () => {
	for (const execute of [async () => { throw new Error("sensitive backend detail"); },
		async () => ({ stdout: "{}" })]) {
		const s = setup(execute);
		s.handlers.session_start({}, s.ctx);
		await flush();
		assert.equal(s.notices.length, 1);
		assert.match(s.notices[0][0], /comparison unavailable/);
		assert.doesNotMatch(s.notices[0][0], /sensitive/);
	}
});

test("shutdown aborts pending request and suppresses stale notifications", async () => {
	let finish!: (value: { stdout: string }) => void;
	const s = setup(() => new Promise(resolve => { finish = resolve; }));
	s.handlers.session_start({}, s.ctx);
	s.handlers.session_shutdown();
	assert.equal(s.calls[0][2].signal.aborted, true);
	finish({ stdout: '{"ahead_by":1,"behind_by":0}' });
	await flush();
	assert.equal(s.notices.length, 0);
});
