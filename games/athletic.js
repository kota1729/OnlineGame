// GameRegistryに「でこぼこアスレチック」の機能と表示パーツをすべて登録
// ルール（オリジナル）:
//   1. 建設フェーズ: プレイヤーが順番に1個ずつ、コースにパーツを設置する。
//      「足場」は落とし穴を埋めて安全にする。「トゲ」「ノコギリ」は罠。「バネ」は大ジャンプできる。
//   2. 挑戦フェーズ: 設置が終わったら、プレイヤーが順番にスタートからゴールまで
//      矢印キー / ボタンで移動・ジャンプして駆け抜ける。穴に落ちる・罠に触れる・
//      時間切れになると失敗。ゴールできれば1ポイント。自分が置いた罠で誰かを
//      失敗させると、罠を置いた本人に1ボーナスポイント。
//   3. 数ラウンド繰り返し、合計ポイントが一番多い人が優勝。

if (typeof document !== 'undefined' && !document.getElementById('athletic-custom-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'athletic-custom-styles';
    styleEl.innerHTML = `
        .athletic-board { display: none; flex-direction: column; gap: 10px; min-width: 0; }
        .athletic-board.active { display: flex; }

        .athletic-round-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; background:#0b0d16; border-radius:8px; padding:8px 12px; font-size:0.82rem; }
        .athletic-round-bar b { color: var(--accent-color); }

        .athletic-palette { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; background:#0b0d16; border-radius:8px; padding:10px; }
        .athletic-piece-btn { display:flex; flex-direction:column; align-items:center; gap:2px; background:#1c1f2e; border:2px solid var(--border-color); border-radius:10px; padding:8px 10px; cursor:pointer; font-size:0.68rem; color:#ccc; transition: all .15s ease; min-width:64px; }
        .athletic-piece-btn .emoji { font-size:1.4rem; }
        .athletic-piece-btn.selected { border-color: var(--accent-color); background: rgba(0,255,242,0.12); color: var(--text-white); }
        .athletic-piece-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .athletic-build-hint { text-align:center; font-size:0.76rem; color:#999; }

        .athletic-stage-wrap { position: relative; background: linear-gradient(180deg, #1a2438 0%, #0f1420 70%); border-radius: 12px; padding: 10px; overflow-x: auto; }
        #athletic-canvas { display:block; margin: 0 auto; border-radius: 8px; background: linear-gradient(180deg, #223 0%, #1a2030 100%); touch-action: none; cursor: pointer; }

        .athletic-timer-bar-outer { height: 8px; background:#222; border-radius:4px; overflow:hidden; margin-top:8px; }
        .athletic-timer-bar-inner { height:100%; background: linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c); width:100%; transition: width 0.1s linear; }

        .athletic-controls { display:flex; justify-content:center; gap:10px; margin-top:10px; }
        .athletic-ctrl-btn { width:64px; height:52px; border-radius:12px; background:#1c1f2e; border:2px solid var(--border-color); color:#fff; font-size:1.4rem; display:flex; align-items:center; justify-content:center; user-select:none; touch-action:none; }
        .athletic-ctrl-btn:active { background: var(--accent-color); color:#000; }

        .athletic-scoreboard { display:flex; flex-direction:column; gap:6px; }
        .athletic-score-row { display:flex; justify-content:space-between; align-items:center; background:#0b0d16; border-radius:8px; padding:8px 10px; border-left:4px solid #555; font-size:0.8rem; gap:8px; flex-wrap:wrap; transition: background .2s ease, border-color .2s ease; }
        .athletic-score-row.active-turn { border-left-color:#ffaa00; background: rgba(255,170,0,0.1); }
        .athletic-score-row.finished { border-left-color: var(--success-color); }
        .athletic-rank-num { font-weight:900; color:#ffd54f; min-width:30px; }

        .athletic-round-result-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
        .athletic-round-result-row { display:flex; justify-content:space-between; background:#0b0d16; border-radius:8px; padding:6px 10px; font-size:0.78rem; border-left:4px solid #555; }
        .athletic-round-result-row.ok { border-left-color: var(--success-color); }
        .athletic-round-result-row.ng { border-left-color: var(--danger-color); }

        .athletic-start-btn-wrap { text-align:center; margin-top:8px; }
    `;
    document.head.appendChild(styleEl);
}

GameRegistry.athletic = {
    template: `
        <div class="athletic-board" id="athletic-board-area">
            <div class="spectator-banner" id="athletic-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <div class="winner-overlay" id="athletic-winner-overlay" style="display:none;">
                <div class="winner-trophy">🏆</div>
                <div class="winner-name" id="athletic-winner-name">優勝！</div>
                <div class="winner-card-info" id="athletic-winner-hand">-</div>
                <div id="athletic-final-ranking" style="margin-top:14px; width:100%; display:flex; flex-direction:column; gap:6px;"></div>
                <button class="btn btn-success" style="margin-top:14px;" onclick="GameRegistry.athletic.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="athletic-playing-area">
                <div class="athletic-round-bar">
                    <span>ラウンド <b id="athletic-round-num">1</b> / <span id="athletic-round-max">3</span></span>
                    <span id="athletic-phase-label">フェーズ: 設置中</span>
                </div>

                <div class="direction-indicator" id="athletic-turn-indicator">現在の番: -</div>

                <div class="athletic-palette" id="athletic-palette" style="display:none;">
                    <button type="button" class="athletic-piece-btn" data-piece="platform" onclick="GameRegistry.athletic.selectPiece('platform')">
                        <span class="emoji">🟩</span>足場<br>(穴を埋める)
                    </button>
                    <button type="button" class="athletic-piece-btn" data-piece="spike" onclick="GameRegistry.athletic.selectPiece('spike')">
                        <span class="emoji">🔺</span>トゲ<br>(罠)
                    </button>
                    <button type="button" class="athletic-piece-btn" data-piece="saw" onclick="GameRegistry.athletic.selectPiece('saw')">
                        <span class="emoji">⚙️</span>ノコギリ<br>(動く罠)
                    </button>
                    <button type="button" class="athletic-piece-btn" data-piece="spring" onclick="GameRegistry.athletic.selectPiece('spring')">
                        <span class="emoji">🟡</span>バネ<br>(大ジャンプ)
                    </button>
                </div>
                <div class="athletic-build-hint" id="athletic-build-hint" style="display:none;"></div>

                <div class="athletic-stage-wrap">
                    <canvas id="athletic-canvas" width="648" height="260"></canvas>
                </div>

                <div class="athletic-timer-bar-outer" id="athletic-timer-outer" style="display:none;">
                    <div class="athletic-timer-bar-inner" id="athletic-timer-inner"></div>
                </div>

                <div class="athletic-start-btn-wrap" id="athletic-start-btn-wrap" style="display:none;">
                    <button class="btn btn-success" onclick="GameRegistry.athletic.beginRun()">🏁 よーい、スタート！</button>
                </div>

                <div class="athletic-controls" id="athletic-controls" style="display:none;">
                    <div class="athletic-ctrl-btn" id="athletic-ctrl-left">◀</div>
                    <div class="athletic-ctrl-btn" id="athletic-ctrl-jump">⬆</div>
                    <div class="athletic-ctrl-btn" id="athletic-ctrl-right">▶</div>
                </div>

                <div id="athletic-round-result-area" style="display:none;">
                    <div style="text-align:center; font-weight:bold; color:var(--accent-color); margin-top:8px;">ラウンド結果</div>
                    <div class="athletic-round-result-list" id="athletic-round-result-list"></div>
                </div>

                <div class="hand-section" style="margin-top:10px;">
                    <div class="hand-title"><span>合計スコア</span></div>
                    <div class="athletic-scoreboard" id="athletic-scoreboard"></div>
                </div>

                <details class="chinchiro-rules">
                    <summary>📖 でこぼこアスレチックのルールを見る</summary>
                    <div class="rules-body">
                        <h4>遊び方</h4>
                        <ol>
                            <li>コースには最初からいくつか「落とし穴」があります。</li>
                            <li>設置フェーズでは、順番に1人1個ずつパーツを置きます。「足場」は穴の上にしか置けず、置くと安全になります。「トゲ」「ノコギリ」「バネ」は穴のない地面にしか置けません。</li>
                            <li>全員が置き終えたら挑戦フェーズ。順番にスタートからゴールまで矢印キー（または画面のボタン）で移動・ジャンプします。</li>
                            <li>穴に落ちる、トゲやノコギリに触れる、制限時間切れになると失敗。ゴールすると1ポイント獲得！</li>
                            <li>自分の置いた罠（トゲ・ノコギリ）で他プレイヤーが失敗すると、罠の持ち主にボーナス1ポイント。</li>
                            <li>全ラウンド終了後、合計ポイントが一番多い人が優勝です。</li>
                        </ol>
                    </div>
                </details>
            </div>
        </div>
    `,

    // ---- 定数 ----
    COLS: 12,
    COL_W: 54,
    CANVAS_H: 260,
    GROUND_Y: 190,
    PLAYER_SIZE: 22,
    GRAVITY: 0.7,
    JUMP_V: -13,
    SPRING_V: -19,
    MOVE_SPEED: 3.4,
    TIME_LIMIT_MS: 16000,
    SAW_AMPLITUDE: 20,
    SAW_PERIOD: 1400,
    PLAYER_COLORS: ['#ff5e5e', '#5ec8ff', '#ffe45e', '#7dff8a', '#c98aff', '#ff9d5e', '#5effe0', '#ff5ec8'],

    // ---- ローカル(非同期・非共有)な状態 ----
    selectedPiece: 'platform',
    running: false,
    rafHandle: null,
    keyState: { left: false, right: false, jump: false },
    myPlayer: { x: 0, y: 0, vy: 0, onGround: true },
    remoteRunner: null,
    runStartTime: 0,
    runFinished: false,
    lastPosSend: 0,
    boundKeyDown: null,
    boundKeyUp: null,

    init: function() {
        this.selectedPiece = 'platform';
        this.running = false;
        this.rafHandle = null;
        this.remoteRunner = null;
        this.runFinished = false;
        this._bindControlButtons();
    },

    handleData: function(data) {
        if (data.type === 'ATHLETIC_POS') {
            this.remoteRunner = { x: data.x, y: data.y, accId: data.accId };
        }
    },

    // ---- 準備 ----
    _bindControlButtons: function() {
        const self = this;
        const setup = (id, key) => {
            const el = document.getElementById(id);
            if (!el || el.dataset.athleticBound) return;
            el.dataset.athleticBound = '1';
            const on = (e) => { e.preventDefault(); self.keyState[key] = true; };
            const off = (e) => { e.preventDefault(); self.keyState[key] = false; };
            el.addEventListener('pointerdown', on);
            el.addEventListener('pointerup', off);
            el.addEventListener('pointerleave', off);
            el.addEventListener('pointercancel', off);
        };
        setup('athletic-ctrl-left', 'left');
        setup('athletic-ctrl-right', 'right');
        setup('athletic-ctrl-jump', 'jump');
    },

    pieceLabel: function(type) {
        return { platform: '足場', spike: 'トゲ', saw: 'ノコギリ', spring: 'バネ' }[type] || type;
    },

    // ---- ゲーム開始 ----
    hostGame: function() {
        if (sortedPlayers.length < 1) { customAlert("1人以上のプレイヤーが必要です。"); return; }
        gameState.isStarted = true; gameState.gameType = 'athletic';
        gameState.roster = shufflePlayers(sortedPlayers.map(p => ({ accId: p.accId, name: p.name })));
        gameState.athleticMaxRounds = gameState.roster.length <= 2 ? 4 : 3;
        gameState.athleticRound = 1;
        gameState.athleticScores = {};
        gameState.roster.forEach(p => { gameState.athleticScores[p.accId] = 0; });
        gameState.isEnded = false; gameState.winner = null; gameState.winnerHandText = '';
        this.running = false;
        this._startRound(0);
    },

    _startRound: function(firstTurnOffset) {
        const roster = gameState.roster;
        const holeCount = Math.min(4, Math.max(2, Math.floor(this.COLS / 3)));
        const candidateCols = [];
        for (let c = 1; c < this.COLS - 1; c++) candidateCols.push(c);
        const holes = [];
        while (holes.length < holeCount && candidateCols.length) {
            const idx = Math.floor(Math.random() * candidateCols.length);
            holes.push(candidateCols.splice(idx, 1)[0]);
        }
        gameState.athleticHoles = holes.sort((a, b) => a - b);
        gameState.athleticPlacements = [];
        gameState.athleticPhase = 'build';
        gameState.athleticBuildTurn = firstTurnOffset % roster.length;
        gameState.turnIndex = gameState.athleticBuildTurn;
        gameState.athleticRunOrder = null;
        gameState.athleticRunIndex = 0;
        gameState.athleticRoundResults = [];
        this.runFinished = false;

        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    // ---- 建設フェーズ ----
    selectPiece: function(type) {
        this.selectedPiece = type;
        document.querySelectorAll('.athletic-piece-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.piece === type);
        });
    },

    isMyBuildTurn: function() {
        const roster = gameState.roster;
        if (!roster || gameState.athleticPhase !== 'build') return false;
        const p = roster[gameState.athleticBuildTurn];
        return p && p.accId === myAccountId;
    },

    onCanvasClick: function(evt) {
        if (gameState.athleticPhase !== 'build' || !this.isMyBuildTurn()) return;
        const canvas = document.getElementById('athletic-canvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const clickX = (evt.clientX - rect.left) * scaleX;
        const col = Math.floor(clickX / this.COL_W);
        this.placePiece(col);
    },

    isHole: function(col) {
        return gameState.athleticHoles.includes(col) &&
            !gameState.athleticPlacements.some(p => p.col === col && p.type === 'platform');
    },

    occupiedByHazard: function(col) {
        return gameState.athleticPlacements.some(p => p.col === col && p.type !== 'platform');
    },

    placePiece: function(col) {
        if (col <= 0 || col >= this.COLS - 1) { customAlert("スタートとゴールのマスには置けません。"); return; }
        const type = this.selectedPiece;
        const holeHere = gameState.athleticHoles.includes(col);
        const alreadyFilled = gameState.athleticPlacements.some(p => p.col === col && p.type === 'platform');
        const hazardHere = this.occupiedByHazard(col);

        if (type === 'platform') {
            if (!holeHere || alreadyFilled) { customAlert("「足場」は、まだ埋まっていない穴のマスにしか置けません。"); return; }
        } else {
            if (holeHere && !alreadyFilled) { customAlert("そのマスは穴です。罠やバネは地面のマスに置いてください。"); return; }
            if (hazardHere) { customAlert("そのマスにはすでに何か置かれています。"); return; }
        }

        gameState.athleticPlacements.push({ col: col, type: type, ownerAccId: myAccountId, phase: Math.random() * Math.PI * 2 });
        gameState.athleticBuildTurn = (gameState.athleticBuildTurn + 1) % gameState.roster.length;
        gameState.turnIndex = gameState.athleticBuildTurn;

        const placedCount = gameState.athleticPlacements.length;
        if (placedCount >= gameState.roster.length) {
            gameState.athleticPhase = 'run';
            gameState.athleticRunOrder = shufflePlayers(gameState.roster.map(p => p.accId));
            gameState.athleticRunIndex = 0;
            const firstRunner = gameState.athleticRunOrder[0];
            gameState.turnIndex = gameState.roster.findIndex(p => p.accId === firstRunner);
        }

        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    // ---- 挑戦フェーズ ----
    isMyRunTurn: function() {
        if (gameState.athleticPhase !== 'run' || !gameState.athleticRunOrder) return false;
        return gameState.athleticRunOrder[gameState.athleticRunIndex] === myAccountId;
    },

    beginRun: function() {
        if (!this.isMyRunTurn() || this.running) return;
        this.running = true;
        this.runFinished = false;
        this.myPlayer = { x: this.PLAYER_SIZE / 2 + 4, y: this.GROUND_Y - this.PLAYER_SIZE, vy: 0, onGround: true };
        this.runStartTime = performance.now();
        this.lastPosSend = 0;

        this.boundKeyDown = (e) => this._onKey(e, true);
        this.boundKeyUp = (e) => this._onKey(e, false);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        document.getElementById('athletic-start-btn-wrap').style.display = 'none';
        document.getElementById('athletic-controls').style.display = 'flex';
        document.getElementById('athletic-timer-outer').style.display = 'block';

        this._loop();
    },

    _onKey: function(e, isDown) {
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) { this.keyState.left = isDown; e.preventDefault(); }
        else if (['ArrowRight', 'd', 'D'].includes(e.key)) { this.keyState.right = isDown; e.preventDefault(); }
        else if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) { this.keyState.jump = isDown; e.preventDefault(); }
    },

    _cleanupRunInput: function() {
        if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
        if (this.boundKeyUp) window.removeEventListener('keyup', this.boundKeyUp);
        this.boundKeyDown = null; this.boundKeyUp = null;
        this.keyState = { left: false, right: false, jump: false };
    },

    sawXForCol: function(col, timeMs) {
        const base = col * this.COL_W + this.COL_W / 2;
        return base + Math.sin((timeMs / this.SAW_PERIOD) * Math.PI * 2) * this.SAW_AMPLITUDE;
    },

    _loop: function() {
        if (!this.running) return;
        const now = performance.now();
        const elapsed = now - this.runStartTime;
        const remaining = this.TIME_LIMIT_MS - elapsed;

        const timerInner = document.getElementById('athletic-timer-inner');
        if (timerInner) timerInner.style.width = Math.max(0, (remaining / this.TIME_LIMIT_MS) * 100) + '%';

        if (remaining <= 0) { this._finishRun(false, 'timeout', null); return; }

        this._updatePhysics(now);
        this._render(now);

        if (now - this.lastPosSend > 90) {
            this.lastPosSend = now;
            broadcast({ type: 'ATHLETIC_POS', x: this.myPlayer.x, y: this.myPlayer.y, accId: myAccountId });
        }

        this.rafHandle = requestAnimationFrame(() => this._loop());
    },

    _updatePhysics: function(now) {
        const p = this.myPlayer;
        if (this.keyState.left) p.x -= this.MOVE_SPEED;
        if (this.keyState.right) p.x += this.MOVE_SPEED;
        p.x = Math.max(this.PLAYER_SIZE / 2, Math.min(this.COLS * this.COL_W - this.PLAYER_SIZE / 2, p.x));

        if (this.keyState.jump && p.onGround) {
            p.vy = this.JUMP_V;
            p.onGround = false;
        }

        p.vy += this.GRAVITY;
        p.y += p.vy;

        const centerCol = Math.floor(p.x / this.COL_W);
        const feetY = p.y + this.PLAYER_SIZE;
        const groundTop = this.GROUND_Y;
        const holeAtCol = this.isHole(centerCol);

        // 穴に落ちた
        if (holeAtCol && p.y > this.CANVAS_H + 40) {
            this._finishRun(false, 'hole', null);
            return;
        }

        if (!holeAtCol) {
            if (feetY >= groundTop && p.vy >= 0) {
                const spring = gameState.athleticPlacements.find(pl => pl.col === centerCol && pl.type === 'spring');
                if (spring) {
                    p.y = groundTop - this.PLAYER_SIZE;
                    p.vy = this.SPRING_V;
                    p.onGround = false;
                } else {
                    p.y = groundTop - this.PLAYER_SIZE;
                    p.vy = 0;
                    p.onGround = true;
                }
                const spike = gameState.athleticPlacements.find(pl => pl.col === centerCol && pl.type === 'spike');
                if (spike) { this._finishRun(false, 'spike', spike.ownerAccId); return; }
            }
        } else {
            p.onGround = false;
        }

        // ノコギリとの当たり判定（列に関わらず、近くのノコギリすべてチェック）
        gameState.athleticPlacements.forEach(pl => {
            if (pl.type !== 'saw') return;
            const sawX = this.sawXForCol(pl.col, now);
            const sawY = groundTop - 26;
            const dx = Math.abs((p.x) - sawX);
            const dy = Math.abs((p.y + this.PLAYER_SIZE / 2) - sawY);
            if (dx < (this.PLAYER_SIZE / 2 + 14) && dy < (this.PLAYER_SIZE / 2 + 14)) {
                this._finishRun(false, 'saw', pl.ownerAccId);
            }
        });
        if (this.runFinished) return;

        if (p.x >= this.COLS * this.COL_W - this.PLAYER_SIZE) {
            this._finishRun(true, 'goal', null);
        }
    },

    _render: function(now) {
        const canvas = document.getElementById('athletic-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this._drawTrack(ctx, now);
        this._drawPlayer(ctx, this.myPlayer.x, this.myPlayer.y, this._colorFor(myAccountId));
        if (this.remoteRunner && gameState.athleticPhase === 'run') {
            this._drawPlayer(ctx, this.remoteRunner.x, this.remoteRunner.y, this._colorFor(this.remoteRunner.accId));
        }
    },

    _colorFor: function(accId) {
        const idx = (gameState.roster || []).findIndex(p => p.accId === accId);
        return this.PLAYER_COLORS[idx >= 0 ? idx % this.PLAYER_COLORS.length : 0];
    },

    _drawTrack: function(ctx, now) {
        const w = this.COLS * this.COL_W, h = this.CANVAS_H;
        ctx.clearRect(0, 0, w, h);

        // 地面と穴
        for (let c = 0; c < this.COLS; c++) {
            const x = c * this.COL_W;
            const hole = this.isHole(c);
            if (!hole) {
                ctx.fillStyle = (c === 0 || c === this.COLS - 1) ? '#3a5a40' : '#4a4038';
                ctx.fillRect(x, this.GROUND_Y, this.COL_W, h - this.GROUND_Y);
            } else {
                ctx.fillStyle = '#05060a';
                ctx.fillRect(x, this.GROUND_Y, this.COL_W, h - this.GROUND_Y);
            }
        }

        // スタート/ゴール表示
        ctx.fillStyle = '#7dff8a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('START', this.COL_W / 2, this.GROUND_Y - 8);
        ctx.fillText('GOAL 🏁', (this.COLS - 0.5) * this.COL_W, this.GROUND_Y - 8);

        // 設置物
        (gameState.athleticPlacements || []).forEach(pl => {
            const x = pl.col * this.COL_W + this.COL_W / 2;
            if (pl.type === 'platform') {
                ctx.fillStyle = '#5ec86e';
                ctx.fillRect(pl.col * this.COL_W + 4, this.GROUND_Y, this.COL_W - 8, h - this.GROUND_Y);
            } else if (pl.type === 'spike') {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(x - 14, this.GROUND_Y);
                ctx.lineTo(x, this.GROUND_Y - 22);
                ctx.lineTo(x + 14, this.GROUND_Y);
                ctx.closePath();
                ctx.fill();
            } else if (pl.type === 'spring') {
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.ellipse(x, this.GROUND_Y - 6, 14, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.font = '10px sans-serif';
                ctx.fillText('BOING', x, this.GROUND_Y - 12);
            } else if (pl.type === 'saw') {
                const sawX = this.sawXForCol(pl.col, now);
                const sawY = this.GROUND_Y - 26;
                ctx.save();
                ctx.translate(sawX, sawY);
                ctx.rotate((now / 150) % (Math.PI * 2));
                ctx.fillStyle = '#bbb';
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const ang = (Math.PI * 2 / 8) * i;
                    const r = i % 2 === 0 ? 13 : 8;
                    const px = Math.cos(ang) * r, py = Math.sin(ang) * r;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });
        ctx.textAlign = 'left';
    },

    _drawPlayer: function(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x - this.PLAYER_SIZE / 2, y, this.PLAYER_SIZE, this.PLAYER_SIZE, 6) :
            ctx.rect(x - this.PLAYER_SIZE / 2, y, this.PLAYER_SIZE, this.PLAYER_SIZE);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    },

    _finishRun: function(success, reason, trapOwnerAccId) {
        if (this.runFinished) return;
        this.runFinished = true;
        this.running = false;
        if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
        this._cleanupRunInput();
        document.getElementById('athletic-controls').style.display = 'none';
        document.getElementById('athletic-timer-outer').style.display = 'none';

        const me = gameState.roster.find(p => p.accId === myAccountId);
        gameState.athleticScores[myAccountId] = (gameState.athleticScores[myAccountId] || 0) + (success ? 1 : 0);
        if (!success && trapOwnerAccId && trapOwnerAccId !== myAccountId) {
            gameState.athleticScores[trapOwnerAccId] = (gameState.athleticScores[trapOwnerAccId] || 0) + 1;
        }
        const reasonText = {
            goal: 'ゴール成功！',
            hole: '穴に落ちた…',
            spike: 'トゲに刺さった…',
            saw: 'ノコギリに切られた…',
            timeout: '時間切れ…'
        }[reason] || '失敗';
        gameState.athleticRoundResults.push({
            accId: myAccountId, name: me ? me.name : '?', success: success, reasonText: reasonText,
            trapOwnerAccId: trapOwnerAccId || null
        });

        gameState.athleticRunIndex += 1;
        if (gameState.athleticRunIndex >= gameState.athleticRunOrder.length) {
            gameState.athleticPhase = 'roundEnd';
            broadcast({ type: 'SYNC_GAME', state: gameState });
            syncGameUI();
            setTimeout(() => {
                if (gameState.athleticRound >= gameState.athleticMaxRounds) {
                    this._finalizeGame();
                } else {
                    gameState.athleticRound += 1;
                    this._startRound(gameState.athleticRound - 1);
                }
            }, 4200);
        } else {
            const nextAccId = gameState.athleticRunOrder[gameState.athleticRunIndex];
            gameState.turnIndex = gameState.roster.findIndex(p => p.accId === nextAccId);
            broadcast({ type: 'SYNC_GAME', state: gameState });
            syncGameUI();
        }
    },

    _finalizeGame: function() {
        const roster = gameState.roster;
        let top = -1;
        roster.forEach(p => { top = Math.max(top, gameState.athleticScores[p.accId] || 0); });
        const winners = roster.filter(p => (gameState.athleticScores[p.accId] || 0) === top);
        gameState.isEnded = true;
        gameState.winner = winners.map(p => p.name).join(' と ');
        gameState.winnerHandText = `合計 ${top} ポイント`;
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    // ---- 表示 ----
    renderScoreboard: function() {
        const wrapper = document.getElementById('athletic-scoreboard');
        if (!wrapper) return;
        wrapper.innerHTML = "";
        const roster = [...gameState.roster].sort((a, b) => (gameState.athleticScores[b.accId] || 0) - (gameState.athleticScores[a.accId] || 0));
        roster.forEach((p, idx) => {
            const activePlayer = getActivePlayer();
            const isTurn = activePlayer && activePlayer.accId === p.accId && !gameState.isEnded;
            const row = document.createElement('div');
            row.className = `athletic-score-row ${isTurn ? 'active-turn' : ''}`;
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span class="athletic-rank-num">${idx + 1}位</span>
                    <span style="font-weight:bold; ${p.accId === myAccountId ? 'color:var(--accent-color);' : ''}">${p.name}${isTurn ? ' 🏃' : ''}</span>
                </div>
                <div style="color:#ffd54f; font-weight:bold;">${gameState.athleticScores[p.accId] || 0} pt</div>
            `;
            wrapper.appendChild(row);
        });
    },

    renderRoundResults: function() {
        const area = document.getElementById('athletic-round-result-area');
        const list = document.getElementById('athletic-round-result-list');
        if (!area || !list) return;
        if (gameState.athleticPhase !== 'roundEnd') { area.style.display = 'none'; return; }
        area.style.display = 'block';
        list.innerHTML = (gameState.athleticRoundResults || []).map(r => {
            const trapOwner = r.trapOwnerAccId ? (gameState.roster.find(p => p.accId === r.trapOwnerAccId) || {}).name : null;
            const extra = trapOwner ? `（${trapOwner}さんの罠！+1ボーナス）` : '';
            return `<div class="athletic-round-result-row ${r.success ? 'ok' : 'ng'}">
                <span>${r.name}</span>
                <span>${r.reasonText}${extra}</span>
            </div>`;
        }).join('');
    },

    renderFinalRanking: function() {
        const wrap = document.getElementById('athletic-final-ranking');
        if (!wrap) return;
        const ranked = [...gameState.roster].sort((a, b) => (gameState.athleticScores[b.accId] || 0) - (gameState.athleticScores[a.accId] || 0));
        wrap.innerHTML = ranked.map((p, idx) => {
            return `<div class="athletic-score-row ${idx === 0 ? 'finished' : ''}">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="athletic-rank-num">${idx + 1}位</span>
                    <span style="font-weight:bold;">${p.name}</span>
                </div>
                <div style="color:#ffd54f; font-weight:bold;">${gameState.athleticScores[p.accId] || 0} pt</div>
            </div>`;
        }).join('');
    },

    syncUI: function() {
        document.getElementById('game-title-label').textContent = "でこぼこアスレチック";
        ['uno-board-area', 'draw-board-area', 'draw-result-area', 'chinchiro-board-area', 'chinchiguti-board-area'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        document.getElementById('athletic-board-area').classList.add('active');

        const amInRoster = !gameState.roster || !gameState.roster.length || gameState.roster.some(p => p.accId === myAccountId);
        document.getElementById('athletic-spectator-banner').style.display = (!amInRoster && !gameState.isEnded) ? 'block' : 'none';
        const infoBar = document.getElementById('game-info');

        if (gameState.isEnded) {
            this.running = false;
            if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
            this._cleanupRunInput();
            document.getElementById('athletic-winner-overlay').style.display = 'flex';
            document.getElementById('athletic-playing-area').style.display = 'none';
            document.getElementById('athletic-winner-name').textContent = `${gameState.winner} 優勝！`;
            document.getElementById('athletic-winner-hand').textContent = gameState.winnerHandText || '-';
            this.renderFinalRanking();
            infoBar.textContent = `🎉 ${gameState.winner}さんが優勝しました！`;
            return;
        }

        document.getElementById('athletic-winner-overlay').style.display = 'none';
        document.getElementById('athletic-playing-area').style.display = 'block';
        document.getElementById('athletic-round-num').textContent = gameState.athleticRound;
        document.getElementById('athletic-round-max').textContent = gameState.athleticMaxRounds;

        const activePlayer = getActivePlayer();
        const phase = gameState.athleticPhase;
        const phaseLabelEl = document.getElementById('athletic-phase-label');
        const paletteEl = document.getElementById('athletic-palette');
        const hintEl = document.getElementById('athletic-build-hint');
        const startBtnWrap = document.getElementById('athletic-start-btn-wrap');
        const canvas = document.getElementById('athletic-canvas');

        if (canvas && !canvas.dataset.athleticClickBound) {
            canvas.dataset.athleticClickBound = '1';
            canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        }

        this.renderRoundResults();
        this.renderScoreboard();

        if (phase === 'roundEnd') {
            phaseLabelEl.textContent = 'フェーズ: ラウンド結果発表中';
            paletteEl.style.display = 'none';
            hintEl.style.display = 'none';
            startBtnWrap.style.display = 'none';
            document.getElementById('athletic-turn-indicator').textContent = '次のラウンドの準備中…';
            infoBar.textContent = '⏱️ まもなく次のラウンドが始まります…';
            if (!this.running) this._render(performance.now());
            return;
        }

        document.getElementById('athletic-turn-indicator').textContent =
            `現在の番: ${activePlayer ? activePlayer.name : '-'} さん`;

        if (phase === 'build') {
            phaseLabelEl.textContent = `フェーズ: 設置中 (${gameState.athleticPlacements.length} / ${gameState.roster.length})`;
            const myTurn = this.isMyBuildTurn();
            paletteEl.style.display = 'flex';
            document.querySelectorAll('.athletic-piece-btn').forEach(btn => {
                btn.disabled = !myTurn;
                btn.classList.toggle('selected', btn.dataset.piece === this.selectedPiece);
            });
            hintEl.style.display = 'block';
            hintEl.textContent = myTurn
                ? `パーツを選んでコースをクリック（緑=足場は穴の上、赤/黄/銀は地面の上）`
                : `${activePlayer ? activePlayer.name : '相手'}さんがパーツを設置中…`;
            startBtnWrap.style.display = 'none';
            document.getElementById('athletic-controls').style.display = 'none';
            document.getElementById('athletic-timer-outer').style.display = 'none';
            if (!this.running) this._render(performance.now());
            infoBar.textContent = myTurn ? '🧱 あなたの番です。パーツを設置してください。' : `⏱️ ${activePlayer ? activePlayer.name : '相手'}が設置中…`;
        } else if (phase === 'run') {
            phaseLabelEl.textContent = 'フェーズ: 挑戦中';
            paletteEl.style.display = 'none';
            hintEl.style.display = 'none';
            const myTurn = this.isMyRunTurn();
            if (myTurn && !this.running && !this.runFinished) {
                startBtnWrap.style.display = 'block';
                this.myPlayer = { x: this.PLAYER_SIZE / 2 + 4, y: this.GROUND_Y - this.PLAYER_SIZE, vy: 0, onGround: true };
                this._render(performance.now());
                infoBar.textContent = '🏃 あなたの番です！「よーい、スタート」を押して駆け抜けよう。';
            } else if (!myTurn) {
                startBtnWrap.style.display = 'none';
                if (!this.running) this._render(performance.now());
                infoBar.textContent = amInRoster
                    ? `⏱️ ${activePlayer ? activePlayer.name : '相手'}が挑戦中…応援しよう！`
                    : `⏱️ ${activePlayer ? activePlayer.name : '相手'}が挑戦中…(観戦中)`;
            }
        }
    }
};
