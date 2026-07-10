# DocROI Academic Control Center

Aplicacion privada en espanol para controlar actividad docente, programas, sesiones, documentos, evaluaciones, facturas, pagos, responsables, alertas y KPIs.

## Que incluye esta primera version

- Dashboard con KPIs clicables.
- Navegacion por modulos: instituciones, contactos, programas, sesiones, calendario, documentos, evaluaciones, finanzas, alertas y configuracion.
- CRUD funcional para los modulos principales.
- Fichas detalle con relaciones entre programa, sesiones, documentos y finanzas.
- Datos semilla ficticios para probar la aplicacion sin informacion sensible.
- Persistencia local en `localStorage`.
- Subida de documentos con guardado local del nombre y contenido codificado.
- Checklists academicos, administrativos, de sesion y evaluacion.
- Filtros por estado, tipo, institucion, programa, responsable y prioridad segun modulo.
- Busqueda global por texto.
- Dashboard financiero con previsto, cobrado, pendiente, vencido y precio medio por hora.
- Interfaz responsive para escritorio y movil.
- Estructura preparada para autenticacion, base de datos e integraciones futuras.

## Como ejecutar

```bash
npm start
```

Abre `http://localhost:3000`.

## Como probar

1. Entra en el dashboard y pulsa cualquier KPI, por ejemplo `Documentos pendientes` o `Ingresos pendientes`.
2. Crea una institucion desde el modulo `Instituciones`.
3. Crea un contacto academico y otro administrativo desde `Contactos`.
4. Crea un programa y asignale institucion, responsables, horas, precio y checklists.
5. Crea sesiones asociadas al programa.
6. Sube un documento y vinculalo a un programa o sesion.
7. Registra una evaluacion, una factura o un cobro.
8. Abre una ficha de programa para revisar sesiones, documentos y finanzas asociadas.
9. Usa `Restablecer demo` si quieres recuperar los datos semilla.

## Persistencia y privacidad

La app funciona en modo local. Los datos se guardan en el navegador mediante la clave:

```text
docroiAcademicControlCenter.v1
```

No hay datos reales incluidos. Los datos semilla son ficticios.

## Variables de entorno

Esta primera version no requiere variables de entorno.

## Arquitectura

- `index.html`: estructura base, navegacion, contenedores y modales.
- `styles.css`: sistema visual DocROI oscuro, responsive y orientado a control.
- `app.js`: modelo de datos, semilla, KPIs, CRUD, filtros, fichas, documentos y persistencia.
- `dev-server.cjs`: servidor local estatico.

## Mejoras futuras previstas

- Autenticacion real.
- Base de datos persistente.
- Importacion de calendarios.
- Recordatorios automaticos.
- Exportacion a PDF, Excel y CSV.
- Integracion con Google Calendar, Google Drive y Gmail.
- IA para preparar clases, resumir sesiones y detectar tareas pendientes.
- Modo multiusuario.
- Gestion avanzada de permisos y auditoria.
