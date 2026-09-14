import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import messages from '../../messages/en.json';

interface RenderWithIntlOptions extends RenderOptions {
  locale?: string;
  messages?: Record<string, unknown>;
}

export function renderWithIntl(
  ui: ReactElement,
  {
    locale = 'en',
    messages: localeMessages = messages,
    ...options
  }: RenderWithIntlOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale={locale} messages={localeMessages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}
