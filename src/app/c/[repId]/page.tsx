import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ repId: string }>;
}

export default async function ShortChatRedirect({ params }: PageProps) {
  const { repId } = await params;
  redirect(`/chat/new?repId=${repId}`);
}
