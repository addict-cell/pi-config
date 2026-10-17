import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { compileFunction } from "node:vm";

// Run the real extension with isolated OS/terminal mocks, without sending notifications.
const source = stripTypeScriptTypes(
	readFileSync(new URL("../extensions/notify-done.ts", import.meta.url), "utf8"),
)
	.replace(/^import .*;\r?\n/gm, "")
	.replace("const execFileAsync = promisify(execFile);", "")
	.replace(/export default function\s*\(/, "function register(");
const load = compileFunction(`${source}; return { notifyDesktop, register };`, ["process", "execFileAsync", "Date"]);

function setup(env: Record<string, string>, passthrough = "on", isTTY = true, execute?: () => Promise<void>) {
	const writes: string[] = [];
	const commands: string[] = [];
	let now = 0;
	const api = load({
		platform: "linux", env,
		stdout: { isTTY, write: (text: string) => writes.push(text) },
	}, async (command: string) => {
		commands.push(command);
		await execute?.();
		return { stdout: passthrough };
	}, { now: () => now });
	return { ...api, writes, commands, advance: (ms: number) => { now += ms; } };
}

function handlers(s: ReturnType<typeof setup>): Record<string, Function> {
	const registered: Record<string, Function> = {};
	s.register({ on: (name: string, handler: Function) => { registered[name] = handler; } });
	return registered;
}

// Drain the mocked async notification pipeline; no real desktop calls or timer delays.
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const kitty = { KITTY_WINDOW_ID: "1", TMUX: "/tmp/tmux", TMUX_PANE: "%6" };
const raw = "\x1b]99;i=pi-done:d=0;Pi\x1b\\\x1b]99;i=pi-done:p=body:d=1;Done\x1b\\";

test("Kitty OSC 99 escapes every ESC inside tmux passthrough; no notify-send", async () => {
	for (const option of ["on", "all"]) {
		const s = setup(kitty, option);
		assert.equal(await s.notifyDesktop("Pi", "Done"), true);
		assert.deepEqual(s.commands, ["tmux"]);
		assert.deepEqual(s.writes, [`\x1bPtmux;${raw.replace(/\x1b/g, "\x1b\x1b")}\x1b\\`]);
	}
});

test("direct Kitty keeps raw OSC; terminal control characters are removed", async () => {
	const s = setup({ KITTY_WINDOW_ID: "1" });
	await s.notifyDesktop("Pi\x1b", "Done\x07");
	assert.deepEqual(s.commands, []);
	assert.deepEqual(s.writes, [raw]);
});

test("disabled tmux passthrough falls through to notify-send", async () => {
	const s = setup(kitty, "off");
	assert.equal(await s.notifyDesktop("Pi", "Done"), true);
	assert.deepEqual(s.commands, ["tmux", "notify-send"]);
	assert.deepEqual(s.writes, []);
});

test("unknown terminals and non-TTY output reach notify-send", async () => {
	for (const s of [setup({ TERM: "xterm-256color" }), setup(kitty, "on", false)]) {
		await s.notifyDesktop("Pi", "Done");
		assert.deepEqual(s.commands, ["notify-send"]);
		assert.deepEqual(s.writes, []);
	}
});

test("recognized OSC 777 terminal stays ahead of notify-send", async () => {
	const s = setup({ TERM_PROGRAM: "ghostty" });
	await s.notifyDesktop("Pi", "Done; ready");
	assert.deepEqual(s.commands, []);
	assert.deepEqual(s.writes, ["\x1b]777;notify;Pi;Done, ready\x07"]);
});

test("UI prompts notify immediately without an agent run and do not expose prompt contents", async () => {
	for (const kind of ["input", "select", "confirm", "editor", "custom"]) {
		const s = setup({ KITTY_WINDOW_ID: "1" });
		const h = handlers(s);
		await h.ui_prompt_start({ kind, title: "private question text" }, { mode: "tui" });
		await flush();
		assert.equal(s.writes.length, 1);
		assert.match(s.writes[0], /Waiting for your input/);
		assert.ok(!s.writes[0].includes("private question text"));
	}
});

test("UI prompt notification does not suppress or replace the later completion notification", async () => {
	const s = setup({ KITTY_WINDOW_ID: "1" });
	const h = handlers(s);
	await h.agent_start();
	await h.agent_end({ messages: [{ role: "assistant", content: "Finished the task" }] });
	await h.ui_prompt_start({ kind: "input" }, { mode: "tui" });
	await flush();
	assert.equal(s.writes.length, 1, "prompts bypass the completion quiet period");
	s.advance(4000);
	await h.agent_settled({}, { mode: "tui" });
	await h.agent_settled({}, { mode: "tui" });
	assert.equal(s.writes.length, 2);
	assert.match(s.writes[1], /Finished the task/);
});

test("completion quiet period does not suppress a later command-driven UI prompt", async () => {
	const s = setup({ KITTY_WINDOW_ID: "1" });
	const h = handlers(s);
	await h.agent_start();
	await h.agent_settled({}, { mode: "tui" });
	assert.equal(s.writes.length, 0);
	await h.ui_prompt_start({ kind: "custom" }, { mode: "tui" });
	await flush();
	assert.equal(s.writes.length, 1);
});

test("UI prompt notifications never run in RPC, JSON, or print mode", async () => {
	const s = setup(kitty);
	const h = handlers(s);
	for (const mode of ["rpc", "json", "print"]) {
		await h.ui_prompt_start({ kind: "input" }, { mode });
	}
	await flush();
	assert.deepEqual(s.commands, []);
	assert.deepEqual(s.writes, []);
});

test("a slow notification backend cannot block opening a UI prompt", async () => {
	let finish: () => void = () => {};
	const pending = new Promise<void>(resolve => { finish = resolve; });
	const s = setup({}, "on", true, () => pending);
	const result = handlers(s).ui_prompt_start({ kind: "input" }, { mode: "tui" });
	assert.equal(result, undefined);
	assert.deepEqual(s.commands, ["notify-send"]);
	finish();
	await flush();
	assert.deepEqual(s.writes, []);
});

test("RPC mode never writes terminal notifications", async () => {
	const s = setup(kitty);
	const handlers: Record<string, Function> = {};
	s.register({ on: (name: string, handler: Function) => { handlers[name] = handler; } });
	await handlers.agent_settled({}, { mode: "rpc" });
	assert.deepEqual(s.commands, []);
	assert.deepEqual(s.writes, []);
});
