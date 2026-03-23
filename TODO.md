# TODO

仅保留待做事项。

## P2 文档与可发现性

- 增加 layer reference、preset playbook、recipe examples 等稳定文档资源。
- 根据宿主支持情况补充 MCP resources，承载结构化说明文档。
- 评估补充 MCP prompts，沉淀推荐调用流程与最佳实践。
- 继续打磨查询类 tools 的返回字段、错误信息和提示文案，提高 AI 调用成功率。

## P2 工程与协议

- 视需要整理工程护栏文档口径，例如默认 `seed`、路径安全边界、尺寸与复杂度限制。
- 若后续有多 workspace 或宿主集成需求，扩展 `workspaceRoot` 的来源策略。
- 明确核心事实优先通过 MCP 暴露，不把关键规则只放在宿主侧 prompt 或 skill 中。

## P3 产品增强

- 评估为 `generate_texture` 增加可选返回项，例如 `includeResolvedRecipe`，在 `preset` 模式下回传编译后的 recipe。
- 评估补充更丰富的内置 preset，但继续优先选择高语义、可复用、可稳定映射到当前 DSL 的效果。
- 视需要补充更正式的 logging / tracing 方案。
- 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。

## P3 测试与演示

- 增加更多图层与组合场景的像素测试，尤其是 `blur`、`noise`、`gradientCircle`、`gradientRect` 的边界情况。
- 视需要补充 golden image / snapshot 测试，用于 renderer 回归比较。
- 为导出链路补充更多格式与质量参数测试，例如 `webp`、不同 `jpeg quality`。
- 如需对外展示，可补一个会保留产物的 demo 脚本或示例命令。
