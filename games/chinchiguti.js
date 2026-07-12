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

        .chinchiguti-config-box { display:flex; align-items:center; gap:8px; justify-content:center; flex-wrap:wrap; background:#0b0d16; border-radius:8px; padding:10px; font-size:0.82rem; }
        .chinchiguti-config-box input[type="number"] { background:#15151e; color:#fff; border:1px solid var(--accent-color); border-radius:6px; padding:5px 8px; font-size:0.9rem; width:70px; text-align:center; font-weight:bold; }
        .chinchiguti-config-box input[type="number"]::-webkit-inner-spin-button { opacity: 1; }
        .chinchiguti-config-hint { color:#888; font-size:0.72rem; width:100%; text-align:center; }
        .chinchiguti-preset-row { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; width:100%; }
        .chinchiguti-preset-btn { background:#1c1f2e; color:var(--accent-color); border:1px solid var(--border-color); border-radius:14px; padding:4px 12px; font-size:0.74rem; font-weight:bold; cursor:pointer; transition: all .15s ease; }
        .chinchiguti-preset-btn:hover { background: var(--accent-color); color:#000; border-color: var(--accent-color); }

        .chinchiguti-stage { background: radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.05), transparent 60%), rgba(0,0,0,0.25); border-radius: 12px; padding: 22px 10px; perspective: 600px; }
        .chinchiguti-dice-container { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:8px; min-height:56px; }
        .chinchiguti-die {
            width: var(--chinchiguti-die-size, 48px); height: var(--chinchiguti-die-size, 48px);
            background: linear-gradient(160deg,#ffffff 0%,#e8e8e8 60%,#d4d4d4 100%); color:#111; border-radius:9px;
            display:flex; align-items:center; justify-content:center;
            font-size: calc(var(--chinchiguti-die-size, 48px) * 0.42);
            box-shadow:0 4px 8px rgba(0,0,0,0.6); border:3px solid var(--border-color);
            transition: border-color .15s ease, box-shadow .15s ease, width .2s ease, height .2s ease, font-size .2s ease;
            transform-style: preserve-3d; flex-shrink: 0;
        }
        .chinchiguti-die.die-one { color:#d81f2a; text-shadow: 0 0 6px rgba(216,31,42,0.45); }
        .chinchiguti-die.rolling { border-color: var(--accent-color); animation: chinchiguti-tumble 0.85s cubic-bezier(.34,.06,.29,1) both; box-shadow: 0 10px 16px rgba(0,0,0,0.7), 0 0 10px rgba(0,255,242,0.3); }
        .chinchiguti-die.landed { animation: chinchiguti-land 0.32s cubic-bezier(.3,1.6,.4,1); }
        .chinchiguti-die.win { border-color:#ffd54f; box-shadow:0 0 16px rgba(255,213,79,0.95); }

        @keyframes chinchiguti-tumble {
            0%   { transform: translateY(0) rotateX(0) rotateY(0) rotateZ(0) scale(1); }
            14%  { transform: translateY(-16px) rotateX(160deg) rotateY(90deg) rotateZ(70deg) scale(1.12); }
            30%  { transform: translateY(3px) rotateX(280deg) rotateY(200deg) rotateZ(150deg) scale(0.9); }
            46%  { transform: translateY(-11px) rotateX(400deg) rotateY(300deg) rotateZ(240deg) scale(1.08); }
            62%  { transform: translateY(2px) rotateX(480deg) rotateY(380deg) rotateZ(330deg) scale(0.93); }
            78%  { transform: translateY(-6px) rotateX(540deg) rotateY(440deg) rotateZ(400deg) scale(1.04); }
            92%  { transform: translateY(0) rotateX(580deg) rotateY(480deg) rotateZ(440deg) scale(0.98); }
            100% { transform: translateY(0) rotateX(600deg) rotateY(500deg) rotateZ(460deg) scale(1); }
        }
        @keyframes chinchiguti-land { 0% { transform: scale(1.35) rotateX(-10deg); } 55% { transform: scale(0.85) rotateX(6deg); } 100% { transform: scale(1) rotateX(0); } }

        .chinchiguti-win-flash { position:absolute; inset:0; display:none; align-items:center; justify-content:center; pointer-events:none; z-index:5; }
        .chinchiguti-win-flash span { font-size:1.3rem; font-weight:900; color:#ffd54f; text-shadow:0 0 10px rgba(255,213,79,0.9), 0 0 22px rgba(255,80,0,0.7); background:rgba(0,0,0,0.55); padding:8px 18px; border-radius:30px; border:2px solid #ffd54f; white-space:nowrap; animation: chinchiguti-flash-pop 1.5s ease forwards; }
        @keyframes chinchiguti-flash-pop {
            0% { opacity:0; transform: scale(0.4) rotate(-6deg); }
            15% { opacity:1; transform: scale(1.25) rotate(3deg); }
            25% { transform: scale(1) rotate(-2deg); }
            85% { opacity:1; transform: scale(1) rotate(0deg); }
            100% { opacity:0; transform: scale(1.05) rotate(0deg); }
        }
        .chinchiguti-stage-wrap { position: relative; }

        .chinchiguti-scoreboard { display:flex; flex-direction:column; gap:6px; }
        .chinchiguti-score-row { display:flex; justify-content:space-between; align-items:center; background:#0b0d16; border-radius:8px; padding:8px 10px; border-left:4px solid #555; font-size:0.8rem; gap:8px; flex-wrap:wrap; transition: background .2s ease, border-color .2s ease; }
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
                    <input type="number" id="chinchiguti-dice-input" min="1" max="100" value="3"
                           onchange="GameRegistry.chinchiguti.changeDiceCount(this.value)">
                    <div class="chinchiguti-preset-row">
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(3)">3個</button>
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(5)">5個</button>
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(10)">10個</button>
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(20)">20個</button>
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(50)">50個</button>
                        <button type="button" class="chinchiguti-preset-btn" onclick="GameRegistry.chinchiguti.changeDiceCount(100)">100個</button>
                    </div>
                    <div class="chinchiguti-config-hint">1〜100個の間で自由に決められます</div>
                </div>

                <div class="chinchiguti-stage-wrap">
                    <div class="chinchiguti-stage">
                        <div class="chinchiguti-dice-container" id="chinchiguti-dice-container"></div>
                    </div>
                    <div class="chinchiguti-win-flash" id="chinchiguti-win-flash"><span>🎯 オール1！大当たり！ 🎯</span></div>
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
                            <li>開始前に、ホストがサイコロの数（1〜100個）を自由に決められます。</li>
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

    // サイコロの目を要素に反映する共通処理(「1」の目だけ赤色にする)
    applyFace: function(el, n) {
        if (!el) return;
        el.textContent = this.diceFace(n);
        el.classList.toggle('die-one', n === 1);
    },

    // サイコロの個数が多い時(最大100個)でも並びきるよう、個数に応じてサイズを自動調整する
    diceSizeFor: function(n) {
        if (n <= 10) return 48;
        if (n <= 20) return 40;
        if (n <= 35) return 34;
        if (n <= 55) return 28;
        if (n <= 80) return 22;
        return 18;
    },

    applyContainerSize: function(container, n) {
        if (container) container.style.setProperty('--chinchiguti-die-size', this.diceSizeFor(n) + 'px');
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

    // ゲーム開始前（誰もまだ振っていない間）だけ、サイコロの数を変更できる（1〜100個の範囲でカスタム可能）
    changeDiceCount: function(value) {
        if (!gameState.chinchigutiConfig) return;
        const anyRolled = Object.values(gameState.chinchigutiStats || {}).some(s => s.totalRolls > 0);
        if (anyRolled || gameState.isEnded) return;
        let n = parseInt(value, 10);
        if (!n || isNaN(n)) return;
        n = Math.max(1, Math.min(100, n));
        if (n === gameState.chinchigutiConfig.diceCount) return;
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

        this.applyContainerSize(container, diceCount);
        container.innerHTML = '';
        const dieEls = [];
        for (let i = 0; i < diceCount; i++) {
            const el = document.createElement('div');
            el.className = 'chinchiguti-die rolling';
            // 一斉に振っても単調にならないよう、サイコロごとにわずかにタイミングをずらす
            el.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
            this.applyFace(el, 1 + Math.floor(Math.random() * 6));
            container.appendChild(el);
            dieEls.push(el);
        }

        if (this.rollingInterval) clearInterval(this.rollingInterval);
        this.rollingInterval = setInterval(() => {
            dieEls.forEach(el => { this.applyFace(el, 1 + Math.floor(Math.random() * 6)); });
        }, 90);

        setTimeout(() => {
            if (this.rollingInterval) { clearInterval(this.rollingInterval); this.rollingInterval = null; }
            dieEls.forEach(el => {
                el.classList.remove('rolling');
                el.style.animationDelay = '';
                el.classList.add('landed');
            });
            setTimeout(() => { dieEls.forEach(el => el.classList.remove('landed')); }, 320);
        }, 850);
    },

    finalizeRoll: function() {
        const myStats = gameState.chinchigutiStats[myAccountId];
        if (!myStats) { this.isRolling = false; return; }

        const n = gameState.chinchigutiConfig.diceCount;
        // 振った後は昇順に並べて表示する
        const dice = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
        const isWin = dice.every(d => d === 1);

        const commit = () => {
            myStats.totalRolls += 1;
            gameState.lastRoll = dice;
            gameState.lastRoller = myAccountId;

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
        };

        if (isWin) {
            // オール1が出た瞬間は、すぐに優勝画面へ切り替えず出目をしっかり見せてから確定する
            this.showAllOnesResult(dice);
            this.showWinFlash();
            setTimeout(commit, 1500);
        } else {
            commit();
        }
    },

    // オール1演出中に、実際に揃った出目をそのまま表示する
    showAllOnesResult: function(dice) {
        const container = document.getElementById('chinchiguti-dice-container');
        if (!container) return;
        this.applyContainerSize(container, dice.length);
        container.innerHTML = '';
        dice.forEach(d => {
            const el = document.createElement('div');
            el.className = 'chinchiguti-die landed win';
            this.applyFace(el, d);
            container.appendChild(el);
        });
    },

    showWinFlash: function() {
        const flash = document.getElementById('chinchiguti-win-flash');
        if (!flash) return;
        flash.style.display = 'flex';
        const span = flash.querySelector('span');
        if (span) {
            const clone = span.cloneNode(true);
            span.replaceWith(clone);
        }
        setTimeout(() => { flash.style.display = 'none'; }, 1450);
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

        // まだ誰も振っていない間だけ、サイコロ数の設定を表示（全員が変更できる、1〜100個）
        const anyRolled = Object.values(gameState.chinchigutiStats || {}).some(s => s.totalRolls > 0);
        const configBox = document.getElementById('chinchiguti-config-box');
        const inputEl = document.getElementById('chinchiguti-dice-input');
        if (configBox) configBox.style.display = anyRolled ? 'none' : 'flex';
        if (inputEl && document.activeElement !== inputEl) inputEl.value = String(diceCount);

        const rollBtn = document.getElementById('btn-chinchiguti-roll');
        const handLabelEl = document.getElementById('chinchiguti-current-hand-label');

        if (!this.isRolling) {
            const container = document.getElementById('chinchiguti-dice-container');
            if (container) {
                this.applyContainerSize(container, diceCount);
                container.innerHTML = '';
                const diceToShow = (gameState.lastRoll && gameState.lastRoll.length) ? gameState.lastRoll : null;
                for (let i = 0; i < diceCount; i++) {
                    const el = document.createElement('div');
                    el.className = 'chinchiguti-die';
                    if (diceToShow) {
                        this.applyFace(el, diceToShow[i]);
                    } else {
                        el.textContent = '-';
                    }
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

        if (isMyTurn && this.isRolling) {
            infoBar.textContent = "🎲 サイコロが転がっています…！";
        } else if (!amInRoster) {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...(観戦中)`;
        } else if (isMyTurn) {
            infoBar.textContent = `🎲 あなたの番です！サイコロを${diceCount}個振ってください。全部「1」が出たら優勝です！`;
        } else {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...`;
        }

        this.renderScoreboard();
    }
};
