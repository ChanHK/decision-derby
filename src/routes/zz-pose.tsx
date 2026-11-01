import { createFileRoute } from "@tanstack/react-router";
import { Horse } from "@/components/Horse";
export const Route = createFileRoute("/zz-pose")({ component: () => (<div style={{ padding: 80, display: "flex", gap: 40, background: "#9c6" }}><Horse color="#d9a066" anim="biped" /><Horse color="#d9a066" anim="gallop" /></div>) });
