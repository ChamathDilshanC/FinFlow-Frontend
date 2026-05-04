import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { updateNotificationPreferences, type NotificationPreferences } from "../../../api/resources";
import { ApiError } from "../../../api/types";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";

export function NotificationsScreen() {
  const { state, accessToken, load } = useHomeData();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ ...state.preferences });
  }, [state.preferences]);

  const p = draft ?? state.preferences;

  return (
    <>
      <ScreenHeader menuKey="notifications" />
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Email reminders</Text>
          <Switch
            value={p.email_enabled}
            onValueChange={(v) => setDraft((prev) => ({ ...(prev ?? state.preferences), email_enabled: v }))}
          />
        </View>
        <Text style={styles.profileFieldLabel}>Days before renewal (0–90)</Text>
        <TextInput
          value={String(p.days_before_renewal)}
          onChangeText={(t) => {
            const n = Number.parseInt(t.replace(/\D/g, ""), 10);
            const days = Number.isNaN(n) ? 0 : Math.min(90, Math.max(0, n));
            setDraft((prev) => ({ ...(prev ?? state.preferences), days_before_renewal: days }));
          }}
          keyboardType="number-pad"
          style={styles.profileInput}
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.profileFieldLabel}>Timezone</Text>
        <TextInput
          value={p.timezone}
          onChangeText={(t) => setDraft((prev) => ({ ...(prev ?? state.preferences), timezone: t }))}
          style={styles.profileInput}
          placeholder="e.g. Asia/Colombo"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.profileSaveBtn, saving && { opacity: 0.6 }]}
          disabled={saving || !accessToken}
          onPress={async () => {
            if (!accessToken) return;
            const body = draft ?? state.preferences;
            setSaving(true);
            try {
              await updateNotificationPreferences(accessToken, {
                email_enabled: body.email_enabled,
                days_before_renewal: body.days_before_renewal,
                timezone: body.timezone.trim() || "UTC",
              });
              await load();
              Alert.alert("Saved", "Notification preferences updated.");
            } catch (e) {
              Alert.alert("Could not save", e instanceof ApiError ? e.message : "Request failed");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Text style={styles.profileSaveBtnText}>{saving ? "Saving…" : "Save preferences"}</Text>
        </Pressable>
      </GlassPanel>
    </>
  );
}
