import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { patchProfile } from "../../../api/profile";
import { ApiError } from "../../../api/types";
import { fmtShortDate } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { displayNameFromEmail } from "../utils";

export function ProfileScreen() {
  const { state, accessToken, load, accountAvatar } = useHomeData();
  const { profile } = state;
  const [currencyEdit, setCurrencyEdit] = useState("");
  const [budgetEdit, setBudgetEdit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrencyEdit(profile.default_currency ?? "");
    setBudgetEdit(profile.monthly_budget ?? "");
  }, [profile.default_currency, profile.monthly_budget]);

  return (
    <>
      <ScreenHeader menuKey="profile" />
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.profileCardInner}>
        <Image source={{ uri: accountAvatar }} style={styles.profileCardAvatar} accessibilityIgnoresInvertColors />
        <View style={styles.profileCardCol}>
          <Text style={styles.profileCardName}>{displayNameFromEmail(profile.email)}</Text>
          <Text style={styles.profileCardEmail}>{profile.email}</Text>
          <View style={styles.profileDivider} />
          <Text style={styles.profileFieldLabel}>Default currency (ISO, blank to clear)</Text>
          <TextInput
            value={currencyEdit}
            onChangeText={setCurrencyEdit}
            style={styles.profileInput}
            maxLength={3}
            autoCapitalize="characters"
            placeholder="USD"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.profileFieldLabel}>Monthly budget (blank to clear)</Text>
          <TextInput
            value={budgetEdit}
            onChangeText={setBudgetEdit}
            style={styles.profileInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.dataRowFine}>Member since {fmtShortDate(profile.created_at)}</Text>
          <Pressable
            style={[styles.profileSaveBtn, saving && { opacity: 0.6 }]}
            disabled={saving || !accessToken}
            onPress={async () => {
              if (!accessToken) return;
              setSaving(true);
              try {
                const cur = currencyEdit.trim().toUpperCase();
                const bud = budgetEdit.trim();
                await patchProfile(accessToken, {
                  default_currency: cur.length === 3 ? cur : null,
                  monthly_budget: bud === "" ? null : bud,
                });
                await load();
                Alert.alert("Saved", "Profile updated.");
              } catch (e) {
                Alert.alert("Could not save", e instanceof ApiError ? e.message : "Request failed");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Text style={styles.profileSaveBtnText}>{saving ? "Saving…" : "Save profile"}</Text>
          </Pressable>
        </View>
      </GlassPanel>
    </>
  );
}
