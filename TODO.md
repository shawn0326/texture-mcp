# TODO

仅保留后续打算做的事情。

## 协议与接口

- [ ] 评估降低 `generate_texture -> export_texture` 对单一“当前结果”会话态的依赖，例如引入显式结果句柄或更稳定的结果引用方式，避免多次生成时互相覆盖。
- [ ] 若后续有多 workspace 或宿主集成需求，扩展 `workspaceRoot` 的来源策略，例如多根目录或宿主显式注入。
- [ ] 在已提供 `resolve_preset` 之后，视真实调用情况再评估是否还有必要为 `generate_texture` 增加 `includeResolvedRecipe` 一类可选回包。
- [ ] 评估是否提供更轻量的生成结果检查或引用信息，让 AI 在生成后不必立刻落盘也能继续比较、选择和导出。
- [ ] 跟踪真实宿主中 recipe 输入的常见误用分布，确认当前“兼容合法 JSON string、仍优先推荐 object”的策略是否已足够，或是否还需要补更明确的 structured hint / debug 信息。
- [ ] 继续观察 MCP prompt / tool 描述中的关键 guardrail 是否足够支撑首轮成功率，尤其是 layer 上限、recipe 传参形态与 preset-first / recipe-first 分流。

## 产品增强

- [ ] 评估补充更丰富的内置 preset，但继续优先选择高语义、可复用、可稳定映射到当前 DSL 的效果。
- [ ] 补充一批更贴近 VFX / 粒子工作流的高语义 preset，例如 `spark`、`burst`、`slash`、`trail`。
- [ ] 评估导出或生成阶段的单通道 / mask / alpha 控制能力，支持更典型的粒子贴图工作流。
- [ ] 评估多 seed 批量变体生成能力，便于快速出 demo 与粒子资源探索。
- [ ] 评估 flipbook / atlas / strip 形式的输出能力，支撑粒子编辑器附属功能的中期演进。

## 工程与维护

- [ ] 视需要补充更正式的 logging / tracing 方案。
- [ ] 视需要补充 golden image / snapshot 测试，用于 renderer 回归比较。
- [ ] 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。
