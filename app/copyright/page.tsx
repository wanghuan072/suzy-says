import LegalPage from "@/page/legal/LegalPage";
import { metadataFor } from "@/lib/seo";
import { tdk } from "@/seo/tdk";
export const metadata = metadataFor(tdk.copyright, "/copyright");
export default function Page() {
  return <LegalPage id="copyright" />;
}
