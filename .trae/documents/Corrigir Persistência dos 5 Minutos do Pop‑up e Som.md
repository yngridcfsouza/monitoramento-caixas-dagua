## Diagnóstico
- O estado `popupDismissed` é resetado quando `danger` fica falso, reabrindo o pop-up antes de 5 minutos.
- Timers de 5 minutos são limpos quando `danger.length === 0`, o que cancela o período de silêncio/fechamento e permite retorno antecipado ao reaparecer o alarme.
- O áudio é parado ao sair do estado de perigo, mas a lógica atual também favorece reativação precoce por conta da redefinição de estados.

## Correções Propostas
1. Manter estado de silêncio/fechamento durante 5 minutos independentemente de flutuações do alarme:
   - Remover `setPopupDismissed(false)` dentro do efeito que trata `!hasDanger`.
   - Não limpar `muteTimerRef` e `dismissTimerRef` quando `danger.length` vai a zero; deixar o `setTimeout` expirar naturalmente e só reativar som/pop-up se ainda houver alarme.
2. Consolidar controle baseado em `setTimeout`:
   - Continuar registrando `muteUntilRef` e `dismissUntilRef` ao clicar em “Silenciar”/“Fechar”.
   - Nos callbacks de `setTimeout`, verificar `dangerActiveRef.current` antes de reativar (`setMuted(false)`/`setPopupDismissed(false)`).
3. Garantir que o áudio só inicia quando permitido:
   - Condição para iniciar som: `danger.length > 0 && !muted && !popupDismissed`.
   - Ao sair de perigo, apenas `stopAudio()`; não alterar `muted`/`popupDismissed`.

## Mudanças de Código
- Arquivo: `hmi-frontend/src/App.tsx`
  - Efeito de perigo: remover reset de `popupDismissed` ao sair de perigo.
  - Efeito que limpava timers ao `danger.length === 0`: remover.
  - Manter botões “Silenciar/Fechar” com `setTimeout` e refs `muteUntilRef`/`dismissUntilRef` (já implementados), sem reativação antes do prazo.

## Validação
- Build de produção (`npm run build`).
- Simular cenários:
  - Ativar alarme, “Fechar”/“Silenciar”, flutuar `danger` (vai a 0 e volta) antes de 5 min: pop-up/som não retornam.
  - Após 5 min, com alarme persistente: pop-up/som retornam.
- Inspeção console: logar `danger.length`, `muted`, `popupDismissed`, `muteUntilRef`, `dismissUntilRef` durante testes.

## Observação
- Caso deseje que o silêncio/fechamento seja cancelado quando o perigo cessar por 5 minutos contínuos, podemos adicionar lógica futura para expirar os timers nesse cenário. Atualmente manteremos o período de 5 minutos absoluto conforme solicitado.