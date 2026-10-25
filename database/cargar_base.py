"""Crea la base de datos local y carga el esquema, los catálogos y los datos de prueba.

Uso (desde la raíz del proyecto, con el entorno virtual del backend activo):

    python database/cargar_base.py                 # usa DATABASE_URL de backend/.env
    python database/cargar_base.py --sin-datos     # sin los datos de prueba (03)

Si DATABASE_URL no está definida usa la del archivo backend/.env.example. El script
se detiene si la base ya tiene tablas, para no modificar una base con datos reales.
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

RAIZ = Path(__file__).resolve().parent
BACKEND = RAIZ.parent / "backend"
SCRIPTS = ["01_esquema.sql", "02_catalogos.sql", "03_datos_prueba_sinteticos.sql"]


def leer_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    for nombre in (".env", ".env.example"):
        archivo = BACKEND / nombre
        if archivo.exists():
            for linea in archivo.read_text(encoding="utf-8").splitlines():
                if linea.startswith("DATABASE_URL="):
                    return linea.split("=", 1)[1].strip()
    sys.exit("No se encontró DATABASE_URL en el entorno ni en backend/.env.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sin-datos", action="store_true", help="omite 03_datos_prueba_sinteticos.sql")
    args = parser.parse_args()

    url = leer_url().replace("postgresql+psycopg://", "postgresql://", 1)
    datos = conninfo_to_dict(url)
    base = datos.get("dbname") or "urbancloud_ai"
    if datos.get("host") not in (None, "localhost", "127.0.0.1", "::1"):
        sys.exit(f"DATABASE_URL apunta a '{datos.get('host')}', que no es local. Este script solo crea bases locales.")

    admin = make_conninfo(url, dbname="postgres")
    with psycopg.connect(admin, autocommit=True) as conexion:
        existe = conexion.execute("SELECT 1 FROM pg_database WHERE datname = %s", (base,)).fetchone()
        if not existe:
            conexion.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(base)))
            print(f"Base '{base}' creada.")

    with psycopg.connect(make_conninfo(url, dbname=base), autocommit=True) as conexion:
        tablas = conexion.execute(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'").fetchone()[0]
        if tablas:
            sys.exit(f"La base '{base}' ya tiene {tablas} tablas; no se modifica. Usa una base vacía.")
        for nombre in SCRIPTS[:2] if args.sin_datos else SCRIPTS:
            conexion.execute((RAIZ / nombre).read_text(encoding="utf-8"))
            print(f"{nombre}: listo")
        resumen = conexion.execute(
            "SELECT (SELECT count(*) FROM roles), (SELECT count(*) FROM usuarios), "
            "(SELECT count(*) FROM incidencias)").fetchone()
    print(f"Base lista: {resumen[0]} roles, {resumen[1]} usuarios, {resumen[2]} incidencias.")


if __name__ == "__main__":
    main()
