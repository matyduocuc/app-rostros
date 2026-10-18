import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

// IP de tu PC en el WiFi (la API debe estar corriendo en el puerto 8000)
const API_URL = 'http://192.168.100.4:8000';
const TAM = 128;

export default function App() {
  const [apiOk, setApiOk] = useState(null);
  const [foto, setFoto] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(API_URL + '/')
      .then((r) => r.json())
      .then((d) => setApiOk('API conectada (' + d.clases + ' clases, umbral ' + d.umbral + ')'))
      .catch(() => setApiOk(null));
  }, []);

  async function enviar(uriOriginal) {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const ctx = ImageManipulator.manipulate(uriOriginal);
      ctx.resize({ width: TAM, height: TAM });
      const img = await ctx.renderAsync();
      const res = await img.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
      setFoto(res.uri);

      const form = new FormData();
      form.append('archivo', new File(res.uri));
      const resp = await fetch(API_URL + '/predecir/', { method: 'POST', body: form });
      if (!resp.ok) throw new Error('La API respondio ' + resp.status);
      setResultado(await resp.json());
    } catch (e) {
      setError('No se pudo conectar con la API: ' + e.message);
    } finally {
      setCargando(false);
    }
  }

  async function tomarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) { setError('Falta permiso de camara'); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled) enviar(r.assets[0].uri);
  }

  async function elegirGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { setError('Falta permiso de galeria'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled) enviar(r.assets[0].uri);
  }

  return (
    <ScrollView contentContainerStyle={s.contenedor}>
      <Text style={s.titulo}>Reconocimiento de rostros</Text>
      <Text style={[s.estado, { color: apiOk ? '#1b7f3b' : '#b3261e' }]}>
        {apiOk ? apiOk : 'API no disponible: revisa que este corriendo y el WiFi'}
      </Text>

      <View style={s.fila}>
        <TouchableOpacity style={s.boton} onPress={tomarFoto}>
          <Text style={s.botonTxt}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.boton, s.botonSec]} onPress={elegirGaleria}>
          <Text style={s.botonTxt}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {foto && <Image source={{ uri: foto }} style={s.foto} />}
      {foto && <Text style={s.chico}>Imagen enviada: {TAM}x{TAM}</Text>}
      {cargando && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {error && <Text style={s.error}>{error}</Text>}

      {resultado && (
        <View style={[s.tarjeta, { borderColor: resultado.encontrado ? '#1b7f3b' : '#b3261e' }]}>
          <Text style={s.resultado}>
            {resultado.encontrado ? resultado.clase_predicha : 'La persona no esta en la base de datos'}
          </Text>
          <Text style={s.chico}>Confianza: {(resultado.confianza * 100).toFixed(1)}%</Text>
          {resultado.top3 && resultado.top3.map((t, i) => (
            <Text key={i} style={s.chico}>{i + 1}. {t.nombre} ({(t.probabilidad * 100).toFixed(1)}%)</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenedor: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 70, backgroundColor: '#f6f7fb' },
  titulo: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  estado: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  fila: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  boton: { backgroundColor: '#2f6fed', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12 },
  botonSec: { backgroundColor: '#56627a' },
  botonTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
  foto: { width: 192, height: 192, borderRadius: 12 },
  chico: { fontSize: 13, color: '#444', marginTop: 4 },
  error: { color: '#b3261e', marginTop: 16, textAlign: 'center' },
  tarjeta: { marginTop: 20, padding: 18, borderWidth: 2, borderRadius: 14, backgroundColor: '#fff', width: '100%', alignItems: 'center' },
  resultado: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
});

