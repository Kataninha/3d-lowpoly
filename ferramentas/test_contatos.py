import json
import math
import sys
import unittest
from pathlib import Path

# Evidência exportada pela cena: uma medição por take e tempo de prova.
def validar(score, evidencias):
    erros = []
    if isinstance(score, dict):
        score = score.get("takes", [])
    if not isinstance(score, list) or not score:
        return ["partitura sem takes"]
    for take in score:
        move = str(take.get("ze", "")).strip().upper()
        if not move.startswith(("M01", "M02", "M03")):
            continue
        provas = take.get("prova", [])
        if not provas or not take.get("alvo"):
            erros.append(f"take {take.get('take')}: alvo ou provas ausentes"); continue
        for tempo in provas:
            found = [e for e in evidencias if e.get("take") == take.get("take") and e.get("tempo") == tempo and e.get("alvo") == take.get("alvo")]
            if len(found) != 1:
                erros.append(f"take {take.get('take')} tempo {tempo}: evidência ausente ou duplicada"); continue
            e = found[0]
            d = e.get("distancia")
            if not isinstance(d, (int, float)) or isinstance(d, bool) or not math.isfinite(d) or d < 0 or d > .02:
                erros.append(f"take {take.get('take')} tempo {tempo}: distância inválida ou > 0,02")
            if not isinstance(e.get("intersecoes"), list) or e["intersecoes"]:
                erros.append(f"take {take.get('take')} tempo {tempo}: colisões ou teste ausente")
            try:
                glove, box = e['luva'], e['box']
                lo, hi = box['min'], box['max']
                if any(len(v) != 3 for v in (glove, lo, hi)) or any(not math.isfinite(x) for v in (glove,lo,hi) for x in v):
                    raise ValueError('coordenadas invalidas')
                if any(a > b for a,b in zip(lo,hi)):
                    raise ValueError('Box3 invertida')
                if all(a < x < b for x,a,b in zip(glove,lo,hi)):
                    erros.append(f"take {take.get('take')} tempo {tempo}: luva dentro da Box3")
                distance = math.sqrt(sum((x-min(max(x,a),b))**2 for x,a,b in zip(glove,lo,hi)))
                if not isinstance(d, (int,float)) or abs(d-distance)>1e-6:
                    raise ValueError('distancia inconsistente')
            except (KeyError, TypeError, ValueError):
                erros.append(f"take {take.get('take')} tempo {tempo}: geometria ausente ou invalida")
    return erros

class ContatosTests(unittest.TestCase):
    def test_missing_and_collision(self):
        score = [{"take":1,"ze":"M02 girar", "alvo":"botao", "prova":[1]}]
        self.assertTrue(validar(score, []))
        proof = [{"take":1,"tempo":1,"alvo":"botao","distancia":.01,"intersecoes":[],
                  "luva":[1.01,0,0],"box":{"min":[-1,-1,-1],"max":[1,1,1]}}]
        self.assertFalse(validar(score, proof))
        proof[0]["intersecoes"] = ["braco"]
        self.assertTrue(validar(score, proof))
        proof[0].update(intersecoes=[], luva=[0,0,0], distancia=0)
        self.assertTrue(validar(score, proof))

    def test_fixture_exportada(self):
        path = Path(__file__).parent / 'fixtures' / 'contatos-three.json'
        fixture = json.loads(path.read_text(encoding='utf-8'))
        self.assertFalse(validar(fixture['partitura'], fixture['contatos']))
        self.assertEqual(len(fixture['contatos'][0]['luva']), 3)
        self.assertEqual(len(fixture['contatos'][0]['box']['min']), 3)

def main():
    try:
        root = Path(sys.argv[1])
        score = json.loads((root / "partitura.json").read_text(encoding="utf-8-sig"))
        evidence = json.loads((root / "contatos.json").read_text(encoding="utf-8-sig"))
        errors = validar(score, evidence)
    except (IndexError, OSError, ValueError, TypeError) as exc:
        print(f"FALHA evidências de contato: {exc}"); return 1
    print("FALHA contatos: " + "; ".join(errors) if errors else "PASS contatos")
    return int(bool(errors))

if __name__ == "__main__":
    sys.exit(main())
