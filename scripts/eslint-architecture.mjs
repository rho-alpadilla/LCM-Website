import path from "node:path";

// Resolve relative imports too, so moving a file cannot bypass the boundaries.
export const architectureRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { boundary: "{{reason}}" },
  },
  create(context) {
    const filename = path.resolve(context.filename).replaceAll("\\", "/");
    const source = filename.split("/src/")[1];
    if (!source) return {};
    const layer = source.split("/")[0];
    const isClient = context.sourceCode.ast.body.some(
      (node) =>
        node.type === "ExpressionStatement" && node.directive === "use client",
    );

    function check(node, value) {
      if (typeof value !== "string") return;
      let target = value.startsWith("@/") ? value.slice(2) : null;
      if (value.startsWith(".")) {
        target = path.posix.normalize(
          path.posix.join(path.posix.dirname(source), value),
        );
      }
      let reason;
      if (
        layer === "shared" &&
        ((target && !target.startsWith("shared/")) ||
          /^(server-only|next(?:\/|$)|node:|cloudflare:)/.test(value))
      ) {
        reason =
          "Shared modules must remain runtime-neutral and depend only on shared source modules.";
      } else if (
        layer === "backend" &&
        target &&
        !/^(backend|shared)\//.test(target)
      ) {
        reason =
          "Backend modules may depend on backend and shared modules, not UI or routing code.";
      } else if (layer === "frontend" && target) {
        if (target.startsWith("app/")) {
          reason = "Frontend modules must not depend on routing entry points.";
        } else if (target.startsWith("backend/")) {
          const isAction = target.startsWith("backend/actions/");
          const isServerScreen =
            source.startsWith("frontend/screens/") && !isClient;
          const isScreenEntry =
            target.startsWith("backend/queries/") ||
            target === "backend/auth/staff-context";
          if (!isAction && !(isServerScreen && isScreenEntry)) {
            reason =
              "UI may use server actions; only server screens may load backend queries or staff context. Keep services, repositories, and secrets in the backend.";
          }
        }
      }
      if (reason)
        context.report({ node, messageId: "boundary", data: { reason } });
    }
    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) =>
        node.source && check(node, node.source.value),
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => check(node, node.source.value),
      CallExpression: (node) => {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require"
        ) {
          check(node, node.arguments[0]?.value);
        }
      },
    };
  },
};
