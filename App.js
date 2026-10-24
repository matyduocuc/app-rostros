import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tamano que exige el encargo: 128x128 pixeles, 3 canales (RGB)
const TAM = 128;
const CLAVE_IP = 'ip_api';
const IP_POR_DEFECTO = '192.168.100.4';
const TIMEOUT_MS = 20000;

// Arma la URL de la API a partir de lo que escribe el usuario (IP o IP:puerto)
function construirUrl(texto) {
  const limpio = texto.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return 'http://' + (limpio.includes(':') ? limpio : limpio + ':8000');
}

// fetch con tiempo maximo de espera, para no quedar colgado si la API no responde
async function pedir(url, opciones, ms = TIMEOUT_MS) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: control.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

export default function App() {
  const [ip, setIp] = useState(IP_POR_DEFECTO);
  const [estadoApi, setEstadoApi] = useState({ ok: null, texto: 'Comprobando conexion...' });
  const [foto, setFoto] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Pregunta a la API si esta viva (GET /)
  async function comprobarApi(texto) {
    setEstadoApi({ ok: null, texto: 'Comprobando conexion...' });
    try {
      const respuesta = await pedir(construirUrl(texto) + '/', {}, 6000);
      const datos = await respuesta.json();
      setEstadoApi({ ok: true, texto: 'API conectada (' + datos.clases + ' clases, umbral ' + datos.umbral + ')' });
    } catch (e) {
      setEstadoApi({ ok: false, texto: 'API no disponible: revisa la IP, que la API este corriendo y el WiFi' });
    }
  }

  // Al abrir la app, recupera la ultima IP guardada
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_IP)
      .then((guardada) => {
        const inicial = guardada || IP_POR_DEFECTO;
        setIp(inicial);
        comprobarApi(inicial);
      })
      .catch(() => comprobarApi(IP_POR_DEFECTO));
  }, []);

  async function guardarIp() {
    try { await AsyncStorage.setItem(CLAVE_IP, ip.trim()); } catch (e) {}
    comprobarApi(ip);
  }

  // Flujo principal: reducir a 128x128, enviar a la API y mostrar el resultado
  async function enviar(uriOriginal) {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const contexto = ImageManipulator.manipulate(uriOriginal);
      contexto.resize({ width: TAM, height: TAM });
      const imagen = await contexto.renderAsync();
      const reducida = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
      setFoto(reducida.uri);

      const formulario = new FormData();
      formulario.append('archivo', new File(reducida.uri));
      const respuesta = await pedir(construirUrl(ip) + '/predecir/', { method: 'POST', body: formulario });

      if (!respuesta.ok) {
        let detalle = '';
        try { detalle = (await respuesta.json()).detail; } catch (e) {}
        throw new Error(detalle || 'La API respondio con codigo ' + respuesta.status);
      }
      setResultado(await respuesta.json());
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('La API tardo demasiado en responder. Revisa la IP y el WiFi.');
      } else {
        setError('No se pudo obtener la prediccion: ' + e.message);
      }
    } finally {
      setCargando(false);
    }
  }

  async function tomarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) { setError('Falta el permiso de camara'); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled) enviar(r.assets[0].uri);
  }

  async function elegirGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { setError('Falta el permiso de galeria'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled) enviar(r.assets[0].uri);
  }

  const colorEstado = estadoApi.ok === true ? '#1b7f3b' : estadoApi.ok === false ? '#b3261e' : '#555555';

  return (
    <ScrollView contentContainerStyle={s.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={s.titulo}>Reconocimiento de rostros</Text>
      <Text style={[s.estado, { color: colorEstado }]}>{estadoApi.texto}</Text>

      <View style={s.filaIp}>
        <TextInput style={s.campoIp} value={ip} onChangeText={setIp} placeholder="IP de la API (ej: 192.168.1.20)" autoCapitalize="none" />
        <TouchableOpacity style={s.botonIp} onPress={guardarIp}>
          <Text style={s.botonTxt}>Probar</Text>
        </TouchableOpacity>
      </View>

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
  estado: { fontSize: 13, marginBottom: 14, textAlign: 'center' },
  filaIp: { flexDirection: 'row', gap: 8, marginBottom: 18, width: '100%' },
  campoIp: { flex: 1, borderWidth: 1, borderColor: '#b8bfd0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  botonIp: { backgroundColor: '#56627a', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  fila: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  boton: { backgroundColor: '#2f6fed', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12 },
  botonSec: { backgroundColor: '#56627a' },
  botonTxt: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  foto: { width: 192, height: 192, borderRadius: 12 },
  chico: { fontSize: 13, color: '#444444', marginTop: 4 },
  error: { color: '#b3261e', marginTop: 16, textAlign: 'center' },
  tarjeta: { marginTop: 20, padding: 18, borderWidth: 2, borderRadius: 14, backgroundColor: '#ffffff', width: '100%', alignItems: 'center' },
  resultado: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
});