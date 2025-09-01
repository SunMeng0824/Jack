/**
 * UI管理器 - 管理用户界面组件和交互
 */
class UIManager {
    constructor(gameController) {
        this.gameController = gameController;
        this.sudokuGrid = null;
        this.selectedNumber = null;
        
        // DOM元素引用
        this.elements = {
            // 显示元素
            difficultyDisplay: document.getElementById('current-difficulty'),
            timer: document.getElementById('timer'),
            message: document.getElementById('message'),
            
            // 网格容器
            gridContainer: document.getElementById('sudoku-grid'),
            
            // 数字按钮
            numberButtons: document.querySelectorAll('.number-btn'),
            clearBtn: document.getElementById('clear-btn'),
            hintBtn: document.getElementById('hint-btn'),
            
            // 难度按钮
            difficultyButtons: document.querySelectorAll('.difficulty-btn'),
            
            // 控制按钮
            newGameBtn: document.getElementById('new-game-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            undoBtn: document.getElementById('undo-btn'),
            
            // 模态框
            completionModal: document.getElementById('completion-modal'),
            completionTime: document.getElementById('completion-time'),
            hintsUsed: document.getElementById('hints-used'),
            newGameModal: document.getElementById('new-game-modal'),
            closeModal: document.getElementById('close-modal')
        };
        
        this.init();
        this.bindEvents();
    }

    /**
     * 初始化UI管理器
     */
    init() {
        // 创建数独网格
        this.sudokuGrid = new SudokuGrid(this.elements.gridContainer, this.gameController);
        
        // 绑定游戏控制器事件
        this.gameController.addEventListener('onStateChange', (gameState) => {
            this.updateUI(gameState);
        });
        
        this.gameController.addEventListener('onCellChange', (data) => {
            this.handleCellChange(data);
        });
        
        this.gameController.addEventListener('onGameComplete', (data) => {
            this.showCompletionModal(data);
        });
        
        this.gameController.addEventListener('onMessage', (data) => {
            this.showMessage(data.type, data.text);
        });
        
        this.gameController.addEventListener('onError', (data) => {
            this.showMessage('error', data.message);
        });
        
        // 初始化默认状态
        this.updateDifficultyButtons('medium');
    }

    /**
     * 绑定UI事件
     */
    bindEvents() {
        // 数字按钮事件
        this.elements.numberButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.dataset.number);
                this.selectNumber(number);
            });
        });
        
        // 清除按钮
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearSelectedCell();
        });
        
        // 提示按钮
        this.elements.hintBtn.addEventListener('click', () => {
            this.gameController.getHint();
        });
        
        // 难度按钮
        this.elements.difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.selectDifficulty(difficulty);
            });
        });
        
        // 控制按钮
        this.elements.newGameBtn.addEventListener('click', () => {
            this.startNewGame();
        });
        
        this.elements.pauseBtn.addEventListener('click', () => {
            this.gameController.togglePause();
        });
        
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveGame();
        });
        
        this.elements.loadBtn.addEventListener('click', () => {
            this.showLoadGameDialog();
        });
        
        this.elements.undoBtn.addEventListener('click', () => {
            this.gameController.undo();
        });
        
        // 模态框按钮
        this.elements.newGameModal.addEventListener('click', () => {
            this.hideCompletionModal();
            this.startNewGame();
        });
        
        this.elements.closeModal.addEventListener('click', () => {
            this.hideCompletionModal();
        });
        
        // 点击模态框背景关闭
        this.elements.completionModal.addEventListener('click', (e) => {
            if (e.target === this.elements.completionModal) {
                this.hideCompletionModal();
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
    }

    /**
     * 更新UI状态
     * @param {Object} gameState - 游戏状态
     */
    updateUI(gameState) {
        // 更新难度显示
        if (gameState.difficulty) {
            const difficultyName = this.gameController.sudokuEngine.DIFFICULTY_CONFIG[gameState.difficulty].name;
            this.elements.difficultyDisplay.textContent = difficultyName;
            this.updateDifficultyButtons(gameState.difficulty);
        }
        
        // 更新计时器
        if (gameState.elapsedTime !== undefined) {
            this.elements.timer.textContent = this.gameController.formatTime(gameState.elapsedTime);
        }
        
        // 更新网格
        this.sudokuGrid.updateGrid(gameState);
        
        // 更新按钮状态
        this.updateButtonStates(gameState);
        
        // 更新暂停状态
        this.sudokuGrid.setPausedState(gameState.isPaused);
    }

    /**
     * 更新按钮状态
     * @param {Object} gameState - 游戏状态
     */
    updateButtonStates(gameState) {
        const isPlaying = gameState.status === 'playing';
        const isPaused = gameState.isPaused;
        
        // 游戏控制按钮
        this.elements.pauseBtn.disabled = !isPlaying;
        this.elements.pauseBtn.textContent = isPaused ? '继续' : '暂停';
        
        this.elements.saveBtn.disabled = !isPlaying;
        this.elements.undoBtn.disabled = !isPlaying || isPaused || gameState.gameHistory?.length === 0;
        
        // 数字和操作按钮
        const buttonsDisabled = !isPlaying || isPaused;
        this.elements.numberButtons.forEach(btn => {
            btn.disabled = buttonsDisabled;
        });
        this.elements.clearBtn.disabled = buttonsDisabled;
        this.elements.hintBtn.disabled = buttonsDisabled;
    }

    /**
     * 选择数字
     * @param {number} number - 数字
     */
    selectNumber(number) {
        // 清除之前的选中状态
        this.elements.numberButtons.forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 设置新的选中状态
        if (this.selectedNumber === number) {
            // 如果重复点击同一个数字，取消选择
            this.selectedNumber = null;
            this.sudokuGrid.clearSelectedNumber();
        } else {
            this.selectedNumber = number;
            this.sudokuGrid.setSelectedNumber(number);
            
            // 高亮选中的数字按钮
            const selectedBtn = document.querySelector(`[data-number="${number}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }
        }
        
        // 如果有选中的单元格，直接输入数字
        const gameState = this.gameController.getGameState();
        if (gameState.selectedCell && this.selectedNumber !== null) {
            const { row, col } = gameState.selectedCell;
            this.sudokuGrid.inputNumber(row, col, this.selectedNumber);
        }
    }

    /**
     * 清除选中的单元格
     */
    clearSelectedCell() {
        const gameState = this.gameController.getGameState();
        if (gameState.selectedCell) {
            const { row, col } = gameState.selectedCell;
            this.sudokuGrid.clearCell(row, col);
        }
    }

    /**
     * 选择难度
     * @param {string} difficulty - 难度等级
     */
    selectDifficulty(difficulty) {
        this.updateDifficultyButtons(difficulty);
    }

    /**
     * 更新难度按钮状态
     * @param {string} selectedDifficulty - 选中的难度
     */
    updateDifficultyButtons(selectedDifficulty) {
        this.elements.difficultyButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === selectedDifficulty) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * 开始新游戏
     */
    startNewGame() {
        const selectedDifficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'medium';
        this.gameController.newGame(selectedDifficulty);
    }

    /**
     * 保存游戏
     */
    saveGame() {
        const name = prompt('请输入游戏名称：', `游戏 ${new Date().toLocaleDateString()}`);
        if (name) {
            this.gameController.saveGame(name);
        }
    }

    /**
     * 显示加载游戏对话框
     */
    showLoadGameDialog() {
        const savedGames = this.gameController.getSavedGames();
        
        if (savedGames.length === 0) {
            this.showMessage('info', '没有保存的游戏');
            return;
        }
        
        // 简单的选择对话框（实际项目中可以用更好的UI）
        let gameList = '请选择要加载的游戏：\n\n';
        savedGames.forEach((game, index) => {
            const date = new Date(game.savedAt).toLocaleDateString();
            const difficulty = this.gameController.sudokuEngine.DIFFICULTY_CONFIG[game.difficulty].name;
            gameList += `${index + 1}. ${game.name} (${difficulty}, ${date})\n`;
        });
        
        const selection = prompt(gameList + '\n请输入游戏编号：');
        const gameIndex = parseInt(selection) - 1;
        
        if (gameIndex >= 0 && gameIndex < savedGames.length) {
            this.gameController.loadGame(savedGames[gameIndex].id);
        }
    }

    /**
     * 处理单元格变化
     * @param {Object} data - 变化数据
     */
    handleCellChange(data) {
        if (data.isHint) {
            this.sudokuGrid.showHintAnimation(data.row, data.col);
        }
    }

    /**
     * 显示完成模态框
     * @param {Object} data - 完成数据
     */
    showCompletionModal(data) {
        this.elements.completionTime.textContent = this.gameController.formatTime(data.elapsedTime);
        this.elements.hintsUsed.textContent = data.hintsUsed;
        this.elements.completionModal.classList.remove('hidden');
        
        // 显示完成动画
        this.sudokuGrid.showCompletionAnimation();
    }

    /**
     * 隐藏完成模态框
     */
    hideCompletionModal() {
        this.elements.completionModal.classList.add('hidden');
    }

    /**
     * 显示消息
     * @param {string} type - 消息类型
     * @param {string} text - 消息文本
     */
    showMessage(type, text) {
        this.elements.message.className = `message ${type}`;
        this.elements.message.textContent = text;
        this.elements.message.classList.remove('hidden');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.elements.message.classList.add('hidden');
        }, 3000);
    }

    /**
     * 处理全局键盘事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleGlobalKeydown(e) {
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            if (!this.elements.completionModal.classList.contains('hidden')) {
                this.hideCompletionModal();
            }
        }
        
        // 空格键暂停/继续
        if (e.key === ' ') {
            e.preventDefault();
            const gameState = this.gameController.getGameState();
            if (gameState.status === 'playing') {
                this.gameController.togglePause();
            }
        }
        
        // N键开始新游戏
        if (e.key === 'n' || e.key === 'N') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.startNewGame();
            }
        }
        
        // H键获取提示
        if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            this.gameController.getHint();
        }
    }

    /**
     * 更新用户统计显示
     */
    updateUserStats() {
        const stats = this.gameController.getUserStats();
        
        // 这里可以显示用户统计信息
        // 实际项目中可以添加专门的统计面板
        console.log('用户统计:', stats);
    }

    /**
     * 设置加载状态
     * @param {boolean} isLoading - 是否加载中
     */
    setLoadingState(isLoading) {
        if (isLoading) {
            this.elements.newGameBtn.classList.add('loading');
            this.elements.newGameBtn.disabled = true;
        } else {
            this.elements.newGameBtn.classList.remove('loading');
            this.elements.newGameBtn.disabled = false;
        }
    }

    /**
     * 切换主题
     * @param {string} theme - 主题名称
     */
    toggleTheme(theme) {
        document.body.className = `theme-${theme}`;
        
        // 保存主题设置
        this.gameController.updateSettings({ theme });
    }

    /**
     * 销毁UI管理器
     */
    destroy() {
        if (this.sudokuGrid) {
            this.sudokuGrid.destroy();
        }
        
        // 移除事件监听器
        this.elements = {};
    }
}

// 导出UI管理器
window.UIManager = UIManager;