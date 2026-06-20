import { expect, test } from '@playwright/test';

test('mobile visitor completes the mood-to-share journey', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '此刻，你想把什么交给音乐？' })).toBeVisible();
  await page.getByRole('radio', { name: /焦虑/ }).click();
  await page.getByLabel('也可以留下一句话').fill('这句话只留在本机');
  await page.getByRole('button', { name: '为我推荐一首音乐' }).click();
  await expect(page.getByText('此刻推荐')).toBeVisible();
  await page.getByRole('link', { name: '进入导赏' }).click();
  await expect(page.getByRole('heading', { name: '听后问题' })).toBeVisible();
  await page.getByRole('link', { name: '去 B站聆听' }).click();
  const [bilibili] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: '打开 B站' }).click(),
  ]);
  await bilibili.close();
  await page.getByRole('link', { name: '我已经听完' }).click();
  await page.getByLabel('我的听感').fill('我不必一次解决一切，可以先让一个音落下。');
  await page.getByRole('button', { name: '生成我的听感卡片' }).click();
  await expect(page.getByAltText('我的曲径通幽听感卡片')).toBeVisible();
  await expect(page.getByText('仅持链接可见')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('qj_current_journey'))).toContain(
    '这句话只留在本机',
  );

  const shareCode = new URL(page.url()).pathname.split('/').pop();
  expect(shareCode).toBeTruthy();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除这条听感' }).click();
  await expect(page).toHaveURL('/');
  const deletedShare = await context.request.get(`/s/${shareCode}`);
  expect(deletedShare.status()).toBe(404);
});

test('admin can sign in and view catalog', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill(process.env.ADMIN_PASSWORD ?? 'e2e-admin-password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.getByRole('heading', { name: '内容与反馈' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '《哥德堡变奏曲》咏叹调 PUBLISHED' }),
  ).toBeVisible();
});
