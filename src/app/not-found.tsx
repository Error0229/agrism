import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground">找不到此頁面</p>
      <Button asChild variant="outline">
        <Link href="/">回到首頁</Link>
      </Button>
    </div>
  );
}
