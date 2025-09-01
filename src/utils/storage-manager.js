/**
 * 存储管理器 - 处理游戏数据的保存和加载
 */
class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            CURRENT_GAME: 'sudoku_current_game',
            SAVED_GAMES: 'sudoku_saved_games',
            USER_PROGRESS: 'sudoku_user_progress',
            SETTINGS: 'sudoku_settings'
        };
        
        this.MAX_SAVED_GAMES = 5; // 最多保存5个游戏
        
        // 初始化默认设置
        this.defaultSettings = {
            showTimer: true,
            highlightConflicts: true,
            autoNotes: false,
            soundEnabled: true,
            theme: 'light'
        };
        
        // 初始化用户进度
        this.defaultProgress = {
            statistics: {
                gamesPlayed: 0,
                gamesCompleted: 0,
                bestTimes: {
                    easy: null,
                    medium: null,
                    hard: null
                },
                totalHintsUsed: 0,
                totalTime: 0
            },
            achievements: [],
            lastPlayed: null
        };
    }

    /**
     * 检查浏览器是否支持LocalStorage
     * @returns {boolean} 是否支持
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('LocalStorage not available:', e);
            return false;
        }
    }

    /**
     * 安全地获取存储数据
     * @param {string} key - 存储键
     * @param {*} defaultValue - 默认值
     * @returns {*} 存储的数据或默认值
     */
    getStorageData(key, defaultValue = null) {
        if (!this.isStorageAvailable()) {
            return defaultValue;
        }

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error reading from storage key "${key}":`, e);
            return defaultValue;
        }
    }

    /**
     * 安全地设置存储数据
     * @param {string} key - 存储键
     * @param {*} value - 要存储的值
     * @returns {boolean} 是否成功存储
     */
    setStorageData(key, value) {
        if (!this.isStorageAvailable()) {
            console.warn('Storage not available, data not saved');
            return false;
        }

        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing to storage key "${key}":`, e);
            return false;
        }
    }

    /**
     * 保存当前游戏状态
     * @param {Object} gameState - 游戏状态对象
     * @returns {boolean} 是否成功保存
     */
    saveCurrentGame(gameState) {
        const gameData = {
            ...gameState,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        return this.setStorageData(this.STORAGE_KEYS.CURRENT_GAME, gameData);
    }

    /**
     * 加载当前游戏状态
     * @returns {Object|null} 游戏状态或null
     */
    loadCurrentGame() {
        const gameData = this.getStorageData(this.STORAGE_KEYS.CURRENT_GAME);
        
        if (gameData && this.isValidGameState(gameData)) {
            return gameData;
        }
        
        return null;
    }

    /**
     * 清除当前游戏状态
     */
    clearCurrentGame() {
        if (this.isStorageAvailable()) {
            localStorage.removeItem(this.STORAGE_KEYS.CURRENT_GAME);
        }
    }

    /**
     * 保存游戏到已保存游戏列表
     * @param {Object} gameState - 游戏状态
     * @param {string} name - 保存的游戏名称
     * @returns {boolean} 是否成功保存
     */
    saveGame(gameState, name) {
        const savedGames = this.getSavedGames();
        
        const gameData = {
            id: this.generateGameId(),
            name: name || `游戏 ${new Date().toLocaleDateString()}`,
            ...gameState,
            savedAt: Date.now(),
            version: '1.0'
        };
        
        // 检查是否已达到最大保存数量
        if (savedGames.length >= this.MAX_SAVED_GAMES) {
            // 移除最旧的游戏
            savedGames.sort((a, b) => a.savedAt - b.savedAt);
            savedGames.shift();
        }
        
        savedGames.push(gameData);
        
        return this.setStorageData(this.STORAGE_KEYS.SAVED_GAMES, savedGames);
    }

    /**
     * 获取所有已保存的游戏
     * @returns {Array} 已保存的游戏数组
     */
    getSavedGames() {
        return this.getStorageData(this.STORAGE_KEYS.SAVED_GAMES, []);
    }

    /**
     * 根据ID加载保存的游戏
     * @param {string} gameId - 游戏ID
     * @returns {Object|null} 游戏状态或null
     */
    loadSavedGame(gameId) {
        const savedGames = this.getSavedGames();
        const game = savedGames.find(g => g.id === gameId);
        
        if (game && this.isValidGameState(game)) {
            return game;
        }
        
        return null;
    }

    /**
     * 删除保存的游戏
     * @param {string} gameId - 游戏ID
     * @returns {boolean} 是否成功删除
     */
    deleteSavedGame(gameId) {
        const savedGames = this.getSavedGames();
        const updatedGames = savedGames.filter(g => g.id !== gameId);
        
        return this.setStorageData(this.STORAGE_KEYS.SAVED_GAMES, updatedGames);
    }

    /**
     * 获取用户进度数据
     * @returns {Object} 用户进度对象
     */
    getUserProgress() {
        const progress = this.getStorageData(this.STORAGE_KEYS.USER_PROGRESS, this.defaultProgress);
        
        // 确保数据结构完整
        return {
            ...this.defaultProgress,
            ...progress,
            statistics: {
                ...this.defaultProgress.statistics,
                ...progress.statistics
            }
        };
    }

    /**
     * 更新用户进度数据
     * @param {Object} progressUpdate - 进度更新数据
     * @returns {boolean} 是否成功更新
     */
    updateUserProgress(progressUpdate) {
        const currentProgress = this.getUserProgress();
        const updatedProgress = {
            ...currentProgress,
            ...progressUpdate,
            statistics: {
                ...currentProgress.statistics,
                ...progressUpdate.statistics
            },
            lastPlayed: Date.now()
        };
        
        return this.setStorageData(this.STORAGE_KEYS.USER_PROGRESS, updatedProgress);
    }

    /**
     * 记录游戏完成统计
     * @param {string} difficulty - 难度等级
     * @param {number} elapsedTime - 游戏用时（秒）
     * @param {number} hintsUsed - 使用的提示次数
     */
    recordGameCompletion(difficulty, elapsedTime, hintsUsed) {
        const progress = this.getUserProgress();
        
        // 更新统计数据
        progress.statistics.gamesCompleted++;
        progress.statistics.totalHintsUsed += hintsUsed;
        progress.statistics.totalTime += elapsedTime;
        
        // 更新最佳时间
        const currentBest = progress.statistics.bestTimes[difficulty];
        if (!currentBest || elapsedTime < currentBest) {
            progress.statistics.bestTimes[difficulty] = elapsedTime;
        }
        
        // 检查成就
        this.checkAchievements(progress);
        
        this.updateUserProgress(progress);
    }

    /**
     * 记录游戏开始统计
     */
    recordGameStart() {
        const progress = this.getUserProgress();
        progress.statistics.gamesPlayed++;
        this.updateUserProgress(progress);
    }

    /**
     * 检查并更新成就
     * @param {Object} progress - 用户进度对象
     */
    checkAchievements(progress) {
        const achievements = progress.achievements || [];
        const stats = progress.statistics;
        
        // 定义成就列表
        const achievementChecks = [
            {
                id: 'first_game',
                name: '初次体验',
                description: '完成第一个数独',
                condition: () => stats.gamesCompleted >= 1
            },
            {
                id: 'speed_demon',
                name: '速度恶魔',
                description: '5分钟内完成简单难度',
                condition: () => stats.bestTimes.easy && stats.bestTimes.easy <= 300
            },
            {
                id: 'persistent',
                name: '持之以恒',
                description: '完成10个数独',
                condition: () => stats.gamesCompleted >= 10
            },
            {
                id: 'master',
                name: '数独大师',
                description: '完成困难难度数独',
                condition: () => stats.bestTimes.hard !== null
            },
            {
                id: 'no_hints',
                name: '独立思考',
                description: '不使用提示完成游戏',
                condition: () => stats.gamesCompleted > 0 // 需要在游戏完成时检查具体提示次数
            }
        ];
        
        // 检查新成就
        for (const achievement of achievementChecks) {
            if (!achievements.find(a => a.id === achievement.id) && achievement.condition()) {
                achievements.push({
                    ...achievement,
                    unlockedAt: Date.now()
                });
            }
        }
        
        progress.achievements = achievements;
    }

    /**
     * 获取用户设置
     * @returns {Object} 设置对象
     */
    getSettings() {
        const settings = this.getStorageData(this.STORAGE_KEYS.SETTINGS, this.defaultSettings);
        
        return {
            ...this.defaultSettings,
            ...settings
        };
    }

    /**
     * 更新用户设置
     * @param {Object} settingsUpdate - 设置更新数据
     * @returns {boolean} 是否成功更新
     */
    updateSettings(settingsUpdate) {
        const currentSettings = this.getSettings();
        const updatedSettings = {
            ...currentSettings,
            ...settingsUpdate
        };
        
        return this.setStorageData(this.STORAGE_KEYS.SETTINGS, updatedSettings);
    }

    /**
     * 验证游戏状态数据的有效性
     * @param {Object} gameState - 游戏状态对象
     * @returns {boolean} 是否有效
     */
    isValidGameState(gameState) {
        if (!gameState || typeof gameState !== 'object') {
            return false;
        }
        
        // 检查必要字段
        const requiredFields = ['puzzle', 'solution', 'currentGrid', 'difficulty'];
        for (const field of requiredFields) {
            if (!gameState[field]) {
                return false;
            }
        }
        
        // 检查网格数据格式
        if (!Array.isArray(gameState.puzzle) || gameState.puzzle.length !== 9) {
            return false;
        }
        
        for (const row of gameState.puzzle) {
            if (!Array.isArray(row) || row.length !== 9) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 生成唯一的游戏ID
     * @returns {string} 游戏ID
     */
    generateGameId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 导出所有数据
     * @returns {Object} 导出的数据对象
     */
    exportData() {
        return {
            currentGame: this.loadCurrentGame(),
            savedGames: this.getSavedGames(),
            userProgress: this.getUserProgress(),
            settings: this.getSettings(),
            exportedAt: Date.now(),
            version: '1.0'
        };
    }

    /**
     * 导入数据
     * @param {Object} data - 要导入的数据
     * @returns {boolean} 是否成功导入
     */
    importData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        try {
            if (data.currentGame) {
                this.setStorageData(this.STORAGE_KEYS.CURRENT_GAME, data.currentGame);
            }
            
            if (data.savedGames) {
                this.setStorageData(this.STORAGE_KEYS.SAVED_GAMES, data.savedGames);
            }
            
            if (data.userProgress) {
                this.setStorageData(this.STORAGE_KEYS.USER_PROGRESS, data.userProgress);
            }
            
            if (data.settings) {
                this.setStorageData(this.STORAGE_KEYS.SETTINGS, data.settings);
            }
            
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }

    /**
     * 清除所有存储数据
     */
    clearAllData() {
        if (!this.isStorageAvailable()) return;
        
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    /**
     * 获取存储使用情况
     * @returns {Object} 存储使用信息
     */
    getStorageInfo() {
        if (!this.isStorageAvailable()) {
            return { available: false };
        }
        
        let totalSize = 0;
        const itemSizes = {};
        
        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
            const data = localStorage.getItem(key);
            const size = data ? new Blob([data]).size : 0;
            itemSizes[name] = size;
            totalSize += size;
        });
        
        return {
            available: true,
            totalSize,
            itemSizes,
            maxSavedGames: this.MAX_SAVED_GAMES,
            currentSavedGames: this.getSavedGames().length
        };
    }
}

// 导出存储管理器实例
window.StorageManager = StorageManager;