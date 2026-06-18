import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ scene?: string }>;
}

export default async function SessionPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { scene } = await searchParams;
  const prefix = locale === "fr" ? "/fr" : "";
  const dest = `${prefix}/app/plays/${id}?tab=practice${scene ? `&scene=${scene}` : ""}`;
  redirect(dest);
}
