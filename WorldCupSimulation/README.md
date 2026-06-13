# WorldCupSimulation · Pulse26

一个为 2026 世界杯打造的互动球迷网页应用。用户可以查看 48 支球队和比赛日程、比较球队胜率、用免费积分预测赛果、支持主队、发送助威，并挑战点球小游戏。

## 在线体验

**[打开 WorldCupSimulation](https://taofeng-sketch.github.io/taofeng_vibe_coding/WorldCupSimulation/)**

## 核心功能

- 48 支参赛球队、分组、排名、实力指数与关键球员
- 昨日、今日、明日比赛中心
- 基于综合实力、近期状态和排名的可解释胜率模型
- 无真钱、无提现、无奖品的免费积分预测
- 球队阵营、助威墙和本地进度保存
- 五轮点球压力赛
- 桌面端与移动端响应式界面
- 自动化模型测试、语法检查和 GitHub Pages 发布

## 产品边界

- 积分不可购买、转让、提现或兑换，不包含真钱赌博功能。
- 概率仅为娱乐性模型估算，不构成投注或财务建议。
- 用户互动默认保存在浏览器 `localStorage`，不会上传服务器。
- 赛事信息是 `2026-06-13` 的演示数据快照；正式产品应接入授权实时数据源。
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
