import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M5: 3 vistas coherentes y medidas opcionales (T5.1 – T5.7)', () => {
  test('actualiza las tres vistas coherentemente y limpia marcas de estimado al ingresar opcionales', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();

    // Activar modo de 3 vistas
    await page.getByRole('button', { name: '3 vistas' }).click();

    await expect(page.locator('[data-avatar-view="front"]')).toBeVisible();
    await expect(page.locator('[data-avatar-view="side"]')).toBeVisible();
    await expect(page.locator('[data-avatar-view="back"]')).toBeVisible();

    // Verificar marca "Fondo: estimado" inicial en perfil
    await expect(page.locator('[data-estimated-badge="side"]')).toContainText('Fondo: estimado');

    // Ingresar fondos opcionales desde el panel desplegable de medidas -> la marca de estimado en perfil desaparece
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    await page.getByRole('button', { name: /Medidas opcionales/i }).click();
    await page.getByLabel('Fondo de pecho').fill('23');
    await page.getByLabel('Fondo de cintura').fill('20');
    await page.getByLabel('Fondo de cadera').fill('25');

    await expect(page.locator('[data-estimated-badge="side"]')).toHaveCount(0);

    // Cambiar a pantalón desde el panel desplegable de prenda y verificar coherencia entre las 3 vistas
    await page.getByRole('button', { name: 'Panel de prenda' }).click();
    await page.getByRole('button', { name: 'Pantalón' }).click();
    await page.getByLabel('Cintura en plano').fill('43'); // 86 - 78 = +8.0 cm -> Holgado (loose)

    await expect(
      page.locator('[data-avatar-view="front"] [data-heatmap-zone="waist"]'),
    ).toHaveAttribute('data-fit-state', 'loose');
    await expect(
      page.locator('[data-avatar-view="side"] [data-heatmap-zone="waist"]'),
    ).toHaveAttribute('data-fit-state', 'loose');
    await expect(
      page.locator('[data-avatar-view="back"] [data-heatmap-zone="waist"]'),
    ).toHaveAttribute('data-fit-state', 'loose');
  });
});
