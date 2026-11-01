import { createFileRoute } from "@tanstack/react-router";
import { Horse } from "@/components/Horse";
export const Route = createFileRoute("/zz-pose")({ component: () => (
  <div className="flex gap-16 p-24 bg-secondary">
    <Horse color="#e8a33d" anim="rocket" />
    <Horse color="#e8a33d" anim="surf" />
  </div>
) });
