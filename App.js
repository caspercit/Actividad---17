import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Keyboard, Linking, Platform,
  Pressable, RefreshControl, SafeAreaView, StatusBar, StyleSheet,
  Text, TextInput, View,
} from 'react-native';

const { searchBooks } = require('./src/api/openLibrary');

const COLORS = {
  background: '#F8F7F3', paper: '#FFFFFF', navy: '#182A2B', green: '#164C42',
  accent: '#B97A4B', muted: '#77827F', border: '#E7E9E3', pale: '#ECF3EF',
  danger: '#963B35', dangerBg: '#FFF1ED',
};
const SUGGESTIONS = [
  { label: 'Clásicos', query: 'Don Quijote de la Mancha' },
  { label: 'Fantasía', query: 'Harry Potter' },
  { label: 'Ciencia', query: 'Stephen Hawking' },
];

function BookCard({ book }) {
  const [imageFailed, setImageFailed] = useState(false);
  async function openDetails() {
    if (!book.detailsUrl) return;
    try { await Linking.openURL(book.detailsUrl); } catch (_) { /* URL externa opcional */ }
  }

  return (
    <View style={styles.card}>
      {book.coverUrl && !imageFailed ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={styles.bookCover}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.bookCover, styles.emptyCover]}>
          <Text style={styles.emptyCoverIcon}>✦</Text>
          <Text style={styles.emptyCoverText}>SIN PORTADA</Text>
        </View>
      )}
      <View style={styles.bookDetails}>
        <Text style={styles.bookTitle} numberOfLines={3}>{book.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={2}>{book.author}</Text>
        <View style={styles.metaRow}>
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>Año: {book.year}</Text>
          </View>
        </View>
        <Text style={styles.editionsText}>
          {book.editions === null ? 'Ediciones: no disponibles' : `${book.editions} edición(es) registradas`}
        </Text>
        {book.detailsUrl ? (
          <Pressable onPress={openDetails} accessibilityRole="link" accessibilityLabel={`Ver detalle de ${book.title}`}>
            <Text style={styles.detailsLink}>Ver en Open Library  ↗</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  const [query, setQuery] = useState('El principito');
  const [lastQuery, setLastQuery] = useState('El principito');
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const controllerRef = useRef(null);
  const sequenceRef = useRef(0);

  async function loadBooks(text, refresh = false) {
    Keyboard.dismiss();
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    setError('');
    if (refresh) setRefreshing(true);
    else { setLoading(true); setBooks([]); setTotal(0); }

    try {
      const results = await searchBooks(text, { signal: controller.signal, forceRefresh: refresh });
      if (sequence !== sequenceRef.current) return;
      setBooks(results.items);
      setTotal(results.total);
      setLastQuery(results.query);
      setSearched(true);
    } catch (err) {
      if (sequence !== sequenceRef.current || err.code === 'ABORTED') return;
      setBooks([]);
      setTotal(0);
      setSearched(true);
      setError(err.message || 'No se pudo realizar la búsqueda.');
    } finally {
      if (sequence === sequenceRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadBooks('El principito');
    return () => controllerRef.current?.abort();
  }, []);

  async function openAttribution() {
    try { await Linking.openURL('https://openlibrary.org/'); } catch (_) { /* Enlace informativo */ }
  }

  const listHeader = (
    <View>
      <View style={styles.navBar}>
        <View style={styles.brandIcon}><Text style={styles.brandIconText}>L</Text></View>
        <View style={styles.brandTextWrapper}>
          <Text style={styles.brand}>LIBROVISTA</Text>
          <Text style={styles.brandSubtitle}>BIBLIOTECA DIGITAL</Text>
        </View>
        <View style={styles.onlinePill}><View style={styles.onlineDot} /><Text style={styles.onlineText}>API EXTERNA</Text></View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.overline}>DESCUBRE TU PRÓXIMA LECTURA</Text>
        <Text style={styles.heroTitle}>Un universo de{'\n'}<Text style={styles.heroAccent}>libros.</Text></Text>
        <Text style={styles.heroSubtitle}>Busca por título o autor y explora información bibliográfica de Open Library.</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          placeholder="Título del libro o autor"
          placeholderTextColor="#89918D"
          maxLength={90}
          autoCapitalize="sentences"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => loadBooks(query)}
          accessibilityLabel="Buscar título o autor"
        />
      </View>
      <Pressable
        onPress={() => loadBooks(query)}
        style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Consultar libros"
      >
        <Text style={styles.searchButtonText}>Buscar libros</Text>
        <Text style={styles.searchArrow}>→</Text>
      </Pressable>

      <Text style={styles.suggestionsLabel}>EXPLORAR TEMAS</Text>
      <View style={styles.suggestionsRow}>
        {SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion.label}
            onPress={() => { setQuery(suggestion.query); loadBooks(suggestion.query); }}
            style={styles.chip}
            accessibilityRole="button"
          >
            <Text style={styles.chipText}>{suggestion.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionOverline}>RESULTADOS DE CONSULTA</Text>
          <Text style={styles.sectionTitle}>Tu selección</Text>
        </View>
        <View style={styles.resultCount}><Text style={styles.resultCountText}>{total.toLocaleString('es-MX')} resultados</Text></View>
      </View>
      {searched && !loading && !error ? (
        <Text style={styles.searchSummary}>Búsqueda: «{lastQuery}». Se muestran hasta 12 coincidencias.</Text>
      ) : null}
      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>No se pudo completar la consulta</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable onPress={() => loadBooks(query, true)} accessibilityRole="button">
            <Text style={styles.retryLink}>Volver a intentar →</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const listFooter = (
    <View style={styles.footer}>
      <View style={styles.footerLine} />
      <Text style={styles.footerTag}>LECTURA · CONOCIMIENTO · DESCUBRIMIENTO</Text>
      <Pressable onPress={openAttribution} accessibilityRole="link">
        <Text style={styles.footerCredit}>Datos y portadas: Open Library ↗</Text>
      </Pressable>
      <Text style={styles.footerSub}>Proyecto académico · Actividad 17 · Sin base de datos propia</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookCard book={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.green} />
            <Text style={styles.emptyStateText}>Consultando Open Library…</Text>
          </View>
        ) : !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>▤</Text>
            <Text style={styles.emptyTitle}>No encontramos coincidencias</Text>
            <Text style={styles.emptyStateText}>Prueba otro título, autor o palabra clave.</Text>
          </View>
        ) : null}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBooks(lastQuery, true)} tintColor={COLORS.green} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  listContent: { paddingHorizontal: 22, paddingBottom: 25 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 19, marginBottom: 27 },
  brandIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  brandIconText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  brandTextWrapper: { flex: 1 },
  brand: { fontSize: 15, fontWeight: '900', color: COLORS.navy, letterSpacing: 2.1 },
  brandSubtitle: { fontSize: 9, fontWeight: '700', color: COLORS.muted, letterSpacing: 2.2, marginTop: 2 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pale, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green, marginRight: 5 },
  onlineText: { color: COLORS.green, fontSize: 8, letterSpacing: 0.5, fontWeight: '900' },
  hero: { paddingTop: 5, paddingBottom: 23 },
  overline: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 10 },
  heroTitle: { fontSize: 43, lineHeight: 48, fontWeight: '900', color: COLORS.navy, letterSpacing: -1.7 },
  heroAccent: { color: COLORS.green, fontStyle: 'italic' },
  heroSubtitle: { color: '#667572', fontSize: 14, lineHeight: 22, maxWidth: 340, marginTop: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, height: 55, paddingHorizontal: 14 },
  searchIcon: { color: COLORS.green, fontSize: 30, marginRight: 8, marginTop: -5 },
  searchInput: { flex: 1, color: COLORS.navy, fontSize: 15, height: '100%' },
  searchButton: { marginTop: 10, backgroundColor: COLORS.green, borderRadius: 14, height: 53, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.82 },
  searchButtonText: { color: 'white', fontSize: 15, fontWeight: '800' },
  searchArrow: { color: 'white', fontSize: 24, marginTop: -3 },
  suggestionsLabel: { color: COLORS.muted, fontWeight: '900', letterSpacing: 1.7, fontSize: 10, marginTop: 24, marginBottom: 11 },
  suggestionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#EFEFEA', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 10 },
  chipText: { color: '#445651', fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 34, marginBottom: 15 },
  sectionOverline: { color: COLORS.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  sectionTitle: { color: COLORS.navy, fontWeight: '900', fontSize: 25, letterSpacing: -0.5 },
  resultCount: { backgroundColor: COLORS.pale, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 9 },
  resultCountText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  searchSummary: { color: COLORS.muted, fontSize: 12, marginBottom: 11 },
  card: { flexDirection: 'row', backgroundColor: COLORS.paper, borderColor: COLORS.border, borderWidth: 1, borderRadius: 17, padding: 11, marginBottom: 12, minHeight: 165 },
  bookCover: { width: 99, height: 142, borderRadius: 9, backgroundColor: '#DADBD3' },
  emptyCover: { backgroundColor: '#E6E9E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  emptyCoverIcon: { fontSize: 30, color: COLORS.green },
  emptyCoverText: { color: COLORS.green, fontSize: 9, marginTop: 8, textAlign: 'center', letterSpacing: 1, fontWeight: '900' },
  bookDetails: { flex: 1, paddingLeft: 13, paddingRight: 3, justifyContent: 'center' },
  bookTitle: { color: COLORS.navy, fontSize: 15, lineHeight: 21, fontWeight: '900' },
  bookAuthor: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 5, marginBottom: 9 },
  metaRow: { flexDirection: 'row', marginBottom: 6 },
  yearBadge: { backgroundColor: COLORS.pale, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 7 },
  yearText: { color: COLORS.green, fontWeight: '800', fontSize: 10 },
  editionsText: { color: '#7A8881', fontSize: 10, marginBottom: 9 },
  detailsLink: { color: COLORS.green, fontWeight: '900', fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, paddingHorizontal: 16 },
  emptyIcon: { fontSize: 46, color: COLORS.green, marginBottom: 7 },
  emptyTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  emptyStateText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  errorPanel: { borderRadius: 13, borderWidth: 1, borderColor: '#E8C6BF', backgroundColor: COLORS.dangerBg, marginBottom: 14, padding: 13 },
  errorTitle: { fontWeight: '900', color: COLORS.danger, marginBottom: 6, fontSize: 14 },
  errorMessage: { color: COLORS.danger, fontSize: 12, lineHeight: 19 },
  retryLink: { color: COLORS.danger, fontWeight: '900', fontSize: 12, marginTop: 11 },
  footer: { alignItems: 'center', paddingVertical: 31 },
  footerLine: { height: 1, width: '100%', backgroundColor: COLORS.border, marginBottom: 23 },
  footerTag: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, textAlign: 'center' },
  footerCredit: { color: COLORS.green, fontSize: 12, fontWeight: '800', marginTop: 13 },
  footerSub: { color: COLORS.muted, fontSize: 10, marginTop: 10, textAlign: 'center' },
});
