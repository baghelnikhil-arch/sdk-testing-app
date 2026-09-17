import { permanentRedirect } from "next/navigation";

/** Catalogue management moved to /admin, which is where the rest of it lives. */
export default function IntegrationsRedirect() {
  permanentRedirect("/admin");
}
