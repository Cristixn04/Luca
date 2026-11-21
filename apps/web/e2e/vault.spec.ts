import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M3: bóveda cifrada, persistencia, bloqueo y recuperación (T3.8)', () => {
  test('cifra medidas en IndexedDB, bloquea/desbloquea tras recargar y recupera con clave de recuperación', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Crear bóveda cifrada con PBKDF2 600.000 iteraciones
    await expect(page.getByRole('heading', { name: 'Crea tu bóveda cifrada' })).toBeVisible();
    await page.getByLabel('Contraseña de la bóveda').fill('MiClaveReal2026!');
    await page.getByRole('button', { name: /Crear bóveda cifrada/i }).click();

    // 2. Capturar clave de recuperación única y confirmar guardado
    const recoveryCode = page.getByTestId('recovery-key-value');
    await expect(recoveryCode).toBeVisible();
    const recoveryKey = (await recoveryCode.textContent())?.trim() ?? '';
    expect(recoveryKey).toMatch(/^[0-9A-F]{8}(-[0-9A-F]{8}){7}$/);

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Entrar a Luca' }).click();

    // 3. Modificar medida de pecho a 99 cm y esperar persistencia cifrada debounced
    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    const chestInput = page.getByLabel('Pecho', { exact: true });
    await chestInput.fill('99');
    await page.waitForTimeout(500);

    // 4. Recargar la página -> debe aparecer la pantalla de desbloqueo
    await page.reload();
    await expect(page.getByText('Tus datos están cifrados en este dispositivo')).toBeVisible();

    // 5. Desbloquear con contraseña y verificar que 99 cm se restauró desde IndexedDB cifrado
    await page.getByLabel('Contraseña', { exact: true }).fill('MiClaveReal2026!');
    await page.getByRole('button', { name: 'Desbloquear' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    await expect(page.getByLabel('Pecho', { exact: true })).toHaveValue('99');

    // 6. Bloquear y recuperar con la clave de recuperación + nueva contraseña
    await page.getByRole('button', { name: 'Bloquear bóveda' }).click();
    await page.getByRole('button', { name: /Usar clave de recuperación/i }).click();
    await page.getByLabel('Clave de recuperación').fill(recoveryKey);
    await page.getByLabel('Nueva contraseña').fill('NuevaClave2026!');
    await page.getByRole('button', { name: /Recuperar y desbloquear/i }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeVisible();
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    await expect(page.getByLabel('Pecho', { exact: true })).toHaveValue('99');
  });
});
