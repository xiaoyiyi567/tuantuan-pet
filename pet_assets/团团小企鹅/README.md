# 团团小企鹅素材入口

第一阶段默认使用 CSS 绘制的小企鹅，保证空仓库也能运行。

后续替换素材时，建议按状态放置图片或 GIF：

```text
pet_assets/团团小企鹅/idle/idle.gif
pet_assets/团团小企鹅/focus/focus.gif
pet_assets/团团小企鹅/success/success.gif
pet_assets/团团小企鹅/error/error.gif
pet_assets/团团小企鹅/waiting/waiting.gif
pet_assets/团团小企鹅/break/break.gif
```

然后在 `src/renderer/src/components/PetView.tsx` 中把 `PenguinPet` 替换为图片渲染，或新增基于状态的素材映射。
