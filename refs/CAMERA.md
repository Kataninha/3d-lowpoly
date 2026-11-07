# Direção de câmera

Guia próprio de direção de câmera. Os valores de QA abaixo são critérios de partida, não metas.

| Família | Use quando |
|---|---|
| EST | Situar o espectador no sistema completo |
| HUM | Dar escala humana a uma ação, reação ou consequência |
| TRK | Seguir um sujeito que se move pelo espaço, com espaço à frente |
| MEC | Manter um ciclo legível enquanto as peças se movem |
| DET | Identificar um componente local ou uma falha |
| SEC | Mostrar uma seção interna de um ângulo ou perfil claro |
| REL | Manter causa, ligação e efeito visíveis numa única vista |
| REV | Recuperar o sistema inteiro depois de um detalhe |

Decida primeiro a ação e o alvo. Use movimento de câmera só quando ele revela, acompanha ou esclarece algo. Um plano travado costuma ser o melhor para um mecanismo que se repete. Uma seção exige geometria real ou um plano de corte. Use cortes, tela dividida e comparações antes/depois como escolhas de edição. Mantenha legíveis as relações esquerda/direita e a escala entre os cortes.

Comece o QA com pelo menos 90% da caixa do alvo no quadro útil, margens laterais de 6–10% e espaço para legendas. Use três amostras em takes parados e cinco nos em movimento. Ajuste para recortes fechados intencionais, revelações atrasadas e posições de legenda validadas. Registre o motivo, teste a sequência e abra os quadros reais. Trate uma ação principal encoberta como falha até a vista mudar ou a revelação resolver.

Use `sceneRegistry` para atribuir IDs aos objetos reais. Em um plano de relação, inclua as duas peças e o elemento que as liga em `requiredVisibleIds`. Um perfil pode ser a vista de seção mais clara. Não existe ângulo universal, órbita obrigatória, aproximação mínima nem cadência fixa de cortes.
