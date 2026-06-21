import { redirect } from "next/navigation";

export default function Home() {
  // La vérification de licence est gérée côté client par LicenseGate
  // Si pas de licence → redirect /activate
  // Si licence valide → redirect /dashboard
  redirect("/dashboard");
}
