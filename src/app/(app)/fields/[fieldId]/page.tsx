export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">田地詳情</h1>
      <p className="mt-2 text-muted-foreground">田地 ID: {fieldId} — 即將完成</p>
    </div>
  );
}
