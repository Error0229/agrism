import { FieldDetailWrapper } from "@/components/field-editor/field-detail-wrapper";

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;

  return (
    <div className="h-full">
      <FieldDetailWrapper fieldId={fieldId} />
    </div>
  );
}
