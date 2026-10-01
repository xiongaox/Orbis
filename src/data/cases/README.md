# 案例语料(已迁移)

本目录的案例与断法 Markdown 语料已迁出 Orbis 主仓,统一保管在私有语料仓
**orbis-lore**(`https://github.com/xiongaox/orbis-lore`)中:
`corpus/bazi`、`corpus/qimen` 为明文源,`dist/cases_v1.enc` 为加密包分发物。

## 为什么迁走

语料为受保护的作者内容,不随 Orbis 主仓提交白名单或对外;多机开发通过加密包分发还原。

## 如何还原语料(新开发机必读)

1. clone orbis-lore(建议与本仓平级放置);
2. 从作者处获取 `keys/master.key` 放入 Orbis 的 `keys/`(密钥永不入库);
3. 在 Orbis 根目录执行:

```bash
npm run cases:unpack    # 默认还原 ../orbis-lore/dist/cases_v1.enc 到本目录
```

也可显式指定包路径与输出目录:`npx tsx scripts/pack-cases.ts --unpack <enc路径> [--out <目录>] [--force]`。

## 同步纪律

- 在本目录修改语料后,必须把变更同步回 orbis-lore 的 `corpus/`,然后执行
  `npm run cases:publish` 一键完成「重打包 → 拷入 lore/dist → 提交推送」;
- 本目录内容(除 README/AGENTS 外)不进入 git,提交前无需处理语料变更。
