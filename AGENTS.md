# AGENTS

项目目标：构建一个通过 MCP 暴露的、面向 AI 调用的程序化 2D 特效贴图生成工具，将高层语义 preset 转换为可执行 recipe，在不依赖生成式图像模型的前提下，实现可控、可复现的视觉资产生成能力。

## 当前状态

- 当前项目的 MVP 与最小 DSL/Preset/AI 查询链路已完成，可通过 MCP 调用生成、校验、导出贴图，并查询 preset 与 layer 语义信息。
- 当前核心链路为 `Preset -> Recipe -> Renderer -> Export/MCP`。
- 当前正式 recipe layer 类型：
  - `gradientCircle`
  - `circle`
  - `ring`
  - `rect`
  - `gradientRect`
  - `noise`
  - `blur`
- 当前已实现的内置 presets：
  - `glow`
  - `ring`
  - `smoke`
  - `panel`
  - `beam`
  - `colorRamp`
- 当前已实现的 MCP tools：
  - `generate_texture`
  - `export_texture`
  - `list_presets`
  - `get_preset_schema`
  - `list_layer_types`
  - `get_layer_schema`
  - `validate_recipe`
- 当前已补齐的工程护栏：
  - 贴图尺寸、总像素、layer 数量限制
  - 导出路径的 `workspaceRoot` 约束与 symlink / junction 逃逸拦截
  - 默认固定 `seed`，不依赖不可控随机源
- 当前阶段的开发重点已进入 P2：补充语义文档、资源与完整调用示例。
- 后续开发默认优先参考根目录中的 `TODO.md`。如无额外需求，不主动扩展 UI、HTTP、预览、blend、mask、transform 等能力。

## 协作与语言约定

- 与用户沟通默认使用中文，说明问题、同步进度、讨论方案时尽量使用中文。
- 代码、变量名、函数名、类型名、文件名尽量使用英文。
- 代码注释尽量使用英文，保持简洁，优先解释意图与约束，不写低信息量注释。
- 需要改动行为时，优先修改实现与测试，再更新文档；避免只改文档不落实现。

## MCP 测试约定

- 当用户明确是在做 MCP 服务联调、验收或黑盒测试时，默认先按黑盒方式验证 tool 行为、参数约束、structured output、错误信息与导出结果。
- 在第一轮黑盒测试完成前，不主动阅读 `src/` 下实现源码，避免被实现细节干扰对外部行为判断。
- 只有在黑盒测试失败、需要定位问题，或用户明确要求做实现级分析时，才进入源码排查。
- 黑盒测试阶段仍可阅读 `README.md`、`AGENTS.md`、`TODO.md`、测试脚本、启动命令和生成产物，用于理解预期行为与复现步骤。
- 黑盒测试生成的图片资源默认放入`test-output`文件夹

## 核心实现约束

- 严格围绕 `Preset -> Recipe -> Renderer` 架构实现，Preset 负责生成 Recipe，不直接参与渲染。
- `Recipe` 必须保持可序列化、可复现、可独立渲染，不依赖运行时隐式上下文。
- `Renderer` 负责解释标准化后的 recipe，不应感知 preset 语义。
- 优先保持类型清晰、模块边界清晰、行为可验证，避免过早抽象。
- 涉及随机行为时，必须通过 `seed` 保持可复现；不要引入不可控随机源。
- 涉及导出路径时，必须保持相对路径，并校验目标路径位于 `workspaceRoot` 内。

## 目录职责

- `src/core/types.ts`
  - 核心类型定义，包括 `LayerSpec`、`Recipe`、`PresetDefinition`、MCP 输入输出类型。
- `src/core/schema.ts`
  - Zod schema，负责 recipe、tool input/output、preset schema 元数据的验证与导出。
- `src/core/layers.ts`
  - layer catalog / schema metadata，承载 `list_layer_types`、`get_layer_schema` 所需的结构化语义信息。
- `src/core/recipe.ts`
  - Recipe 构造与标准化逻辑。
- `src/core/recipe-analysis.ts`
  - Recipe 统计与复杂度分析逻辑，例如总 layer 数与复杂度汇总。
- `src/core/renderer.ts`
  - 逐层解释 recipe 并输出图像缓冲。
- `src/core/presets.ts`
  - preset 定义、默认参数、`toRecipe` 映射。
- `src/core/generate.ts`
  - `preset` / `recipe` 两种生成入口的汇总逻辑。
- `src/core/export.ts`
  - 导出图片与 meta，校验输出路径。
