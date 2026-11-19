import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M2: medidas → prenda → mapa de calor (T2.9)', () => {
  test('permite ingresar medidas, ajustar prenda y ver el mapa de calor actualizado', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();

    // 1. Ajustar medida corporal de pecho a 92 cm
    const chestBody = page.getByLabel('Pecho', { exact: true });
    await chestBody.fill('92');

    // 2. Ajustar pecho en plano de la camiseta a 52 cm (104 - 92 = +12.0 cm -> Holgado)
    const chestFlat = page.getByLabel('Pecho en plano');
    await chestFlat.fill('52');

    const chestZone = page.locator('[data-heatmap-zone="chest"]');
    await expect(chestZone).toHaveAttribute('data-fit-state', 'loose');
    await expect(page.getByText('Pecho +12.0 cm')).toBeVisible();
    await expect(page.getByText('+12.0 cm', { exact: true })).toBeVisible();

    // 3. Cambiar a pantalón y verificar zonas de cintura y cadera
    await page.getByRole('button', { name: 'Pantalón' }).click();
    await expect(page.locator('[data-garment="pants"]')).toBeVisible();
    await expect(page.locator('[data-heatmap-zone="waist"]')).toBeVisible();
    await expect(page.locator('[data-heatmap-zone="hip"]')).toBeVisible();

    // 4. Verificar manifiesto PWA presente
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
  });
});
