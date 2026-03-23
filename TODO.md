# TODO

MVP 主线已完成。下面保留的是后续增强项，而不是当前阻塞项。

## 当前评估结论（2026-03-23）

- 当前工程可继续进入下一阶段开发，不属于“先修锅再推进”的状态。
- 当前基线：`npm run build` 与 `npm test` 通过，主链路 `Preset -> Recipe -> Renderer -> Export/MCP` 可用。
- 下一阶段不建议直接继续堆 preset、文档型 tool 或更宽泛能力；优先补齐工程护栏，并完成最小 recipe 语言定稿。
- 进入下一阶段前优先处理的工程问题：
  - 为 `generate` / `render` 链路增加资源上限与复杂度护栏，例如 `width`、`height`、layer 数量、嵌套深度，避免 AI 调用时出现 OOM、卡死或异常深递归。
  - 收紧导出路径安全：除相对路径与 `workspaceRoot` 检查外，还要评估并处理 symlink / junction 导致的目录逃逸问题。
  - 明确并收敛 seed 策略，避免主链路继续依赖不可控随机源；如保留自动生成 seed，也应保证行为与文档口径一致且结果可回传复现。

## 工程与协议

- 如果官方 SDK 版本问题消除，评估从低层 `Server` 切回高层 `McpServer`。
- 视需要补充更正式的 logging / tracing 方案，而不只是当前的 stderr 调试日志。
- 若后续有多 workspace 或宿主集成需求，继续扩展 `workspaceRoot` 的来源策略。
- 为 `generate_texture` / `render` 的输入增加明确的资源护栏，并统一错误信息格式，避免宿主侧只能看到模糊的运行失败。
- 评估导出路径校验是否需要引入 `realpath` 级别的最终路径确认，确保 `workspaceRoot` 约束不被 symlink / junction 绕过。
- 明确 seed 的生成、回传与复现策略；在接口、测试与文档层统一口径，不留“默认随机但不可追踪”的灰区。

## MCP 可发现性与 AI 集成

- 明确分工：核心事实与规则优先通过 MCP 暴露，不把关键语义只放在宿主侧 prompt 或 skill 中。
- 优先新增结构化查询类 tools：`list_layer_types`、`get_layer_schema`、`validate_recipe`，让调用方 AI 能在生成前发现能力边界与组织规则。
- 为 `get_layer_schema` 设计比 JSON Schema 更强的语义字段，例如 `description`、`parameterSemantics`、`constraints`、`coordinateSpace`、`commonUses`、`compositionNotes`、`examples`。
- `generate_texture` 回传编译后 recipe 属于次优先级增强；优先保证调用前的语义发现、schema 理解与 recipe 校验链路完整。
- 评估为 `generate_texture` 增加可选返回项，例如 `includeResolvedRecipe`，仅在 `preset` 模式下回传编译后的 recipe，便于调试与二次编辑。
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
- 在实现本轮重构时同步评估 recipe 兼容策略：是直接升级到新命名，还是在 `normalizeRecipe` 中兼容旧 `radialGradient` / `group` 输入。
- 为本轮重构补充测试：`rect` 基础渲染、圆角角落透明、`gradientRect` 方向正确性、`gradientCircle` 基础渐变行为、`noise`/`blur` 顺序语义，以及 `group` 移除后的兼容/报错路径。

## 实施顺序与优先级

- P0（已完成，2026-03-23）：补工程护栏。已为 `width`、`height`、总像素、layer 数量、嵌套深度补上 schema / 运行时限制与测试，保证面对 AI 调用时不会轻易打爆资源。
- P0（已完成，2026-03-23）：收紧导出路径安全。已补充 `realpath` / 现存路径检查，拦截 symlink / junction 场景下的 `workspaceRoot` 逃逸，并补充对应测试。
- P0（已完成，2026-03-23）：明确 seed 策略。当前未传 `seed` 时统一使用固定默认值，移除不可控随机源；显式传入时仍保持调用方可控。
- P0：冻结最小 recipe 语言。先定稿 `circle`、`ring`、`gradientCircle`、`rect`、`gradientRect`、`noise`、`blur` 的命名、参数、约束与兼容策略，不在这一步引入更多图元。
- P0：完成 recipe 重构落地。同步修改 `types`、`schema`、`renderer`、`recipe normalize`、核心测试，确保最小 DSL 已可稳定渲染与校验。
- P1：补齐最小可用 preset 集。基于新的图元能力调整现有 `glow` / `ring` / `smoke`，必要时新增 1 到 2 个能体现目标方向的 preset，例如 panel / beam / soft gradient 类效果。
- P1：补齐 AI 查询链路。实现 `list_layer_types`、`get_layer_schema`、`validate_recipe`，让调用方 AI 能在生成前理解语言边界，而不是只靠 README 和记忆。
- P2：补充语义文档与资源。增加 layer reference、preset playbook、recipe examples，并根据宿主支持情况补充 MCP resources / prompts。
- P2：完善 README 使用示例，重点展示“查询语义 -> 组织 recipe -> 校验 -> 生成 -> 导出”的完整流程，而不仅是本地启动方式。
- P3：再评估 `includeResolvedRecipe`、更丰富 preset、golden image、logging / tracing、MCP SDK 切换等增强项；这些都应排在最小语言和 AI 可发现性之后。
- 持续原则：每完成一个阶段，都先验证它是否更贴近“面向 AI 调用的程序化 2D 特效贴图生成器”这个目标；与目标不直接相关的泛化能力默认延后。

## 测试与质量

- 为资源护栏补测试：超大尺寸输入、超多 layer、过深嵌套 recipe 的拒绝路径，以及错误信息可读性。
- 为导出路径安全补测试：覆盖 symlink / junction / 路径逃逸等场景，确保最终写入目标仍受 `workspaceRoot` 约束。
- 为 seed 策略补测试：显式 seed 的确定性、自动 seed 的回传与复现路径、preset 与 recipe 两种模式下的一致性。
- 增加更多图层与组合场景的像素测试，尤其是 `blur`、`noise`、`gradientCircle`、`gradientRect` 的边界情况。
- 视需要补充 golden image / snapshot 测试，用于回归比较。
- 为导出链路补充更多格式与质量参数测试，例如 `webp`、不同 `jpeg quality`。

## 文档与演示

- 在 `README.md` 中补充更完整的使用示例，包括一次完整的 generate/export 流程。
- 如果需要对外展示，可补一个可保留产物的 demo 脚本或示例命令。
- 根据后续使用方式，决定是否补充 MCP 客户端接入示例与常见问题。
