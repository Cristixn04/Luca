import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M2: medidas → prenda → mapa de calor (T2.9)', () => {
  test('permite ingresar medidas, ajustar prenda y ver el mapa de calor actualizado', async ({
    page,
  }) => {
    await page.goto('/');

    // Primer arranque en M3: continuar sin cifrado para probar el flujo rápido del probador
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();

    // 1. Abrir panel de medidas desde la barra vertical derecha y ajustar pecho a 92 cm
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    const chestBody = page.getByLabel('Pecho', { exact: true });
    await chestBody.fill('92');

    // 2. Abrir panel de prenda y ajustar pecho en plano de la camiseta a 52 cm (+12.0 cm -> Holgado)
    await page.getByRole('button', { name: 'Panel de prenda' }).click();
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
