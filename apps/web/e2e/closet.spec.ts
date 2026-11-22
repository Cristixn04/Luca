import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M4: clóset local cifrado, tallas y talla recomendada (T4.7)', () => {
  test('guarda prenda con tallas cifradas, recarga, desbloquea y muestra talla recomendada', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Crear bóveda cifrada
    await page.getByLabel('Contraseña de la bóveda').fill('ClosetE2E2026!');
    await page.getByRole('button', { name: /Crear bóveda cifrada/i }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Entrar a Luca' }).click();

    // 2. Ir al Clóset y añadir una prenda con tabla de tallas (S, M, L por defecto)
    await page.getByRole('link', { name: 'Clóset' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Clóset local' })).toBeVisible();

    await page.getByRole('button', { name: 'Añadir prenda' }).click();
    await page.getByLabel('Nombre *').fill('Camisa Oxford Azul');
    await page.getByRole('button', { name: 'Guardar prenda' }).click();

    await expect(page.getByText('Camisa Oxford Azul')).toBeVisible();

    // 3. Recargar página y desbloquear para probar persistencia cifrada en IndexedDB
    await page.reload();
    await page.getByLabel('Contraseña', { exact: true }).fill('ClosetE2E2026!');
    await page.getByRole('button', { name: 'Desbloquear' }).click();

    await page.getByRole('link', { name: 'Clóset' }).click();
    await expect(page.getByText('Camisa Oxford Azul')).toBeVisible();

    // 4. Seleccionar prenda en el perchero, verificar talla sugerida M y abrir en Probador con "Ver calce y tallas"
    await expect(page.getByRole('button', { name: /Ver calce y tallas/i })).toHaveCount(0);
    await page.getByRole('button', { name: 'Seleccionar Camisa Oxford Azul' }).click();
    await expect(page.getByTestId('spotlight-recommended-size')).toContainText('Talla sugerida: M');
    await page.getByRole('button', { name: /Ver calce y tallas/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();
    await expect(page.locator('[data-heatmap-zone="chest"]')).toBeVisible();
  });
});