- `src/core/validate.ts`
  - recipe 校验入口，返回校验结果、错误列表、标准化 recipe 与统计信息。
- `src/core/limits.ts`
  - 工程护栏常量，例如尺寸、像素、layer 数与默认 seed。
- `src/mcp/tools.ts`
  - MCP tools 注册、输入校验、structured output 返回。
- `test/`
  - 单测与集成测试，优先覆盖工具链路、路径安全、schema 校验和渲染回归。

## 新增图元类型时的要求

新增图元类型时，至少同步检查并更新以下位置：

- `src/core/types.ts`
  - 增加新的 layer 类型和 `LayerSpec` 联合。
- `src/core/schema.ts`
  - 增加对应 Zod schema，并纳入 `layerSpecSchema`。
- `src/core/renderer.ts`
  - 增加对应渲染分支，并在 `applyLayer` 的 `switch` 中接入。
- `src/core/recipe.ts`
  - 如有标准化或默认值逻辑，在这里补齐。
- `src/core/layers.ts`
  - 补齐该 layer 的 catalog 信息、schema 元数据、用途说明与示例，确保 AI 查询链路同步可用。
- `test/`
  - 至少增加该图元的渲染测试或集成测试，覆盖基本参数与边界情况。

新增图元时还要遵守：

- 参数尽量使用归一化坐标或归一化尺寸，保持与现有 recipe 风格一致。
- 新图元应尽量保持单一职责；复杂组合优先通过多个 layer 顺序组合或 preset 组织，而不是让单个图元承担过多语义。
- 如果参数之间存在约束，例如大小关系、范围关系，应在 schema 层做校验，而不是只在 renderer 中兜底。
- 如果新增图元会改变已有 recipe 的解释方式，需要明确评估兼容性；没有必要时不要破坏既有 recipe。
- 当前正式 DSL 不保留 `group`；如未来确实需要组级隔离渲染、局部 effect、裁剪或局部混合，应以新语义重新设计，而不是恢复旧容器。

## 新增 preset 时的要求

- 在 `src/core/presets.ts` 中定义 schema、默认参数和 `toRecipe`。
- preset 的职责是把高层语义参数映射为 recipe，不直接调用 canvas API。
- 新 preset 应返回稳定、可复现、可解释的 recipe。
- `list_presets` 与 `get_preset_schema` 应能自动反映新增 preset；如行为变化，补充测试。
- 如 preset 参数有默认值，必须同时体现在 `defaultParams` 和 schema 约束中。

## 新增 MCP tool 时的要求

- 在 `src/core/types.ts` 中补充对应输入输出类型。
- 在 `src/core/schema.ts` 中补充 input/output schema。
- 在 `src/mcp/tools.ts` 中注册工具定义、描述、输入输出 schema 与执行逻辑。
- 返回结果时优先提供稳定的 `structuredContent`，文本内容只做简要说明。
- 工具报错优先返回可读、可定位的错误信息，不要吞错。
- 如工具属于查询语义类能力，优先复用 `src/core/layers.ts` / `src/core/presets.ts` 中的结构化元数据，不要把说明散落在 tool 内部硬编码。
- 新工具如果涉及文件系统、状态或路径，必须补充对应集成测试。

## 测试与验证要求

- 修改 recipe、renderer、export、MCP tool 时，优先补测试或更新现有测试。
- 至少覆盖：
  - 输入 schema 校验
  - 未知 preset / 未知 tool 的错误路径
  - 导出路径必须为 workspace 内相对路径
  - 新图元或新 preset 的基本渲染行为
  - `validate_recipe` 的合法 / 非法路径
  - layer / preset 查询接口的 structured output
- 涉及随机效果时，测试中尽量固定 `seed`。
- 如后续补充 golden image / snapshot 测试，优先用于 renderer 回归而不是替代逻辑断言。

## 文档更新约定

- 新增图元、preset 或 MCP tool 后，按需更新 `README.md`，至少保证外部使用者能发现该能力。
- 如果某项能力仍是实验性的，在文档中明确标注，不要伪装为稳定接口。
- 如果实现边界发生变化，也应同步更新本文件与 `TODO.md` 的相关描述。

## 不建议的方向

- 不要绕开 `Recipe` 直接在 MCP 层或 preset 层拼接渲染细节。
- 不要在没有明确需求时引入 UI、HTTP 服务、复杂预览链路或大型框架依赖。
- 不要为了单个效果快速堆特例分支，优先沉淀为通用 recipe 能力或清晰的 preset 参数。
- 不要破坏 `workspaceRoot` 路径约束，也不要接受绝对导出路径。
