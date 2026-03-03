import { EditorLayout } from "@/components/field-editor/editor-layout";

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;

  return (
    <div className="h-full">
      <EditorLayout fieldId={fieldId} />
    </div>
  );
}
