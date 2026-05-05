import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type DetailField = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  title: string;
  fields: DetailField[];
  onClose: () => void;
};

export function RecordDetailsModal({ visible, title, fields, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.card}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.headerTextWrap}>
              <Text style={s.kicker}>Details</Text>
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle}>{fields.length} fields</Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} accessibilityRole="button">
              <Text style={s.closeText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {fields.length === 0 ? (
              <Text style={s.empty}>No details available.</Text>
            ) : (
              fields.map((f) => (
                <View key={f.label} style={s.row}>
                  <Text style={s.label}>{f.label}</Text>
                  <Text style={s.value}>{f.value || "-"}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.2)" },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    maxHeight: "75%",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    marginTop: 10,
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366f1",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { marginTop: 2, fontSize: 18, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#64748b", fontWeight: "600" },
  closeBtn: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, backgroundColor: "rgba(148,163,184,0.14)" },
  closeText: { fontSize: 12, fontWeight: "800", color: "#334155" },
  body: { padding: 14, paddingBottom: 8 },
  row: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  label: { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.7 },
  value: { marginTop: 5, fontSize: 15, color: "#0f172a", fontWeight: "700" },
  empty: { fontSize: 14, color: "#64748b" },
});
