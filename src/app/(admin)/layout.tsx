import { AreaMessages } from "@/i18n/area";

/** Admin bölgesinin istemci çevirileri (kök kataloğa eklenir). */
export default function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  return <AreaMessages area="admin">{children}</AreaMessages>;
}
