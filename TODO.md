# TODO

MVP 主线已完成。下面保留的是后续增强项，而不是当前阻塞项。

## 工程与协议

- 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。
- 视需要补充更正式的 logging / tracing 方案，而不只是当前的 stderr 调试日志。
- 若后续有多 workspace 或宿主集成需求，继续扩展 `workspaceRoot` 的来源策略。

## MCP 可发现性与 AI 集成

- 明确分工：核心事实与规则优先通过 MCP 暴露，不把关键语义只放在宿主侧 prompt 或 skill 中。
- 优先新增结构化查询类 tools：`list_layer_types`、`get_layer_schema`、`validate_recipe`，让调用方 AI 能在生成前发现能力边界与组织规则。
- 为 `get_layer_schema` 设计比 JSON Schema 更强的语义字段，例如 `description`、`parameterSemantics`、`constraints`、`coordinateSpace`、`commonUses`、`compositionNotes`、`examples`。
- 评估为 `generate_texture` 增加可选返回项，例如 `includeResolvedRecipe`，仅在 `preset` 模式下回传编译后的 recipe，便于调用方做二次编辑与调试。
- 增加 MCP resources，用于承载稳定说明文档，而不是继续堆说明型 tool；首批可包含 layer reference、preset playbook、recipe examples、composition rules。
- 增加 MCP prompts，沉淀推荐调用流程，例如“先 `list_presets` / `get_preset_schema`，不够再查 layer，再 `validate_recipe`，最后 `generate_texture`”。
- 将 skill 定位为特定宿主内的增强层，只负责封装工作流与默认策略，不承载唯一真相；跨客户端共享的能力应仍以 MCP tools/resources 为准。
- 设计一套统一的“语义查询 -> 组织数据 -> 校验 -> 生成”调用路径，并补充对应集成测试，确保调用方 AI 按推荐流程使用时成功率稳定。

## 图元与 Recipe 重构草案

- 保持外部 recipe 结构继续偏展平，不在当前阶段引入完整的 `shape + fill + stroke` 通用抽象。
- 保留当前的单层顺序执行模型，但在概念上明确区分 `draw` 与 `effect` 两类 layer；当前阶段不保留独立 `structural` layer。
- 保留现有 `circle`、`ring`、`noise`、`blur`，并在本轮重构中移除 `group`。
- 将 `radialGradient` 重新收敛命名与语义，优先评估改为 `gradientCircle`，明确表示这是径向渐变圆形图元，而不是通用渐变能力。
- 新增 `rect` 图元，用于纯色矩形与圆角矩形；通过 `cornerRadius` 表达圆角，而不是新增 `roundedRect`。
- 新增 `gradientRect` 图元，用于线性渐变矩形与圆角线性渐变矩形；不新增 `gradientRoundedRect`。
- `gradientRect` 首版仅支持简单方向枚举，例如 `horizontal` / `vertical`，暂不开放任意角度与对角线控制。
- `gradientCircle` 与 `gradientRect` 首版继续使用 `colors: string[]`，按均匀 stop 分布解释；暂不引入显式 `color stops` 结构。
- 后续如出现更强的精确控制需求，再评估升级为 `stops: { offset, color }[]`，参考 Canvas2D 的 `CanvasGradient.addColorStop(offset, color)` 设计。
- 不在当前阶段引入 `gradientRect` 之外的通用 fill 体系，避免出现大量低价值组合，例如任意 shape 配任意 gradient。
- 不在当前阶段引入 `stroke`、`transform`、`blendMode`、`mask`、通用 path 等更宽泛能力。
- 明确 `noise` 与 `blur` 的语义是“作用于当前整张画布结果的全屏 effect”，不伪装成普通图元。
- 当前阶段不保留 `group`；如未来确实出现组级隔离渲染、局部 effect、裁剪或局部混合需求，再以新语义重新引入，而不是保留一个无隔离语义的空容器。
- 在 schema、文档与后续语义查询接口中补充 layer category / semantics 描述，降低人和 AI 对 `draw` 与 `effect` 混放的误解风险。
- 为本轮重构补充测试：`rect` 基础渲染、圆角角落透明、`gradientRect` 方向正确性、`gradientCircle` 基础渐变行为、`noise`/`blur` 顺序语义，以及 `group` 移除后的兼容/报错路径。

## 测试与质量

- 增加更多图层与组合场景的像素测试，尤其是 `blur`、`noise`、`group` 的边界情况。
- 视需要补充 golden image / snapshot 测试，用于回归比较。
- 为导出链路补充更多格式与质量参数测试，例如 `webp`、不同 `jpeg quality`。

## 文档与演示

- 在 `README.md` 中补充更完整的使用示例，包括一次完整的 generate/export 流程。
- 如果需要对外展示，可补一个可保留产物的 demo 脚本或示例命令。
- 根据后续使用方式，决定是否补充 MCP 客户端接入示例与常见问题。
