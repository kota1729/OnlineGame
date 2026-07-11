// GameRegistryにチンチ口の機能と表示パーツをすべて登録
// ルール: 毎ターン固定数のサイコロを振り、全部「1」の目が出たら即優勝。
//        1以外が混ざっていたら、サイコロの数はそのまま次の人に交代。

// このゲーム専用のスタイルを一度だけ<head>に注入する
// （※ .chinchiro-die 等、他ゲームと共有するクラス名は絶対に使わない。
//    クラス名が被ると本家チンチロの表示まで壊れてしまうため、
//    ここではすべて .chinchiguti- プレフィックスで独自定義する）
if (typeof document !== 'undefined' && !document.getElementById('chinchiguti-custom-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'chinchiguti-custom-styles';
    styleEl.innerHTML = `
        .chinchiguti-board { display: none; flex-direction: column; gap: 10px; min-width: 0; }
        .chinchiguti-board.active { display: flex; }

        .chinchiguti-config-box { display:flex; align-items:center; gap:10px; justify-content:center; flex-wrap:wrap; background:#0b0d16; border-radius:8px; padding:8px 10px; font-size:0.82rem; }
        .chinchiguti-config-box select { background:#15151e; color:#fff; border:1px solid var(--accent-color); border-radius:6px; padding:4px 8px; font-size:0.82rem; }

        .chinchiguti-stage { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 22px 10px; }
        .chinchiguti-dice-container { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:10px; min-height:56px; }
        .chinchiguti-die { width:48px; height:48px; background:#fdfdfd; color:#111; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; box-shadow:0 4px 8px rgba(0,0,0,0.6); border:3px solid var(--border-color); transition:border-color .15s ease, box-shadow .15s ease; }
        .chinchiguti-die.rolling { border-color: var(--accent-color); animation: chinchiguti-shake .15s infinite alternate; }
        .chinchiguti-die.win { border-color:#ffd54f; box-shadow:0 0 14px rgba(255,213,79,0.9); }
        @keyframes chinchiguti-shake { 0%{ transform:translate(1px,1px) rotate(-4deg); } 100%{ transform:translate(-1px,-1px) rotate(4deg); } }

        .chinchiguti-scoreboard { display:flex; flex-direction:column; gap:6px; }
        .chinchiguti-score-row { display:flex; justify-content:space-between; align-items:center; background:#0b0d16; border-radius:8px; padding:8px 10px; border-left:4px solid #555; font-size:0.8rem; gap:8px; flex-wrap:wrap; }
        .chinchiguti-score-row.active-turn { border-left-color:#ffaa00; background: rgba(255,170,0,0.1); }
        .chinchiguti-score-row.finished { border-left-color: var(--success-color); }
        .chinchiguti-rank-num { font-weight:900; color:#ffd54f; min-width:30px; }
    `;
    document.head.appendChild(styleEl);
}

GameRegistry.chinchiguti = {
    template: `
        <div class="chinchiguti-board" id="chinchiguti-board-area">
            <div class="spectator-banner" id="chinchiguti-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <div class="winner-overlay" id="chinchiguti-winner-overlay" style="display:none;">
                <div class="winner-trophy">🏆</div>
                <div class="winner-name" id="chinchiguti-winner-name">優勝！</div>
                <div class="winner-card-info" id="chinchiguti-winner-hand">役: -</div>
                <div id="chinchiguti-final-ranking" style="margin-top:14px; width:100%; display:flex; flex-direction:column; gap:6px;"></div>
                <button class="btn btn-success" style="margin-top:14px;" onclick="GameRegistry.chinchiguti.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="chinchiguti-playing-area">
                <div class="direction-indicator" id="chinchiguti-turn-indicator">現在の番: -</div>

                <div class="chinchiguti-config-box" id="chinchiguti-config-box" style="display:none;">
                    <span>🎲 サイコロの数:</span>
                    <select id="chinchiguti-dice-select" onchange="GameRegistry.chinchiguti.changeDiceCount(this.value)">
                        <option value="3">3個 (通常)</option>
                        <option value="4">4個</option>
                        <option value="5">5個</option>
                        <option value="6">6個</option>
                        <option value="8">8個</option>
                        <option value="10">10個</option>
                    </select>
                </div>

                <div class="chinchiguti-stage">
                    <div class="chinchiguti-dice-container" id="chinchiguti-dice-container"></div>
                </div>
                <div style="text-align:center; font-size:0.85rem; color:var(--accent-color); font-weight:bold; min-height:1.2em;" id="chinchiguti-current-hand-label"></div>

                <div class="action-container">
                    <button class="btn btn-success" id="btn-chinchiguti-roll" onclick="GameRegistry.chinchiguti.rollDice()" disabled>🎲 サイコロを振る</button>
                </div>

                <div class="hand-section" style="margin-top:10px;">
                    <div class="hand-title"><span>プレイヤー状況</span></div>
                    <div class="chinchiguti-scoreboard" id="chinchiguti-scoreboard"></div>
                </div>

                <details class="chinchiro-rules">
                    <summary>📖 チンチ口のルールを見る</summary>
                    <div class="rules-body">
                        <h4>遊び方</h4>
                        <ol>
                            <li>開始前に、ホストがサイコロの数（3〜10個）を選べます。</li>
                            <li>順番に一人ずつ、その数のサイコロを一斉に振ります。</li>
                            <li>振ったサイコロが<strong>全部「1」の目</strong>になったら、その場でゲーム終了！その人の優勝です。</li>
                            <li>1以外が混ざっていた場合は、サイコロの数は減らさずそのまま次の人に交代します。</li>
                            <li>誰かが「オール1」を出すまで、順番に振り続けます。</li>
                        </ol>
                    </div>
                </details>
            </div>
        </div>
    `,

    isRolling: false,
    rollAnimTimer: null,
    rollingInterval: null,

    init: function() {
        this.isRolling = false;
        this.rollAnimTimer = null;
        this.rollingInterval = null;
    },

    // 他プレイヤーへ「振っている最中」の演出を伝えるリアルタイムイベント
    handleData: function(data) {
        if (data.type === 'CHINCHIGUTI_ROLLING') {
            const n = data.diceCount || (gameState.chinchigutiConfig ? gameState.chinchigutiConfig.diceCount : 3);
            this.playRollingAnimation(n);
        }
    },

    diceFace: function(n) {
        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return faces[Math.max(1, Math.min(6, n)) - 1];
    },

    hostGame: function() {
        if (sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
        gameState.isStarted = true; gameState.gameType = 'chinchiguti';
        gameState.roster = sortedPlayers.map(p => ({ accId: p.accId, name: p.name }));
        gameState.turnIndex = Math.floor(Math.random() * gameState.roster.length);
        // 前回選んだサイコロ数があれば引き継ぐ。なければ3個から
        const prevCount = (gameState.chinchigutiConfig && gameState.chinchigutiConfig.diceCount) || 3;
        gameState.chinchigutiConfig = { diceCount: prevCount };
        gameState.chinchigutiStats = {};
        gameState.roster.forEach(p => {
            gameState.chinchigutiStats[p.accId] = { totalRolls: 0 };
        });
        gameState.lastRoll = [];
        gameState.lastRoller = null;
        gameState.isEnded = false; gameState.winner = null; gameState.winnerHandText = '';
        this.isRolling = false;

        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    // ゲーム開始前（誰もまだ振っていない間）だけ、サイコロの数を変更できる
    changeDiceCount: function(value) {
        if (!gameState.chinchigutiConfig) return;
        const anyRolled = Object.values(gameState.chinchigutiStats || {}).some(s => s.totalRolls > 0);
        if (anyRolled || gameState.isEnded) return;
        const n = parseInt(value, 10);
        if (!n || n === gameState.chinchigutiConfig.diceCount) return;
        gameState.chinchigutiConfig.diceCount = n;
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    rollDice: function() {
        const activePlayer = getActivePlayer();
        if (!activePlayer || activePlayer.accId !== myAccountId) return;
        if (this.isRolling || gameState.isEnded) return;

        this.isRolling = true;
        const rollBtn = document.getElementById('btn-chinchiguti-roll');
        if (rollBtn) rollBtn.disabled = true;

        const diceCount = gameState.chinchigutiConfig.diceCount;
        broadcast({ type: 'CHINCHIGUTI_ROLLING', diceCount: diceCount });
        this.playRollingAnimation(diceCount);

        if (this.rollAnimTimer) clearTimeout(this.rollAnimTimer);
        this.rollAnimTimer = setTimeout(() => { this.finalizeRoll(); }, 900);
    },

    playRollingAnimation: function(diceCount) {
        const container = document.getElementById('chinchiguti-dice-container');
        if (!container) return;

        container.innerHTML = '';
        const dieEls = [];
        for (let i = 0; i < diceCount; i++) {
            const el = document.createElement('div');
            el.className = 'chinchiguti-die rolling';
            el.textContent = this.diceFace(1 + Math.floor(Math.random() * 6));
            container.appendChild(el);
            dieEls.push(el);
        }

        if (this.rollingInterval) clearInterval(this.rollingInterval);
        this.rollingInterval = setInterval(() => {
            dieEls.forEach(el => { el.textContent = this.diceFace(1 + Math.floor(Math.random() * 6)); });
        }, 90);

        setTimeout(() => {
            if (this.rollingInterval) { clearInterval(this.rollingInterval); this.rollingInterval = null; }
            dieEls.forEach(el => el.classList.remove('rolling'));
        }, 850);
    },

    finalizeRoll: function() {
        const myStats = gameState.chinchigutiStats[myAccountId];
        if (!myStats) { this.isRolling = false; return; }

        const n = gameState.chinchigutiConfig.diceCount;
        const dice = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
        myStats.totalRolls += 1;
        gameState.lastRoll = dice;
        gameState.lastRoller = myAccountId;

        const isWin = dice.every(d => d === 1);
        if (isWin) {
            const me = gameState.roster.find(p => p.accId === myAccountId);
            gameState.isEnded = true;
            gameState.winner = me ? me.name : '?';
            gameState.winnerHandText = `${n}個 オール1（大当たり！）`;
        } else {
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.roster.length;
        }

        this.isRolling = false;
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    renderScoreboard: function() {
        const wrapper = document.getElementById('chinchiguti-scoreboard');
        if (!wrapper) return;
        wrapper.innerHTML = "";

        gameState.roster.forEach((p, idx) => {
            const s = gameState.chinchigutiStats[p.accId] || { totalRolls: 0 };
            const isTurn = (!gameState.isEnded && idx === gameState.turnIndex);
            const isWinner = gameState.isEnded && gameState.winner === p.name;
            const row = document.createElement('div');
            row.className = `chinchiguti-score-row ${isTurn ? 'active-turn' : ''} ${isWinner ? 'finished' : ''}`;

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span style="font-weight:bold; ${p.accId === myAccountId ? 'color:var(--accent-color);' : ''}">${p.name}${isTurn ? ' 🎲' : ''}${isWinner ? ' 🏆' : ''}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#999; font-size:0.75rem;">挑戦回数: ${s.totalRolls}回</span>
                </div>
            `;
            wrapper.appendChild(row);
        });
    },

    renderFinalRanking: function() {
        const wrap = document.getElementById('chinchiguti-final-ranking');
        if (!wrap) return;
        const ranked = [...gameState.roster].sort((a, b) => {
            const aIsWinner = a.name === gameState.winner ? 1 : 0;
            const bIsWinner = b.name === gameState.winner ? 1 : 0;
            return bIsWinner - aIsWinner;
        });
        wrap.innerHTML = ranked.map((p) => {
            const s = gameState.chinchigutiStats[p.accId] || { totalRolls: 0 };
            const isWinner = p.name === gameState.winner;
            return `<div class="chinchiguti-score-row ${isWinner ? 'finished' : ''}">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="chinchiguti-rank-num">${isWinner ? '🏆優勝' : '参加'}</span>
                    <span style="font-weight:bold;">${p.name}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#999; font-size:0.75rem;">挑戦回数: ${s.totalRolls}回</span>
                </div>
            </div>`;
        }).join('');
    },

    syncUI: function() {
        document.getElementById('game-title-label').textContent = "チンチ口";
        const unoBoard = document.getElementById('uno-board-area');
        if (unoBoard) unoBoard.classList.remove('active');
        const drawBoard = document.getElementById('draw-board-area');
        if (drawBoard) drawBoard.classList.remove('active');
        const drawResult = document.getElementById('draw-result-area');
        if (drawResult) drawResult.classList.remove('active');
        const chinchiroBoard = document.getElementById('chinchiro-board-area');
        if (chinchiroBoard) chinchiroBoard.classList.remove('active');
        document.getElementById('chinchiguti-board-area').classList.add('active');

        const activePlayer = getActivePlayer();
        const isMyTurn = (activePlayer && activePlayer.accId === myAccountId);
        const amInRoster = !gameState.roster || !gameState.roster.length || gameState.roster.some(p => p.accId === myAccountId);
        document.getElementById('chinchiguti-spectator-banner').style.display = (!amInRoster && !gameState.isEnded) ? 'block' : 'none';

        const infoBar = document.getElementById('game-info');
        const diceCount = gameState.chinchigutiConfig ? gameState.chinchigutiConfig.diceCount : 3;

        if (gameState.isEnded) {
            this.rollAnimTimer && clearTimeout(this.rollAnimTimer);
            document.getElementById('chinchiguti-winner-overlay').style.display = 'flex';
            document.getElementById('chinchiguti-playing-area').style.display = 'none';
            document.getElementById('chinchiguti-winner-name').textContent = `${gameState.winner} 優勝！`;
            document.getElementById('chinchiguti-winner-hand').textContent = gameState.winnerHandText || '-';
            this.renderFinalRanking();
            infoBar.textContent = `🎉 ${gameState.winner}さんが [${gameState.winnerHandText}] で優勝しました！`;
            return;
        }

        document.getElementById('chinchiguti-winner-overlay').style.display = 'none';
        document.getElementById('chinchiguti-playing-area').style.display = 'block';

        document.getElementById('chinchiguti-turn-indicator').textContent =
            `現在の番: ${activePlayer ? activePlayer.name : '-'} さん (${gameState.turnIndex + 1}人目 / 全${gameState.roster.length}人)`;

        // まだ誰も振っていない間だけ、サイコロ数の設定を表示（全員が変更できる）
        const anyRolled = Object.values(gameState.chinchigutiStats || {}).some(s => s.totalRolls > 0);
        const configBox = document.getElementById('chinchiguti-config-box');
        const selectEl = document.getElementById('chinchiguti-dice-select');
        if (configBox) configBox.style.display = anyRolled ? 'none' : 'flex';
        if (selectEl && document.activeElement !== selectEl) selectEl.value = String(diceCount);

        const rollBtn = document.getElementById('btn-chinchiguti-roll');
        const handLabelEl = document.getElementById('chinchiguti-current-hand-label');

        if (!this.isRolling) {
            const container = document.getElementById('chinchiguti-dice-container');
            if (container) {
                container.innerHTML = '';
                const diceToShow = (gameState.lastRoll && gameState.lastRoll.length) ? gameState.lastRoll : null;
                for (let i = 0; i < diceCount; i++) {
                    const el = document.createElement('div');
                    el.className = 'chinchiguti-die';
                    el.textContent = diceToShow ? this.diceFace(diceToShow[i]) : '-';
                    container.appendChild(el);
                }
            }
            const rollerName = gameState.lastRoller ? (gameState.roster.find(p => p.accId === gameState.lastRoller) || {}).name : null;
            handLabelEl.textContent = (gameState.lastRoll && gameState.lastRoll.length && rollerName)
                ? `${rollerName}さんの結果: 役なし（オール1ではありませんでした）`
                : '';
        }

        if (isMyTurn && !this.isRolling) {
            rollBtn.disabled = false;
            rollBtn.textContent = '🎲 サイコロを振る';
        } else {
            rollBtn.disabled = true;
            rollBtn.textContent = '🎲 サイコロを振る';
        }

        if (!amInRoster) {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...(観戦中)`;
        } else if (isMyTurn) {
            infoBar.textContent = `🎲 あなたの番です！サイコロを${diceCount}個振ってください。全部「1」が出たら優勝です！`;
        } else {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...`;
        }

        this.renderScoreboard();
    }
};
