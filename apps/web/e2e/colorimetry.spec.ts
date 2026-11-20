import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M8: colorimetría estacional, afinidad de prendas y opción de ignorar', () => {
  test('define perfil guiado de 12 estaciones, muestra afinidad CIEDE2000 en clóset y permite ignorarla', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 1. Abrir sección Color y seleccionar muestras guiadas cálidas (Otoño)
    await page.getByRole('link', { name: 'Color' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Colorimetría estacional' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Profunda ámbar/i }).click();
    await page.getByRole('button', { name: /Castaño oscuro cálido/i }).click();
    await page.getByRole('button', { name: /Café oscuro/i }).click();

    await expect(page.getByTestId('color-result-card')).toContainText(/Otoño Profundo/i);
    await expect(page.getByTestId('season-palette-grid').locator('> div')).toHaveCount(14);

    await page.getByRole('button', { name: /Guardar perfil de color/i }).click();
    await expect(page.getByText(/Perfil de color guardado/i)).toBeVisible();

    // 2. Ir al Clóset, cargar prendas de ejemplo y ver afinidad en tarjeta y detalle
    await page.getByRole('link', { name: 'Clóset' }).click();
    await page.getByRole('button', { name: /Cargar 2 prendas de ejemplo/i }).click();
    await expect(page.getByText('Afinidad paleta').first()).toBeVisible();

    await page.getByRole('button', { name: /Ver calce y tallas/i }).first().click();
    await expect(page.getByTestId('garment-color-harmony-card')).toBeVisible();
    await expect(page.getByTestId('garment-color-harmony-card')).toContainText('ΔE₀₀');

    // 3. Volver a Color y activar "Ignorar colorimetría"
    await page.getByRole('link', { name: 'Color' }).click();
    await page.getByRole('button', { name: /Ignorar colorimetría/i }).click();
    await expect(page.getByTestId('color-ignored-banner')).toBeVisible();

    // 4. Confirmar que en Clóset ya no aparecen badges de afinidad
    await page.getByRole('link', { name: 'Clóset' }).click();
    await expect(page.getByText('Afinidad paleta')).toHaveCount(0);
  });
});
