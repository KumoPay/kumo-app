import { useState } from "react"
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Eyebrow, PrimaryCTA, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { addContact, deleteContact, useContacts, type Contact } from "./contacts-store"
import type { ScreenRenderer } from "./types"

export const Contacts: ScreenRenderer = () => ({
  body: <ContactsBody />,
})

function ContactsBody() {
  const { contacts, refresh } = useContacts()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [pubkey, setPubkey] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSave() {
    if (!name.trim() || !pubkey.trim()) return
    setBusy(true)
    try {
      await addContact({
        name: name.trim(),
        handle: `@${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        pubkey: pubkey.trim(),
      })
      setName("")
      setPubkey("")
      setAdding(false)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  function onLongPress(c: Contact) {
    Alert.alert(
      `Delete ${c.name}?`,
      `${c.handle} · ${c.pubkey.slice(0, 6)}…${c.pubkey.slice(-4)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteContact(c.id)
            await refresh()
          },
        },
      ],
    )
  }

  return (
    <View>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Contacts</Text>
          <Text style={styles.sub}>Long-press a row to delete.</Text>
        </View>
        <Pressable
          onPress={() => setAdding((v) => !v)}
          style={({ pressed }) => [styles.addBtn, SHADOW.pill, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.addBtnText}>{adding ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      {adding && (
        <View style={[styles.formCard, SHADOW.card]}>
          <Eyebrow>New contact</Eyebrow>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Dana)"
            placeholderTextColor={K.navy30}
            autoCapitalize="words"
            style={styles.input}
          />
          <TextInput
            value={pubkey}
            onChangeText={setPubkey}
            placeholder="Solana address"
            placeholderTextColor={K.navy30}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.inputMono]}
          />
          <View style={{ marginTop: 8, gap: 8 }}>
            <PrimaryCTA busy={busy} disabled={!name.trim() || !pubkey.trim()} onPress={onSave}>
              Save contact
            </PrimaryCTA>
            <SecondaryCTA onPress={() => setAdding(false)}>Cancel</SecondaryCTA>
          </View>
        </View>
      )}

      <View style={{ marginTop: 18 }}>
        <Eyebrow>Friends ({contacts.length})</Eyebrow>
        {contacts.length === 0 ? (
          <View style={[styles.empty, SHADOW.pill]}>
            <Text style={styles.emptyText}>No contacts yet. Add one above.</Text>
          </View>
        ) : (
          <View style={[styles.card, SHADOW.card]}>
            {contacts.map((c, i) => (
              <Pressable
                key={c.id}
                onLongPress={() => onLongPress(c)}
                style={({ pressed }) => [
                  styles.row,
                  i < contacts.length - 1 && styles.divider,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: c.bg }]}>
                  <Text style={styles.avatarText}>{c.initial}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    {c.handle} · {c.pubkey.slice(0, 4)}…{c.pubkey.slice(-4)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, color: K.navy },
  sub: { marginTop: 4, fontSize: 13, color: K.navy55 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: K.cyan },
  addBtnText: { fontSize: 13, fontWeight: "900", color: K.navy },
  formCard: {
    marginTop: 14,
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 14,
  },
  input: {
    marginTop: 8,
    backgroundColor: K.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: K.navy,
    borderWidth: 1.5,
    borderColor: K.navy10,
  },
  inputMono: { fontSize: 12 },
  card: { marginTop: 8, backgroundColor: K.white, borderRadius: 22, overflow: "hidden" },
  empty: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  emptyText: { color: K.navy55, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: K.divider },
  avatar: { width: 42, height: 42, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "900", color: K.navy },
  name: { fontSize: 15, fontWeight: "900", color: K.navy },
  handle: { fontSize: 12, color: K.navy55, fontWeight: "700", marginTop: 2 },
  chevron: { fontSize: 22, color: K.navy30, fontWeight: "700" },
})
