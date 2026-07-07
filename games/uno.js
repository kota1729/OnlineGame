// GameRegistryにUNOの機能と表示パーツをすべて登録
GameRegistry.uno = {
    template: `
        <div class="uno-emergency-banner" id="uno-emergency-alert-bar">⚠️ 警告: 誰かがUNOになりました！</div>
        <div class="status-bar" id="game-info" style="border-left-color: #ffaa00; font-size: 0.8rem;">進行情報</div>
        
        <div class="uno-board" id="uno-board-area">
            <div class="spectator-banner" id="uno-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <div class="winner-overlay" id="uno-winner-overlay" style="display:none;">
                <div class="winner-trophy">🏆</div>
                <div class="winner-name" id="uno-winner-name">優勝！</div>
                <div class="winner-card-info" id="uno-winner-card-info">あがり札: -</div>
                <button class="btn btn-success" style="margin-top:10px;" onclick="GameRegistry.uno.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="uno-playing-area">
                <div class="direction-indicator" id="uno-direction">順番：時計回り 🔄</div>
                <div class="pending-draw-indicator" id="pending-draw-indicator" style="display:none;"></div>
                <div class="play-area">
                    <div style="text-align:center;">
                        <div style="font-size:0.65rem; margin-bottom:2px; color:#aaa;">山札</div>
                        <div class="uno-card uno-card-back" id="uno-deck" onclick="GameRegistry.uno.drawCard()"></div>
                    </div>
                    <div style="text-align:center; display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size:0.65rem; margin-bottom:2px; color:#aaa;">場のカード</div>
                        <div class="uno-card" id="uno-center-card">-</div>
                        <!-- 前のテキスト表示形式に戻しました -->
                        <div class="uno-history-text" id="uno-card-history" style="display:none;"></div>
                    </div>
                </div>
                <div class="color-selector" id="uno-color-selector">
                    <div class="color-btn" style="background:var(--uno-red);" onclick="GameRegistry.uno.selectWildColor('red')"></div>
                    <div class="color-btn" style="background:var(--uno-blue);" onclick="GameRegistry.uno.selectWildColor('blue')"></div>
                    <div class="color-btn" style="background:var(--uno-yellow);" onclick="GameRegistry.uno.selectWildColor('yellow')"></div>
                    <div class="color-btn" style="background:var(--uno-green);" onclick="GameRegistry.uno.selectWildColor('green')"></div>
                </div>
                <div class="action-container">
                    <button class="btn btn-success" id="btn-uno-play" onclick="GameRegistry.uno.playSelectedCards()" disabled>選択したカードを出す</button>
                    <button class="btn" id="btn-uno-pass" onclick="GameRegistry.uno.passTurn()" disabled>パスする</button>
                </div>
                <button class="btn btn-uno-call" id="btn-call-uno" onclick="GameRegistry.uno.callUnoCall()">UNO! コールする (3秒以内)</button>
                <div class="hand-section" id="uno-hand-section-wrapper">
                    <div class="hand-title">
                        <span>あなたの手札 (右側が上に重なります)</span>
                        <span id="hand-count-label" style="color:var(--accent-color); font-weight:bold;">0枚</span>
                    </div>
                    <div class="card-slider" id="uno-my-hand"></div>
                </div>
            </div>
        </div>
    `,

    selectedIndices: [],
    unoTimerId: null,

    init: function() {
        this.selectedIndices = [];
        this.unoTimerId = null;
    },

    clearTimer: function() {
        if (this.unoTimerId !== null) { clearTimeout(this.unoTimerId); this.unoTimerId = null; }
    },

    handleData: function(data) {
    },

    shuffleArrayEqually: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i]; array[i] = array[j]; array[j] = temp;
        }
        return array;
    },

    createStandardUnoDeck: function() {
        const colors = ['red', 'blue', 'yellow', 'green'];
        let deck = [];
        colors.forEach(c => {
            deck.push({ color: c, value: '0', dispName: '0' });
            for (let n = 1; n <= 9; n++) {
                deck.push({ color: c, value: String(n), dispName: String(n) });
                deck.push({ color: c, value: String(n), dispName: String(n) });
            }
            deck.push({ color: c, value: 'Skip', dispName: 'スキップ' });
            deck.push({ color: c, value: 'Skip', dispName: 'スキップ' });
            deck.push({ color: c, value: 'Reverse', dispName: 'リバース' });
            deck.push({ color: c, value: 'Reverse', dispName: 'リバース' });
            deck.push({ color: c, value: 'Draw2', dispName: 'ドロー2' });
            deck.push({ color: c, value: 'Draw2', dispName: 'ドロー2' });
        });
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'Wild', dispName: 'ワイルド' });
            deck.push({ color: 'wild', value: 'WildDraw4', dispName: 'ワイルドドロー4' });
        }
        return this.shuffleArrayEqually(deck);
    },

    hostGame: function() {
        if(sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
        gameState.isStarted = true; gameState.gameType = 'uno';
        gameState.roster = sortedPlayers.map(p => ({ accId: p.accId, name: p.name }));
        gameState.deck = this.createStandardUnoDeck(); gameState.discardPile = []; gameState.hands = {};
        gameState.turnIndex = Math.floor(Math.random() * gameState.roster.length); gameState.direction = 1; gameState.hasDrawnThisTurn = false;
        gameState.unoCalled = {}; gameState.pendingDrawCount = 0; gameState.pendingDrawType = null;
        gameState.lastPlayedComboText = ""; gameState.isEnded = false; gameState.winner = null; gameState.winnerHandText = "";

        gameState.roster.forEach(p => {
            gameState.hands[p.accId] = [];
            for(let i=0; i<7; i++) gameState.hands[p.accId].push(gameState.deck.pop());
        });

        let firstCard = gameState.deck.pop();
        while (firstCard.color === 'wild') {
            gameState.deck.splice(Math.floor(Math.random() * gameState.deck.length), 0, firstCard);
            firstCard = gameState.deck.pop();
        }
        gameState.discardPile.push(firstCard);
        gameState.currentSuit = firstCard.color;
        gameState.lastPlayedComboText = this.getJapaneseColor(firstCard.color) + firstCard.dispName;

        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    getJapaneseColor: function(color) {
        if (color === 'red') return '赤'; if (color === 'blue') return '青';
        if (color === 'yellow') return '黄'; if (color === 'green') return '緑';
        return '無色';
    },

    cardShortLabel: function(value) {
        if(value === 'Skip') return 'SK'; if(value === 'Reverse') return 'RV';
        if(value === 'Draw2') return '+2'; if(value === 'WildDraw4') return '+4';
        if(value === 'Wild') return 'W'; return value;
    },

    cardCenterIcon: function(card) {
        if (card.value === 'Skip') {
            return `<svg viewBox="0 0 100 100" class="card-icon"><circle cx="50" cy="50" r="38" fill="none" stroke="white" stroke-width="13"/><line x1="24" y1="24" x2="76" y2="76" stroke="white" stroke-width="13"/></svg>`;
        }
        if (card.value === 'Reverse') {
            return `<svg viewBox="0 0 100 100" class="card-icon">
                <path d="M22,40 A28,28 0 0,1 72,27" fill="none" stroke="white" stroke-width="10"/>
                <polygon points="68,10 89,21 66,33" fill="white"/>
                <path d="M78,60 A28,28 0 0,1 28,73" fill="none" stroke="white" stroke-width="10"/>
                <polygon points="32,90 11,79 34,67" fill="white"/>
            </svg>`;
        }
        if (card.value === 'Draw2') {
            return `<svg viewBox="0 0 100 100" class="card-icon">
                <rect x="26" y="14" width="42" height="58" rx="7" fill="white" transform="rotate(-9 50 43)"/>
                <rect x="26" y="22" width="42" height="58" rx="7" fill="white" transform="rotate(9 50 51)"/>
                <text x="50" y="66" font-size="30" font-weight="900" text-anchor="middle" fill="#222">+2</text>
            </svg>`;
        }
        if (card.value === 'WildDraw4') {
            return `<svg viewBox="0 0 100 100" class="card-icon">
                <rect x="24" y="16" width="44" height="58" rx="7" fill="white" transform="rotate(-9 50 45)"/>
                <rect x="24" y="24" width="44" height="58" rx="7" fill="white" transform="rotate(9 50 53)"/>
                <text x="50" y="68" font-size="26" font-weight="900" text-anchor="middle" fill="#222">+4</text>
            </svg>`;
        }
        return null; 
    },

    getCardDisplayValue: function(card) {
        const label = this.cardShortLabel(card.value);
        const icon = this.cardCenterIcon(card);
        if (card.color === 'wild') {
            return `<div class="wild-pie"><span></span><span></span><span></span><span></span></div>
                    <span class="corner-label tl">${label}</span>
                    <span class="card-center">${icon || label}</span>
                    <span class="corner-label br">${label}</span>`;
        }
        return `<span class="corner-label tl">${label}</span>
                <span class="card-center">${icon || label}</span>
                <span class="corner-label br">${label}</span>`;
    },

    hasPlayableCard: function(cards) {
        if (!gameState.discardPile || gameState.discardPile.length === 0) return false;
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        // 重ねがけ（スタック）中である場合の出せるカード制限
        if (gameState.pendingDrawCount > 0) {
            if (gameState.pendingDrawType === 'Draw2') {
                return cards.some(card => card.value === 'Draw2');
            } else if (gameState.pendingDrawType === 'WildDraw4') {
                return cards.some(card => card.value === 'WildDraw4');
            }
        }
        
        return cards.some(card => card.color === 'wild' || card.color === gameState.currentSuit || card.value === topCard.value);
    },

    isIllegalLastActionCard: function(cards) {
        if (cards.length !== 1) return false;
        const card = cards[0];
        if (card.value === 'Skip' || card.value === 'Reverse' || card.value === 'Draw2' || card.value === 'WildDraw4' || card.value === 'Wild') {
            const topCard = gameState.discardPile[gameState.discardPile.length - 1];
            return (card.color === 'wild' || card.color === gameState.currentSuit || card.value === topCard.value);
        }
        return false;
    },

    validateSelectionValidity: function(myCards) {
        if(this.selectedIndices.length === 0) return false;
        const bottomCard = myCards[this.selectedIndices[0]];
        
        // スタック積立中は、ドロー2ならドロー2、ドロー4ならドロー4しか選べない
        if (gameState.pendingDrawCount > 0) {
            if (gameState.pendingDrawType === 'Draw2' && bottomCard.value !== 'Draw2') return false;
            if (gameState.pendingDrawType === 'WildDraw4' && bottomCard.value !== 'WildDraw4') return false;
            return true;
        }
        
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        return (bottomCard.color === 'wild' || bottomCard.color === gameState.currentSuit || bottomCard.value === topCard.value);
    },

    reshuffleDeckFromDiscard: function() {
        if (gameState.deck.length > 0) return;
        const topCard = gameState.discardPile.pop();
        gameState.deck = this.shuffleArrayEqually(gameState.discardPile);
        gameState.discardPile = [topCard];
    },

    drawCard: function() {
        const activePlayer = getActivePlayer();
        if(!activePlayer || activePlayer.accId !== myAccountId) return;
        
        const myCards = gameState.hands[myAccountId] || [];
        
        // 重ねがけ中の積立がある場合は引く枚数が異なる
        if (gameState.pendingDrawCount > 0) {
            if (this.hasPlayableCard(myCards)) {
                customAlert("重ねがけして出せるカードがあるため、山札を引くことはできません。手札から出してください。");
                return;
            }
            // 重ねがけを回避してカードを累積分引き、ターンを強制移動
            for (let i = 0; i < gameState.pendingDrawCount; i++) {
                this.reshuffleDeckFromDiscard();
                if (gameState.deck.length > 0) myCards.push(gameState.deck.pop());
            }
            gameState.lastPlayedComboText = `${myName}さんが累積で${gameState.pendingDrawCount}枚引きました`;
            gameState.pendingDrawCount = 0;
            gameState.pendingDrawType = null;
            gameState.turnIndex = (gameState.turnIndex + gameState.direction + gameState.roster.length) % gameState.roster.length;
            gameState.hasDrawnThisTurn = false; this.selectedIndices = [];
            broadcast({ type: 'SYNC_GAME', state: gameState });
            syncGameUI();
            return;
        }

        if (gameState.hasDrawnThisTurn) { customAlert("1ターンにつき一枚しか引けません。"); return; }
        if (this.hasPlayableCard(myCards) && !this.isIllegalLastActionCard(myCards)) { 
            customAlert("出せるカードがあるため、山札を引くことはできません。手札から出してください。"); 
            return; 
        }
        this.reshuffleDeckFromDiscard();
        if (gameState.deck.length > 0) myCards.push(gameState.deck.pop());
        gameState.hasDrawnThisTurn = true; this.selectedIndices = [];
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    renderMyHand: function(isMyTurn) {
        const handContainer = document.getElementById('uno-my-hand');
        handContainer.innerHTML = "";
        const myCards = gameState.hands[myAccountId] || [];
        document.getElementById('hand-count-label').textContent = `${myCards.length}枚`;

        myCards.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            const isSelected = this.selectedIndices.includes(idx);
            cardEl.className = `uno-card c-${card.color} ${isSelected ? 'selected' : ''}`;
            cardEl.style.zIndex = idx + 1;
            cardEl.innerHTML = this.getCardDisplayValue(card);
            if (isSelected) {
                const orderNum = this.selectedIndices.indexOf(idx) + 1;
                cardEl.innerHTML += `<span class="selection-order-badge">${orderNum}</span>`;
            }

            if(isMyTurn) {
                cardEl.onclick = () => {
                    if (isSelected) {
                        this.selectedIndices = this.selectedIndices.filter(i => i !== idx);
                    } else {
                        if (card.color === 'wild') {
                            const alreadyHasWild = this.selectedIndices.some(i => myCards[i].color === 'wild');
                            if (alreadyHasWild || this.selectedIndices.length > 0) {
                                customAlert("ワイルドおよびワイルドドロー4カードは、一度に複数枚出すことはできません。"); return;
                            }
                        }
                        if (this.selectedIndices.length > 0) {
                            const firstSelectedCard = myCards[this.selectedIndices[0]];
                            if (firstSelectedCard.value !== card.value) {
                                customAlert("同じ数字または同じ記号のカードしか同時に選択できません！"); return;
                            }
                            if (firstSelectedCard.color === 'wild') {
                                customAlert("ワイルドカードは複数枚出しできません。"); return;
                            }
                        }
                        this.selectedIndices.push(idx);
                    }
                    document.getElementById('btn-uno-play').disabled = !this.validateSelectionValidity(myCards);
                    this.renderMyHand(isMyTurn);
                };
            } else {
                cardEl.classList.add('disabled');
            }
            handContainer.appendChild(cardEl);
        });
    },

    startUno3SecondTimer: function() {
        if (this.unoTimerId !== null) return; 
        this.unoTimerId = setTimeout(() => { GameRegistry.uno.executeUnoTimePenalty(); }, 3000);
    },

    executeUnoTimePenalty: function() {
        this.clearTimer();
        const hand = gameState.hands[myAccountId];
        if (hand && hand.length === 1 && gameState.unoCalled[myAccountId] === false) {
            customAlert("【ペナルティ】3秒以内にUNOコールができなかったため、カードを2枚引きます！");
            for (let i = 0; i < 2; i++) {
                this.reshuffleDeckFromDiscard();
                if (gameState.deck.length > 0) hand.push(gameState.deck.pop());
            }
            gameState.unoCalled[myAccountId] = true;
            broadcast({ type: 'SYNC_GAME', state: gameState });
            syncGameUI();
        }
    },

    callUnoCall: function() {
        this.clearTimer();
        if (!gameState.unoCalled) gameState.unoCalled = {};
        gameState.unoCalled[myAccountId] = true;
        customAlert("UNO! コール成功！");
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    passTurn: function() {
        const activePlayer = getActivePlayer();
        if(!activePlayer || activePlayer.accId !== myAccountId) return;
        gameState.turnIndex = (gameState.turnIndex + gameState.direction + gameState.roster.length) % gameState.roster.length;
        gameState.hasDrawnThisTurn = false; this.selectedIndices = [];
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    playSelectedCards: function() {
        const activePlayer = getActivePlayer();
        if(!activePlayer || activePlayer.accId !== myAccountId) return;
        const myCards = gameState.hands[myAccountId] || [];
        if(this.selectedIndices.length === 0) return;

        let putCards = [];
        // 選んだ順番通りに取り出して場に出すように修正 (逆順インデックスで手札から破綻なく削除して整列)
        const sortedSelectedIndices = [...this.selectedIndices].sort((a,b) => b-a);
        sortedSelectedIndices.forEach(idx => {
            const originalSelectionOrder = this.selectedIndices.indexOf(idx);
            putCards[originalSelectionOrder] = myCards.splice(idx, 1)[0];
        });
        this.selectedIndices = [];

        const finalCard = putCards[putCards.length - 1];

        putCards.forEach(c => gameState.discardPile.push(c));
        gameState.currentSuit = finalCard.color;
        gameState.lastPlayedComboText = getJapaneseColor(firstCard.color) + firstCard.dispName;

        if (myCards.length === 0) {
            gameState.isEnded = true;
            gameState.winner = myName;
            gameState.winnerHandText = this.getJapaneseColor(finalCard.color) + finalCard.dispName;
            broadcast({ type: 'SYNC_GAME', state: gameState });
            syncGameUI();
            return;
        }

        if (myCards.length === 1) {
            gameState.unoCalled[myAccountId] = false;
        }

        let nextSkip = false;
        if(finalCard.value === 'Skip') nextSkip = true;
        if(finalCard.value === 'Reverse') gameState.direction *= -1;
        
        // 重ねがけ（スタック）対応の加算ロジック
        if(finalCard.value === 'Draw2') {
            gameState.pendingDrawCount += (2 * putCards.length);
            gameState.pendingDrawType = 'Draw2';
        }
        if(finalCard.value === 'WildDraw4') {
            gameState.pendingDrawCount += (4 * putCards.length);
            gameState.pendingDrawType = 'WildDraw4';
        }

        if (finalCard.color === 'wild') {
            document.getElementById('uno-color-selector').style.display = 'flex';
            document.getElementById('btn-uno-play').disabled = true;
            document.getElementById('btn-uno-pass').disabled = true;
            return;
        }

        this.proceedTurn(nextSkip);
    },

    selectWildColor: function(color) {
        gameState.currentSuit = color;
        document.getElementById('uno-color-selector').style.display = 'none';
        
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        let nextSkip = false;
        if(topCard.value === 'Skip') nextSkip = true;

        this.proceedTurn(nextSkip);
    },

    proceedTurn: function(nextSkip) {
        let step = gameState.direction;
        if (nextSkip) step *= 2;
        gameState.turnIndex = (gameState.turnIndex + step + gameState.roster.length) % gameState.roster.length;
        
        // 次のプレイヤーに回った時点で即座にドロー自動消化するのではなく、ターン内で重ねがけを判定するため、ここの自動引かせ処理を削除・または条件を限定化しました。
        gameState.hasDrawnThisTurn = false;
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    syncUI: function() {
        document.getElementById('game-title-label').textContent = "UNO プレイフィールド";
        document.getElementById('uno-board-area').classList.add('active');
        const drawBoard = document.getElementById('draw-board-area');
        if(drawBoard) drawBoard.classList.remove('active');
        const resultBoard = document.getElementById('draw-result-area');
        if(resultBoard) resultBoard.classList.remove('active');

        const activePlayer = getActivePlayer();
        const isMyTurn = (activePlayer && activePlayer.accId === myAccountId);
        const amInRoster = !gameState.roster || !gameState.roster.length || gameState.roster.some(p => p.accId === myAccountId);
        
        document.getElementById('uno-spectator-banner').style.display = (!amInRoster && !gameState.isEnded) ? 'block' : 'none';

        if (gameState.isEnded && gameState.winner) {
            this.clearTimer();
            document.getElementById('uno-winner-overlay').style.display = 'flex';
            document.getElementById('uno-playing-area').style.display = 'none';
            document.getElementById('uno-winner-name').textContent = `${gameState.winner} 優勝！`;
            document.getElementById('uno-winner-card-info').textContent = `あがり札: ${gameState.winnerHandText || '-'}`;
            document.getElementById('game-info').textContent = `🎉 ${gameState.winner}さんが [${gameState.winnerHandText}] で優勝しました！`;
            document.getElementById('uno-emergency-alert-bar').style.display = 'none';
            return;
        }
        
        document.getElementById('uno-winner-overlay').style.display = 'none';
        document.getElementById('uno-playing-area').style.display = 'block';
        document.getElementById('uno-direction').textContent = gameState.direction === 1 ? "順番：時計回り 🔄" : "順番：反時計回り ↩️";
        
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        const centerView = document.getElementById('uno-center-card');
        centerView.className = `uno-card c-${topCard.color === 'wild' ? 'wild' : topCard.color}`;
        centerView.innerHTML = this.getCardDisplayValue(topCard);
        if(topCard.color === 'wild') {
            const suitText = {red:'赤', blue:'青', yellow:'黄', green:'緑'}[gameState.currentSuit];
            centerView.innerHTML += `<span style="position:absolute; bottom:3px; font-size:0.55rem; background:#000; padding:1px 3px; border-radius:2px;">色:${suitText}</span>`;
        }

        const historyView = document.getElementById('uno-card-history');
        if (gameState.lastPlayedComboText) {
            historyView.style.display = 'block'; historyView.textContent = gameState.lastPlayedComboText;
        } else {
            historyView.style.display = 'none';
        }

        const pendingIndicator = document.getElementById('pending-draw-indicator');
        if (gameState.pendingDrawCount > 0) {
            pendingIndicator.style.display = 'block';
            const typeLabel = gameState.pendingDrawType === 'WildDraw4' ? '+4' : '+2';
            pendingIndicator.textContent = `🔥 現在［${typeLabel}］が累積［${gameState.pendingDrawCount}枚］積まれています！`;
        } else {
            pendingIndicator.style.display = 'none';
        }

        let unoNamesList = [];
        gameState.roster.forEach(p => {
            if (p.accId === myAccountId) return; 
            const len = gameState.hands[p.accId] ? gameState.hands[p.accId].length : 0;
            if (len === 1) unoNamesList.push(`【${p.name}さん】`);
        });

        const emergencyBar = document.getElementById('uno-emergency-alert-bar');
        const handWrapper = document.getElementById('uno-hand-section-wrapper');
        if (unoNamesList.length > 0) {
            emergencyBar.style.display = 'block';
            emergencyBar.textContent = `⚠️ 🚨 警告: ${unoNamesList.join('と')} が残り手札1枚 (UNO) になっています！阻止してください！`;
            handWrapper.style.background = 'rgba(231,76,60,0.15)';
            handWrapper.style.border = '1px solid #ff5555';
        } else {
            emergencyBar.style.display = 'none';
            handWrapper.style.background = 'var(--panel-light)'; handWrapper.style.border = 'none';
        }

        const infoBar = document.getElementById('game-info');
        let baseStatus = "";
        if (!amInRoster) {
            baseStatus = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...(観戦中)`;
        } else if (isMyTurn) {
            if (gameState.pendingDrawCount > 0) {
                baseStatus = `🔥 重ねがけ攻撃が来ています！同じ種類のドローカードを出して重ねがけするか、山札をタップして [${gameState.pendingDrawCount}枚] 引き受けてください！`;
            } else {
                baseStatus = gameState.hasDrawnThisTurn ? "山札から引きました。出せるカードがあれば出してください。出せなければパスしてください。" : "⚡ あなたの番です。出せるカードがあれば出してください（同じ数字・記号なら複数枚選んで出せます）。出せなければ山札から引いてください。";
            }
        } else {
            baseStatus = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...`;
        }
        infoBar.innerHTML = `<div>${baseStatus}</div>`;
        
        this.renderMyHand(isMyTurn);

        const myHandLen = (gameState.hands[myAccountId] || []).length;
        const needsUnoCall = myHandLen === 1 && gameState.unoCalled && gameState.unoCalled[myAccountId] === false;
        if (needsUnoCall) {
            document.getElementById('btn-call-uno').style.display = 'block';
            this.startUno3SecondTimer();
        } else {
            document.getElementById('btn-call-uno').style.display = 'none'; this.clearTimer();
        }

        const myCardsForButtons = gameState.hands[myAccountId] || [];
        document.getElementById('btn-uno-pass').disabled = (!isMyTurn || !gameState.hasDrawnThisTurn || this.hasPlayableCard(myCardsForButtons) || gameState.pendingDrawCount > 0);
        document.getElementById('btn-uno-play').disabled = (this.selectedIndices.length === 0);

        const deckEl = document.getElementById('uno-deck');
        if (deckEl) {
            // 重ねがけ中の場合は、出せるカードを持っていても山札を引いて受け入れることができるように制限を緩和
            const deckDisabled = !isMyTurn || (gameState.hasDrawnThisTurn && gameState.pendingDrawCount === 0) || (gameState.pendingDrawCount === 0 && this.hasPlayableCard(myCardsForButtons) && !this.isIllegalLastActionCard(myCardsForButtons));
            deckEl.classList.toggle('disabled', deckDisabled);
        }
    }
};