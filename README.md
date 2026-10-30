# Mahanaim Draft — Torneo interno

Aplicación web React + Vite para sortear equipos de softball sin backend, sin base de datos y sin localStorage.

## Ejecutar en tu computadora

Necesitas Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre la dirección local que indique Vite (normalmente http://localhost:5173).

## Crear versión para producción

```bash
npm run build
```

El resultado se genera en `dist/`. Puedes subir el proyecto a Vercel (framework Vite, comando `npm run build`, directorio `dist`).

## Flujo del día del torneo

1. Entra a la URL principal **sin `#s=`** desde el dispositivo del organizador.
2. Verifica los jugadores; agrega, elimina o edita nombres y posiciones principales.
3. Introduce los dos capitanes elegidos por votación.
4. Pulsa **Realizar sorteo** y revisa los equipos.
5. Pulsa **Copiar enlace** o **Enviar por WhatsApp**. El enlace lleva `#s=...` y contiene el sorteo completo.
6. Cada jugador abre el enlace, elige su nombre y revela su equipo. El resultado siempre será el mismo para ese enlace.
7. Conserva el enlace: si cierras o actualizas el panel de administración antes de copiarlo, se pierde el sorteo en ese dispositivo.

## Consideraciones de transparencia y privacidad

- El sorteo utiliza `crypto.getRandomValues` para barajar y busca una distribución con poca diferencia entre las posiciones conocidas.
- **No** clasifica ni equilibra nivel de habilidad, solo posiciones. Cuantas más posiciones estén sin definir, menor capacidad de equilibrio.
- El algoritmo busca una buena distribución por muestreo, no garantiza la solución matemática global óptima.
- Con cantidad impar, el equipo rojo (primera columna) tiene un jugador adicional.
- El enlace incluye **todos los nombres y equipos**, codificados para transporte, **no cifrados**. Cualquiera con conocimientos técnicos puede leerlos, modificar el fragmento o crear otro enlace. No se debe considerar prueba criptográfica de autenticidad ni sistema de control de acceso.
- No hay cuentas ni permisos reales de organizador/capitán: quien entra a la URL principal puede preparar otro sorteo en su propio navegador, pero no cambia el enlace ya compartido.
- El enlace compartido no consulta servidor ni guarda datos en el navegador; el fragmento `#s=...` no se envía al servidor web como parte de la petición HTTP.
- WhatsApp y otros servicios donde compartas el enlace sí pueden conservar el contenido del mensaje.
- La pantalla de revelación no es secreta: cualquiera que tenga el enlace puede seleccionar cualquier nombre.

## Estructura

- `src/App.jsx`: interfaz y flujo.
- `src/draft.js`: validación, sorteo, codificación del enlace.
- `src/styles.css`: diseño responsive.
- `src/main.jsx`: arranque de React.


## Acceso por dos códigos (V3)
- Administrador y capitanes: `12345` por defecto, en la dirección principal.
- Jugadores: `222` por defecto, en el enlace compartido **después** del sorteo.
- Para cambiar los códigos, crea `.env` con `VITE_ADMIN_CODE=...` y `VITE_PLAYER_CODE=...` antes de compilar. En Vercel configura estas variables en Project Settings → Environment Variables y vuelve a desplegar.
- **Seguridad:** estos códigos se incluyen en el JavaScript público y NO son contraseñas seguras. El enlace de resultados incluye las alineaciones codificadas y una persona técnica puede extraerlas. La interfaz de jugadores no muestra las listas completas, pero para confidencialidad real hacen falta un servidor o enlaces individuales cifrados.
- El administrador debe conservar abierta su sesión en el navegador hasta publicar el enlace, porque no hay persistencia local ni servidor.
