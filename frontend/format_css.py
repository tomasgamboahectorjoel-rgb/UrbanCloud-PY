"""Formatea styles.css sin cambiar declaraciones ni el orden de las reglas."""

import re
from pathlib import Path


def formatear(origen: str) -> str:
    lineas = []
    fragmento = []
    nivel = 0
    comilla = None
    parentesis = 0
    indice = 0

    def escribir(texto: str, declaracion: bool = False):
        texto = texto.strip()
        if not texto:
            return
        if declaracion:
            texto = re.sub(r"^([\w-]+):\s*", r"\1: ", texto)
        lineas.append("  " * nivel + texto)

    while indice < len(origen):
        letra = origen[indice]
        if comilla:
            fragmento.append(letra)
            if letra == comilla and (indice == 0 or origen[indice - 1] != "\\"):
                comilla = None
        elif origen.startswith("/*", indice):
            fin = origen.find("*/", indice + 2)
            if fin < 0:
                raise ValueError("Comentario CSS sin cerrar")
            comentario = origen[indice:fin + 2]
            if not "".join(fragmento).strip():
                fragmento.clear()
                escribir(comentario)
                lineas.append("")
            else:
                fragmento.append(comentario)
            indice = fin + 1
        elif letra in "\"'":
            comilla = letra
            fragmento.append(letra)
        elif letra == "(":
            parentesis += 1
            fragmento.append(letra)
        elif letra == ")":
            parentesis -= 1
            fragmento.append(letra)
        elif letra == "{" and parentesis == 0:
            escribir("".join(fragmento).strip() + " {")
            fragmento.clear()
            nivel += 1
        elif letra == ";" and parentesis == 0:
            escribir("".join(fragmento).strip() + ";", declaracion=True)
            fragmento.clear()
        elif letra == "}" and parentesis == 0:
            if "".join(fragmento).strip():
                escribir("".join(fragmento).strip() + ";", declaracion=True)
            fragmento.clear()
            nivel -= 1
            if nivel < 0:
                raise ValueError("Llaves CSS desbalanceadas")
            escribir("}")
            lineas.append("")
        else:
            fragmento.append(letra)
        indice += 1

    if nivel or comilla or parentesis:
        raise ValueError("CSS incompleto")
    escribir("".join(fragmento))
    return "\n".join(lineas).rstrip() + "\n"


if __name__ == "__main__":
    ruta = Path(__file__).resolve().parent / "src" / "styles.css"
    ruta.write_text(formatear(ruta.read_text(encoding="utf-8")), encoding="utf-8")
