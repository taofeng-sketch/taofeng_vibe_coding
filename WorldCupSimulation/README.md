# WorldCupSimulation · Pulse26

一个为 2026 世界杯打造的中英双语互动球迷网页应用。用户可以浏览 104 场完整赛程、查看 48 支球队及核心球员、回顾已完赛进球、理解胜率模型，并用免费积分预测赛果。

## 在线体验

**[打开 WorldCupSimulation](https://taofeng-sketch.github.io/taofeng_vibe_coding/WorldCupSimulation/)**

## 核心功能

- 中文 / English 一键切换
- 104 场完整赛程日历：日期、阶段、状态、球队和城市筛选
- 48 支参赛球队与 48 名核心球员双语介绍
- 已完赛比分、关键进球者和 FIFA 官方报告 / 集锦入口
- 基于综合实力、近期状态和排名的可解释胜率模型与权重
- 无真钱、无提现、无奖品的免费积分预测
- 球队阵营、助威墙和本地进度保存
- 五轮点球压力赛
- 桌面端与移动端响应式界面
- 自动化模型测试、语法检查和 GitHub Pages 发布

## 产品边界

- 积分不可购买、转让、提现或兑换，不包含真钱赌博功能。
- 概率仅为娱乐性模型估算，不构成投注或财务建议。
- 用户互动默认保存在浏览器 `localStorage`，不会上传服务器。
- 赛程来自 FIFA 官方 PDF；结果信息是 `2026-06-13 13:30 BST` 的演示快照，正式产品应接入授权实时数据源。
- 本项目并非 FIFA 官方产品，也不使用球队徽章或受保护赛事标识。

## 本地运行

```bash
npm run dev
```

打开 `http://localhost:4173`。

## 质量检查

```bash
npm test
npm run check
```

详细流程：

- [QA 流程](QA.md)
- [产品评估](EVALUATION.md)
- [调研记录](RESEARCH.md)

## 部署

项目位于 `taofeng_vibe_coding/WorldCupSimulation/`。推送到 `main` 后，仓库根目录的 GitHub Pages 会自动发布该子目录；GitHub Actions 同时运行项目 QA。它是纯静态网页，不需要构建步骤或后端服务。

## 每日数据刷新

GitHub Actions 工作流 `WorldCupSimulation Daily Refresh` 每天在伦敦时间 **13:30** 自动运行：

1. 从公开的 ESPN World Cup scoreboard JSON 获取 104 场最新状态。
2. 映射比赛、比分、进行状态、进球事件、报告和集锦链接。
3. 拒绝少于 104 场、无法完整映射或状态数量不一致的响应。
4. 运行全部测试和语法检查。
5. 仅在校验通过后更新 `live-snapshot.js`，自动提交并触发 GitHub Pages 发布。

定时任务只在 `2026-06-11` 至 `2026-07-20` 的赛事窗口内写入数据，也可以从 GitHub Actions 页面手动触发。页面属于每日快照，不是秒级实时比分服务。
