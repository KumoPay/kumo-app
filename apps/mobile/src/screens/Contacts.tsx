import { useState } from "react"
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { PrimaryCTA, SecondaryCTA } from "./atoms"
import { K } from "./theme"
import { addContact, deleteContact, useContacts, type Contact } from "./contacts-store"
import type { ScreenRenderer } from "./types"

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke="#94a3b8" strokeWidth={2} />
      <Path d="M20 20l-3.5-3.5" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke="#cbd5e1"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export const Contacts: ScreenRenderer = (ctx) => ({
  body: <ContactsBody ctx={ctx} />,
})

function ContactsBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const { contacts, refresh } = useContacts()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [pubkey, setPubkey] = useState("")
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState("")

  const visible = search.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.handle.toLowerCase().includes(search.toLowerCase()),
      )
    : contacts

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
          <Text style={styles.sub}>Choose who to pay. Long-press a row to delete.</Text>
        </View>
        <Pressable
          onPress={() => setAdding((v) => !v)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.addBtnText}>{adding ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <SearchIcon />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or handle"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
      </View>

      {adding && (
        <View style={styles.formCard}>
          <Text style={styles.formEyebrow}>New contact</Text>
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

      <View style={styles.list}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {contacts.length === 0
                ? "No contacts yet. Tap +Add to create one."
                : "No matches."}
            </Text>
          </View>
        ) : (
          visible.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => ctx.push("intent")}
              onLongPress={() => onLongPress(c)}
              style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.92 }]}
            >
              <View style={[styles.avatar, { backgroundColor: c.bg }]}>
                <Text style={styles.avatarText}>{c.initial}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  {c.handle} · {c.pubkey.slice(0, 4)}…{c.pubkey.slice(-4)}
                </Text>
              </View>
              <ChevronRight />
            </Pressable>
          ))
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  h1: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#1a1c3d",
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: K.cyan,
  },
  addBtnText: { fontSize: 13, fontWeight: "900", color: K.navy },
  searchBox: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: K.navy,
    fontWeight: "600",
    paddingVertical: 0,
  },
  formCard: {
    marginTop: 14,
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eef2f6",
  },
  formEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 4,
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
  list: { marginTop: 16, gap: 12 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef2f6",
  },
  emptyText: { color: K.navy55, fontSize: 13, fontWeight: "700" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "900", color: "#0f172a" },
  name: { fontSize: 15, fontWeight: "900", color: "#1a1c3d" },
  handle: { fontSize: 13, color: "#64748b", fontWeight: "700", marginTop: 2 },
})
