# TODO

仅保留后续打算做的事情。

## 协议与接口

- [ ] 评估降低 `generate_texture -> export_texture` 对单一“当前结果”会话态的依赖，例如引入显式结果句柄或更稳定的结果引用方式，避免多次生成时互相覆盖。
- [ ] 继续讨论并明确 `Preset -> Recipe` 对外暴露策略：在不放大默认输出噪声的前提下，让 AI 或外部工具能稳定获取 preset 编译后的 recipe。
- [ ] 若后续有多 workspace 或宿主集成需求，扩展 `workspaceRoot` 的来源策略，例如多根目录或宿主显式注入。
- [ ] 评估为 `generate_texture` 增加可选返回项，例如 `includeResolvedRecipe`，仅在显式请求时于 `preset` 模式下回传编译后的 recipe。
- [ ] 如果“只获取 preset 编译结果、不需要渲染”的需求稳定存在，评估是否拆分独立的 compile / resolve 类能力。
- [ ] 评估是否提供更轻量的生成结果检查或引用信息，让 AI 在生成后不必立刻落盘也能继续比较、选择和导出。

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
