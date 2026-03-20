# TODO

MVP 主线已完成。下面保留的是后续增强项，而不是当前阻塞项。

## 工程与协议

- 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。
- 视需要补充更正式的 logging / tracing 方案，而不只是当前的 stderr 调试日志。
- 若后续有多 workspace 或宿主集成需求，继续扩展 `workspaceRoot` 的来源策略。

## 测试与质量

- 增加更多图层与组合场景的像素测试，尤其是 `blur`、`noise`、`group` 的边界情况。
- 视需要补充 golden image / snapshot 测试，用于回归比较。
- 为导出链路补充更多格式与质量参数测试，例如 `webp`、不同 `jpeg quality`。

## 文档与演示

- 在 `README.md` 中补充更完整的使用示例，包括一次完整的 generate/export 流程。
- 如果需要对外展示，可补一个可保留产物的 demo 脚本或示例命令。
- 根据后续使用方式，决定是否补充 MCP 客户端接入示例与常见问题。
