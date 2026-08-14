import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export function generateStaticParams() {
  return ['zh-CN', 'ja', 'pt-BR', 'de', 'fr', 'es'].map(locale => ({ locale }));
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  redirect(`/${locale}/concepts/what-is-horus`);
}
