import { AreaMessages } from "@/i18n/area";

/** Studio bölgesinin istemci çevirileri (kök kataloğa eklenir). */
export default function StudioAreaLayout({ children }: { children: React.ReactNode }) {
  return <AreaMessages area="studio">{children}</AreaMessages>;
}
