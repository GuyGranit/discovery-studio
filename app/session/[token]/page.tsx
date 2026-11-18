import { SessionClient } from "@/components/SessionClient";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main>
      <SessionClient token={token} />
    </main>
  );
}
