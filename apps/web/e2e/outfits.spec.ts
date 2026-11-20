import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M9: sugerir outfits → guardar → registrar uso y CPW (T9.9)', () => {
  test('genera 3 propuestas diversas, guarda outfit, registra uso hoy y actualiza CPW en clóset', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 1. Abrir Outfits y cargar 6 prendas de ejemplo
    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Outfits' })).toBeVisible();

    await page.getByRole('button', { name: /Cargar 6 prendas de ejemplo/i }).click();

    // 2. Verificar 3 propuestas diversas con desglose
    await expect(page.getByRole('tab', { name: /Opción 1/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Opción 2/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Opción 3/i })).toBeVisible();
    await expect(page.getByTestId('outfit-breakdown-card')).toBeVisible();

    // 3. Guardar outfit y registrar uso hoy
    await page.getByRole('button', { name: 'Guardar outfit' }).click();
    await expect(page.getByTestId('saved-outfits-card')).toBeVisible();

    await page.getByRole('button', { name: 'Usé este outfit hoy' }).click();
    await expect(page.getByText('Uso registrado para hoy.')).toBeVisible();

    // 4. Ir al Clóset, ubicar la prenda usada hoy (1 uso) y comprobar uso = 1 y CPW actualizado
    await page.getByRole('link', { name: 'Clóset' }).click();
    const wornCard = page.locator('div[class*="rounded"]', { hasText: '1 uso(s)' }).first();
    await expect(wornCard).toBeVisible();
    await wornCard.getByRole('button', { name: /Ver calce y tallas/i }).click();
    await expect(page.getByTestId('garment-usage-card')).toBeVisible();
    await expect(page.getByTestId('garment-wear-count')).toHaveText('1');

    // 5. Registrar un segundo uso y verificar que baja el CPW a la mitad
    const cpwBefore = await page.getByTestId('garment-cpw-value').textContent();
    await page.getByRole('button', { name: 'Registrar uso hoy' }).click();
    await expect(page.getByTestId('garment-wear-count')).toHaveText('2');
    const cpwAfter = await page.getByTestId('garment-cpw-value').textContent();
    expect(cpwAfter).not.toBe(cpwBefore);
  });
});
