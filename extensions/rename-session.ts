import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function renameSessionExtension(pi: ExtensionAPI): void {
	pi.registerTool(defineTool({
		name: "rename_session",
		label: "Rename session",
		description: "Rename the current Pi session using a concise, descriptive title. Only use when the user asks to name or rename the session.",
		promptSnippet: "Rename the active Pi session",
		promptGuidelines: [
			"When asked to name or rename the current session, use rename_session rather than editing session files.",
		],
		parameters: Type.Object({
			name: Type.String({
				description: "A concise session title (1–120 characters).",
				minLength: 1,
				maxLength: 120,
			}),
		}),
		executionMode: "sequential",
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},

		async execute(_toolCallId, params, signal) {
			signal?.throwIfAborted();
			const name = params.name.replace(/\s+/gu, " ").trim();
			if (!name || Array.from(name).length > 120) {
				throw new Error("Session title must contain 1–120 characters after trimming.");
			}
			if (/[\u0000-\u001f\u007f-\u009f]/u.test(name)) {
				throw new Error("Session title must not contain control characters.");
			}

			const previousName = pi.getSessionName();
			if (previousName !== name) pi.setSessionName(name);
			return {
				content: [{ type: "text", text: `Session named: ${name}` }],
				details: { name, previousName },
			};
		},
	}));
}
