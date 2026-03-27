# TODO

使用 `[x]` / `[ ]` 标记完成状态。

## 当前建议优先做

- [ ] 收紧颜色字段校验与标准化，不再只停留在“非空字符串”层面；至少覆盖 draw layer 的 `color` / `colors` 输入与可读错误信息。
- [ ] 补齐颜色非法值、`noise` alpha 语义、`text` 宿主字体差异等行为测试，优先对齐 `validate_recipe`、renderer 与 README 的口径。
- [ ] 结合一次真实宿主联调，确认 runtime MCP resources / prompts 的可发现性与实际收益，再决定是否继续扩 prompts 面积。

## P2 文档与可发现性

- [x] 增加 layer reference、preset playbook、recipe examples 等稳定文档资源。
- [x] 根据宿主支持情况补充 MCP resources，承载结构化说明文档。
- [x] 评估补充 MCP prompts，沉淀推荐调用流程与最佳实践。
- [x] 为 README 或独立文档补齐工程护栏口径，例如默认 `seed`、路径安全边界、尺寸与复杂度限制。

## P2 工程与协议

- [x] 暴露当前 `workspaceRoot`、来源与导出约束的查询能力，降低宿主联调时的不透明性。
- [ ] 若后续有多 workspace 或宿主集成需求，扩展 `workspaceRoot` 的来源策略，例如多根目录或宿主显式注入。
- [x] 明确核心事实优先通过 MCP 暴露，不把关键规则只放在宿主侧 prompt 或 skill 中。
- [x] 收紧 `generate_texture` 的输入契约：不同 `mode` 下拒绝无关字段，避免“错误输入但被静默忽略”。
- [x] 统一 `get_preset_schema` 的参数语义与运行时行为，区分“schema required”与“调用方实际必须显式传入”的字段。
- [x] 校准 MCP server 对外暴露的版本号与 npm 包版本，减少宿主联调时的诊断歧义。

## P3 产品增强

- [x] 为 `rect`、`gradientRect`、`text` 增加最小版 `rotation` 能力，统一按各自包围盒中心旋转，不扩展为完整 transform 系统。
- [ ] 评估为 `generate_texture` 增加可选返回项，例如 `includeResolvedRecipe`，仅在显式请求时于 `preset` 模式下回传编译后的 recipe；默认不要回传整份 recipe。
- [ ] 如后续发现“只获取 preset 编译结果、不需要渲染”的需求稳定存在，评估是否拆分独立的 compile / resolve 类能力，而不是持续加重 `generate_texture`。
- [ ] 评估补充更丰富的内置 preset，但继续优先选择高语义、可复用、可稳定映射到当前 DSL 的效果。
- [ ] 补充一批更贴近 VFX / 粒子工作流的高语义 preset，例如 `spark`、`burst`、`shockwave`、`slash`、`trail`。
- [ ] 评估导出或生成阶段的单通道 / mask / alpha 控制能力，支持更典型的粒子贴图工作流。
- [ ] 评估多 seed 批量变体生成能力，便于快速出 demo 与粒子资源探索。
- [ ] 评估 flipbook / atlas / strip 形式的输出能力，支撑粒子编辑器附属功能的中期演进。
- [ ] 视需要补充更正式的 logging / tracing 方案。
- [ ] 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。

## P3 测试与演示

- [ ] 增加更多图层与组合场景的像素测试，尤其是 `blur`、`noise`、`gradientCircle`、`gradientRect` 的边界情况。
- [ ] 补充颜色参数非法值、宿主差异风险字段、`noise` alpha 语义等行为测试，提升 `validate_recipe` 与 renderer 的一致性。
- [ ] 视需要补充 golden image / snapshot 测试，用于 renderer 回归比较。
- [x] 补一个批量导出 preset gallery / 参数 sweep / seed variations 的演示脚本，服务快速 demo 与回归观察。
- [x] 在 demo gallery 中补充 `rotation` 相关示意图，便于快速确认图元旋转不是字段摆设。
