# Repositorio de PDFs a ingestar

Coloca aquí los archivos `.pdf` de las gacetas. Luego, con la pila en Docker corriendo:

```bash
docker compose exec server npm run import
```

El script:
- recorre esta carpeta (montada como `/import` en el contenedor),
- omite los PDFs ya importados (detecta duplicados por hash),
- cuenta las páginas de cada PDF,
- crea cada gaceta en estado **en_cola** con metadatos vacíos (el número se rellena con el nombre del archivo; el transcriptor puede editar número/fecha/tipo).

Para usar otra carpeta del host, define `IMPORT_DIR_HOST` en tu `.env` (p. ej. `IMPORT_DIR_HOST=/ruta/a/mi/repositorio`).
