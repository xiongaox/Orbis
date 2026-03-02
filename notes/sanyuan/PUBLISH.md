# npm 发布教程

## 一、准备工作

### 1. 注册 npm 账号

前往 [npmjs.com](https://www.npmjs.com/) 注册账号。

### 2. 完善 package.json

发布前请修改以下字段：

```json
{
  "author": "你的名字 <your-email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/你的用户名/sanyuan-tianxing.git"
  },
  "bugs": {
    "url": "https://github.com/你的用户名/sanyuan-tianxing/issues"
  },
  "homepage": "https://github.com/你的用户名/sanyuan-tianxing#readme"
}
```

### 3. 确认包名是否可用

```bash
npm search sanyuan-tianxing
```

如果名称已被占用，需要修改 `package.json` 中的 `name` 字段。

---

## 二、本地测试

### 在其他项目中测试本地包

```bash
# 在算法目录创建全局链接
cd e:\Users\xiongaox\Downloads\sanyuan
npm link

# 在测试项目中使用
cd 你的测试项目
npm link sanyuan-tianxing
```

测试代码：

```javascript
const SanYuan = require('sanyuan-tianxing');
console.log(SanYuan.computeYunPan(9));
```

---

## 三、发布步骤

### 1. 登录 npm

```bash
npm login
# 输入用户名、密码、邮箱
```

### 2. 首次发布

```bash
cd e:\Users\xiongaox\Downloads\sanyuan
npm publish
```

发布成功后，可以在 https://www.npmjs.com/package/sanyuan-tianxing 查看。

### 3. 更新版本

修改代码后，更新版本号再发布：

```bash
# 补丁版本 (bug 修复): 1.0.0 -> 1.0.1
npm version patch

# 次版本 (新功能): 1.0.0 -> 1.1.0
npm version minor

# 主版本 (破坏性更新): 1.0.0 -> 2.0.0
npm version major

# 发布新版本
npm publish
```

---

## 四、GitHub 发布（可选）

### 1. 创建 GitHub 仓库

在 [github.com](https://github.com/new) 创建新仓库 `sanyuan-tianxing`。

### 2. 初始化 Git 并推送

```bash
cd e:\Users\xiongaox\Downloads\sanyuan

# 初始化 Git
git init
git add .
git commit -m "feat: 初始版本 - 三元天星排盘算法"

# 添加远程仓库
git remote add origin https://github.com/你的用户名/sanyuan-tianxing.git

# 推送
git branch -M main
git push -u origin main
```

### 3. 创建 Release

在 GitHub 仓库页面点击 **Releases** → **Create a new release**：
- Tag: `v1.0.0`
- Title: `v1.0.0 - 初始版本`
- 描述发布内容

---

## 五、通过 CDN 使用

发布到 npm 后，可以通过 CDN 直接引用：

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/sanyuan-tianxing/app.js"></script>

<!-- unpkg -->
<script src="https://unpkg.com/sanyuan-tianxing/app.js"></script>
```

---

## 六、常见问题

### Q: 发布报错 403 Forbidden

可能原因：
1. 包名已被占用 → 修改 `name`
2. 未登录 → 执行 `npm login`
3. 邮箱未验证 → 去 npmjs.com 验证邮箱

### Q: 发布报错 402 Payment Required

原因：带 `@scope/` 的包需要付费或设置为公开：

```bash
npm publish --access public
```

### Q: 如何撤销已发布的版本

```bash
npm unpublish sanyuan-tianxing@1.0.0
```

注意：24小时内可撤销，超过后无法撤销。

---

## 七、检查清单

发布前确认：

- [ ] `package.json` 中 `name` 正确
- [ ] `package.json` 中 `version` 已更新
- [ ] `package.json` 中 `author` 已填写
- [ ] `README.md` 文档完整
- [ ] `LICENSE` 文件存在
- [ ] 本地测试通过
