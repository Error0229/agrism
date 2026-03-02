import { EditorLayout } from "@/components/field-editor/editor-layout";

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;

  return (
    <div className="h-[calc(100dvh-3.5rem)]">
      <EditorLayout fieldId={fieldId} />
    </div>
  );
}
