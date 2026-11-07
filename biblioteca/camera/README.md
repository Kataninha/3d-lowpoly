# Planejamento de câmera

Use `sceneRegistry({idEstavel: object3D})` e depois `planCandidates(take, registry, updateAt)`. Um take contém `start`, `end`, `shotType`, `subjectId` e, opcionalmente, `relatedIds` e `requiredVisibleIds`. Preencha esses campos a partir da partitura, usando `t0` e `t1` para os tempos. Informe uma atualização da cena em tempo absoluto e, quando houver, uma lista de possíveis oclusores.

Os candidatos ajustam os limites amostrados dos objetos a um quadro com margem para legenda. Os diagnósticos de raio central indicam possível oclusão. Revise quadros reais, escolha A, B ou C para cada take e salve `selectedCamera(takes, candidates, selection)` como camera.json. Passe esses dados ao modelo de montagem. Para testar uma pose específica direto, use `applyPose(camera, samplePose(candidate.samples, time))`.

O planejador propõe o enquadramento. Geometria de corte, movimento, iluminação da cena, continuidade e posição dos rótulos exigem direção autoral e revisão visual.
