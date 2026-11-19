import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  applyColorScheme,
  getResolvedScheme,
  getStoredScheme,
  subscribeColorSchemeSync,
  toggleColorScheme,
  type ColorScheme,
} from '../theme';
import { Button } from './Button';

export function ThemeToggle() {
  const [resolved, setResolved] = useState<ColorScheme>(() => getResolvedScheme());

  useEffect(() => {
    applyColorScheme(getStoredScheme());
    return subscribeColorSchemeSync((next) => setResolved(next));
  }, []);

  const handleToggle = () => {
    const result = toggleColorScheme();
    setResolved(result.resolved);
  };

  const label = resolved === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={label}
      title={label}
    >
      {resolved === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
