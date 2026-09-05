import { SetupClient } from "@/components/game/SetupClient";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <SetupClient mode={mode === "online" ? "online" : "hotseat"} />;
}
