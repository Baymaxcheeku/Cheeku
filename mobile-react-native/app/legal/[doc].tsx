import { useLocalSearchParams } from "expo-router";
import { Cookie, FileText, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { DocumentBody } from "@/components/legal/document-body";
import { SettingsScreen } from "@/components/settings/chrome";
import { LEGAL_DOCUMENTS, type LegalKind } from "@/lib/legal/documents";
import { ink } from "@/theme/tokens";

const ICON: Record<LegalKind, LucideIcon> = {
  terms: ScrollText,
  privacy: ShieldCheck,
  health_consent: FileText,
  storage: Cookie,
};

const EYEBROW: Record<LegalKind, string> = {
  terms: "The agreement for using Cheeku AI",
  privacy: "What we collect, why, and your rights",
  health_consent: "What you agree to, use by use",
  storage: "What stays on your phone, and why",
};

/**
 * One legal document, full screen.
 *
 * Outside the signed-in shell on purpose: the sign-up form links here, and
 * somebody deciding whether to create an account must be able to read what
 * they would be agreeing to without having one.
 */
export default function LegalDocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = doc && doc in LEGAL_DOCUMENTS ? LEGAL_DOCUMENTS[doc as LegalKind] : null;

  if (!document) {
    return (
      <SettingsScreen title="Not found" eyebrow="That document does not exist" icon={FileText}>
        <View className="px-5 pt-6">
          <Text style={{ fontSize: 15, color: ink[500] }}>Open it again from Settings, Privacy.</Text>
        </View>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen title={document.title} eyebrow={EYEBROW[document.kind]} icon={ICON[document.kind]}>
      <View className="pt-5">
        <DocumentBody doc={document} />
      </View>
    </SettingsScreen>
  );
}
