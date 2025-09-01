/**
 * 游戏控制器 - 管理游戏状态和协调各个组件
 */
class GameController {
    constructor() {
        this.sudokuEngine = new SudokuEngine();
        this.storageManager = new StorageManager();
        
        // 游戏状态
        this.gameState = {
            puzzle: null,           // 初始谜题
            solution: null,         // 完整解答
            currentGrid: null,      // 当前状态
            isInitial: null,        // 标记初始数字
            selectedCell: null,     // 选中的单元格
            difficulty: 'medium',   // 当前难度
            status: 'menu',         // 游戏状态: menu, playing, paused, completed
            startTime: null,        // 开始时间
            elapsedTime: 0,         // 已用时间（秒）
            hintsUsed: 0,           // 使用的提示次数
            conflicts: [],          // 冲突单元格
            gameHistory: [],        // 操作历史（用于撤销）
            isPaused: false         // 是否暂停
        };
        
        // 事件监听器
        this.eventListeners = {
            onStateChange: [],
            onCellChange: [],
            onGameComplete: [],
            onError: [],
            onMessage: []
        };
        
        // 计时器
        this.timer = null;
        
        // 初始化
        this.init();
    }

    /**
     * 初始化游戏控制器
     */
    init() {
        // 尝试加载保存的游戏
        const savedGame = this.storageManager.loadCurrentGame();
        if (savedGame) {
            this.loadGameState(savedGame);
        }
        
        // 记录用户设置
        this.settings = this.storageManager.getSettings();
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emitEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            });
        }
    }

    /**
     * 开始新游戏
     * @param {string} difficulty - 难度等级
     */
    newGame(difficulty = 'medium') {
        try {
            this.emitEvent('onMessage', { type: 'info', text: '正在生成新游戏...' });
            
            // 停止当前计时器
            this.stopTimer();
            
            // 生成新谜题
            const puzzleData = this.sudokuEngine.generatePuzzle(difficulty);
            
            // 重置游戏状态
            this.gameState = {
                puzzle: puzzleData.puzzle,
                solution: puzzleData.solution,
                currentGrid: this.sudokuEngine.copyGrid(puzzleData.puzzle),
                isInitial: this.createInitialFlags(puzzleData.puzzle),
                selectedCell: null,
                difficulty: difficulty,
                status: 'playing',
                startTime: Date.now(),
                elapsedTime: 0,
                hintsUsed: 0,
                conflicts: [],
                gameHistory: [],
                isPaused: false
            };
            
            // 记录游戏开始统计
            this.storageManager.recordGameStart();
            
            // 开始计时
            this.startTimer();
            
            // 自动保存
            this.autoSave();
            
            this.emitEvent('onStateChange', this.gameState);
            this.emitEvent('onMessage', { type: 'success', text: `开始${this.sudokuEngine.DIFFICULTY_CONFIG[difficulty].name}难度游戏！` });
            
        } catch (error) {
            console.error('Error creating new game:', error);
            this.emitEvent('onError', { message: '创建新游戏失败，请重试' });
        }
    }

    /**
     * 创建初始数字标记数组
     * @param {Array} puzzle - 谜题网格
     * @returns {Array} 初始数字标记数组
     */
    createInitialFlags(puzzle) {
        return puzzle.map(row => 
            row.map(cell => cell !== this.sudokuEngine.EMPTY_CELL)
        );
    }

    /**
     * 在指定位置输入数字
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {number} number - 要输入的数字
     */
    inputNumber(row, col, number) {
        if (this.gameState.status !== 'playing' || this.gameState.isPaused) {
            return;
        }
        
        // 检查是否为初始数字
        if (this.gameState.isInitial[row][col]) {
            this.emitEvent('onMessage', { type: 'warning', text: '不能修改初始数字' });
            return;
        }
        
        // 保存到历史记录
        this.saveToHistory();
        
        // 更新单元格
        this.gameState.currentGrid[row][col] = number;
        
        // 检查冲突
        this.updateConflicts();
        
        // 检查游戏是否完成
        if (this.sudokuEngine.isComplete(this.gameState.currentGrid)) {
            this.completeGame();
        } else {
            // 自动保存
            this.autoSave();
        }
        
        this.emitEvent('onCellChange', { row, col, number });
        this.emitEvent('onStateChange', this.gameState);
    }

    /**
     * 清除指定位置的数字
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    clearCell(row, col) {
        if (this.gameState.status !== 'playing' || this.gameState.isPaused) {
            return;
        }
        
        // 检查是否为初始数字
        if (this.gameState.isInitial[row][col]) {
            this.emitEvent('onMessage', { type: 'warning', text: '不能清除初始数字' });
            return;
        }
        
        this.inputNumber(row, col, this.sudokuEngine.EMPTY_CELL);
    }

    /**
     * 选择单元格
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    selectCell(row, col) {
        if (this.gameState.status !== 'playing' || this.gameState.isPaused) {
            return;
        }
        
        this.gameState.selectedCell = { row, col };
        this.emitEvent('onStateChange', this.gameState);
    }

    /**
     * 获取提示
     */
    getHint() {
        if (this.gameState.status !== 'playing' || this.gameState.isPaused) {
            return;
        }
        
        const hint = this.sudokuEngine.getHint(
            this.gameState.currentGrid,
            this.gameState.solution
        );
        
        if (hint) {
            // 保存到历史记录
            this.saveToHistory();
            
            // 应用提示
            this.gameState.currentGrid[hint.row][hint.col] = hint.number;
            this.gameState.hintsUsed++;
            
            // 更新冲突
            this.updateConflicts();
            
            // 检查游戏是否完成
            if (this.sudokuEngine.isComplete(this.gameState.currentGrid)) {
                this.completeGame();
            } else {
                // 自动保存
                this.autoSave();
            }
            
            this.emitEvent('onCellChange', { 
                row: hint.row, 
                col: hint.col, 
                number: hint.number,
                isHint: true 
            });
            this.emitEvent('onStateChange', this.gameState);
            this.emitEvent('onMessage', { 
                type: 'info', 
                text: `提示：在(${hint.row + 1}, ${hint.col + 1})填入${hint.number}` 
            });
        } else {
            this.emitEvent('onMessage', { type: 'warning', text: '没有可用的提示' });
        }
    }

    /**
     * 撤销上一步操作
     */
    undo() {
        if (this.gameState.status !== 'playing' || this.gameState.isPaused) {
            return;
        }
        
        if (this.gameState.gameHistory.length === 0) {
            this.emitEvent('onMessage', { type: 'warning', text: '没有可撤销的操作' });
            return;
        }
        
        // 恢复上一个状态
        const previousState = this.gameState.gameHistory.pop();
        this.gameState.currentGrid = previousState.grid;
        this.gameState.hintsUsed = previousState.hintsUsed;
        
        // 更新冲突
        this.updateConflicts();
        
        // 自动保存
        this.autoSave();
        
        this.emitEvent('onStateChange', this.gameState);
        this.emitEvent('onMessage', { type: 'info', text: '已撤销上一步操作' });
    }

    /**
     * 保存当前状态到历史记录
     */
    saveToHistory() {
        const maxHistory = 20; // 最多保存20步历史
        
        this.gameState.gameHistory.push({
            grid: this.sudokuEngine.copyGrid(this.gameState.currentGrid),
            hintsUsed: this.gameState.hintsUsed,
            timestamp: Date.now()
        });
        
        // 限制历史记录长度
        if (this.gameState.gameHistory.length > maxHistory) {
            this.gameState.gameHistory.shift();
        }
    }

    /**
     * 更新冲突检测
     */
    updateConflicts() {
        this.gameState.conflicts = this.sudokuEngine.getConflicts(this.gameState.currentGrid);
    }

    /**
     * 暂停/恢复游戏
     */
    togglePause() {
        if (this.gameState.status !== 'playing') {
            return;
        }
        
        this.gameState.isPaused = !this.gameState.isPaused;
        
        if (this.gameState.isPaused) {
            this.stopTimer();
            this.emitEvent('onMessage', { type: 'info', text: '游戏已暂停' });
        } else {
            this.startTimer();
            this.emitEvent('onMessage', { type: 'info', text: '游戏已恢复' });
        }
        
        this.emitEvent('onStateChange', this.gameState);
    }

    /**
     * 开始计时器
     */
    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            if (this.gameState.status === 'playing' && !this.gameState.isPaused) {
                this.gameState.elapsedTime = Math.floor((Date.now() - this.gameState.startTime) / 1000);
                this.emitEvent('onStateChange', this.gameState);
            }
        }, 1000);
    }

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * 完成游戏
     */
    completeGame() {
        this.stopTimer();
        this.gameState.status = 'completed';
        
        // 计算最终时间
        const finalTime = Math.floor((Date.now() - this.gameState.startTime) / 1000);
        this.gameState.elapsedTime = finalTime;
        
        // 记录统计信息
        this.storageManager.recordGameCompletion(
            this.gameState.difficulty,
            finalTime,
            this.gameState.hintsUsed
        );
        
        // 清除自动保存的游戏
        this.storageManager.clearCurrentGame();
        
        this.emitEvent('onGameComplete', {
            difficulty: this.gameState.difficulty,
            elapsedTime: finalTime,
            hintsUsed: this.gameState.hintsUsed
        });
        
        this.emitEvent('onStateChange', this.gameState);
        this.emitEvent('onMessage', { 
            type: 'success', 
            text: `恭喜完成游戏！用时 ${this.formatTime(finalTime)}` 
        });
    }

    /**
     * 保存游戏
     * @param {string} name - 游戏名称
     */
    saveGame(name) {
        if (this.gameState.status !== 'playing') {
            this.emitEvent('onMessage', { type: 'warning', text: '只能保存进行中的游戏' });
            return;
        }
        
        const success = this.storageManager.saveGame(this.gameState, name);
        
        if (success) {
            this.emitEvent('onMessage', { type: 'success', text: '游戏保存成功' });
        } else {
            this.emitEvent('onMessage', { type: 'error', text: '游戏保存失败' });
        }
    }

    /**
     * 加载游戏
     * @param {string} gameId - 游戏ID
     */
    loadGame(gameId) {
        const gameData = this.storageManager.loadSavedGame(gameId);
        
        if (gameData) {
            this.loadGameState(gameData);
            this.emitEvent('onMessage', { type: 'success', text: '游戏加载成功' });
        } else {
            this.emitEvent('onMessage', { type: 'error', text: '游戏加载失败' });
        }
    }

    /**
     * 加载游戏状态
     * @param {Object} gameData - 游戏数据
     */
    loadGameState(gameData) {
        this.stopTimer();
        
        this.gameState = {
            ...gameData,
            startTime: Date.now() - (gameData.elapsedTime * 1000),
            isPaused: false
        };
        
        if (this.gameState.status === 'playing') {
            this.startTimer();
        }
        
        this.emitEvent('onStateChange', this.gameState);
    }

    /**
     * 自动保存游戏
     */
    autoSave() {
        if (this.gameState.status === 'playing') {
            this.storageManager.saveCurrentGame(this.gameState);
        }
    }

    /**
     * 获取保存的游戏列表
     * @returns {Array} 保存的游戏列表
     */
    getSavedGames() {
        return this.storageManager.getSavedGames();
    }

    /**
     * 删除保存的游戏
     * @param {string} gameId - 游戏ID
     */
    deleteSavedGame(gameId) {
        const success = this.storageManager.deleteSavedGame(gameId);
        
        if (success) {
            this.emitEvent('onMessage', { type: 'success', text: '游戏删除成功' });
        } else {
            this.emitEvent('onMessage', { type: 'error', text: '游戏删除失败' });
        }
        
        return success;
    }

    /**
     * 获取用户统计数据
     * @returns {Object} 统计数据
     */
    getUserStats() {
        return this.storageManager.getUserProgress();
    }

    /**
     * 更新设置
     * @param {Object} newSettings - 新设置
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.storageManager.updateSettings(this.settings);
        this.emitEvent('onMessage', { type: 'success', text: '设置已更新' });
    }

    /**
     * 格式化时间显示
     * @param {number} seconds - 秒数
     * @returns {string} 格式化的时间字符串
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 获取当前游戏状态
     * @returns {Object} 游戏状态
     */
    getGameState() {
        return { ...this.gameState };
    }

    /**
     * 获取相关单元格（用于高亮显示）
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Array} 相关单元格坐标数组
     */
    getRelatedCells(row, col) {
        return this.sudokuEngine.getRelatedCells(row, col);
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopTimer();
        this.eventListeners = {};
    }
}

// 导出游戏控制器
window.GameController = GameController;