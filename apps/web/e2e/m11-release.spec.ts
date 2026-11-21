import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M11 (v1.0): onboarding, 7 plantillas 3 vistas, i18n ES/EN y privacidad', () => {
  test('completa guía de inicio, verifica vestido/chaqueta/falda en 3 vistas, alterna ES/EN y abre privacidad', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 1. Verificar nuevas plantillas en Frente, Perfil y Espalda (Chaqueta, Falda, Vestido)
    await page.getByRole('button', { name: 'Panel de prenda' }).click();
    for (const [label, key] of [
      ['Chaqueta', 'jacket'],
      ['Falda', 'skirt'],
      ['Vestido', 'dress'],
    ] as const) {
      await page.getByRole('button', { name: label }).click();
      await page.getByRole('button', { name: 'Frente' }).click();
      await expect(page.locator(`[data-garment="${key}"]`)).toBeVisible();
      await page.getByRole('button', { name: 'Perfil' }).click();
      await expect(page.locator(`[data-garment="${key}-side"]`)).toBeVisible();
      await page.getByRole('button', { name: 'Espalda' }).click();
      await expect(page.locator(`[data-garment="${key}-back"]`)).toBeVisible();
    }

    // 2. Alternar idioma ES -> EN -> ES
    await page.getByRole('button', { name: 'Cambiar idioma a inglés' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Fit room' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch language to Spanish' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();

    // 3. Abrir pantalla "Cómo se protegen tus datos"
    await page.getByRole('button', { name: 'Cómo se protegen tus datos' }).click();
    await expect(page.getByTestId('privacy-view')).toBeVisible();
    await expect(page.getByText('Qué nunca sale de tu dispositivo')).toBeVisible();

    // 4. Completar Guía de inicio rápido (Paso 1 -> Paso 2 -> Paso 3)
    await page.getByRole('button', { name: 'Guía de inicio rápido' }).click();
    await page.getByRole('button', { name: 'Siguiente: Color' }).click();
    await page.getByRole('button', { name: 'Guardar y seguir' }).click();
    await page.getByRole('button', { name: 'Cargar prendas de ejemplo' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Clóset local' })).toBeVisible();
    await expect(page.getByText('Camiseta básica de lino')).toBeVisible();
  });
});
