import { notFound, redirect } from "next/navigation";
import { getPlayScript } from "@/lib/plays";
import EditShell from "@/components/play/EditShell";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ section?: string }>;
}

export default async function EditPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { section } = await searchParams;

  const data = await getPlayScript(id);
  if (!data) notFound();
  if (!data.canEdit) redirect(`/${locale}/app/plays/${id}`);

  return (
    <EditShell
      userPlayId={id}
      playTitle={data.title}
      initialAuthor={data.author ?? ""}
      initialText={data.scriptText}
      initialSection={section}
    />
  );
}
