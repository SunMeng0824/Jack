/**
 * 数独游戏主应用 - 集成所有组件并启动游戏
 */
class SudokuApp {
    constructor() {
        this.gameController = null;
        this.uiManager = null;
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 显示加载状态
            this.showLoadingScreen();
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 初始化游戏控制器
            this.gameController = new GameController();
            
            // 初始化UI管理器
            this.uiManager = new UIManager(this.gameController);
            
            // 检查是否有保存的游戏
            this.checkSavedGame();
            
            // 隐藏加载屏幕
            this.hideLoadingScreen();
            
            // 显示欢迎消息
            this.showWelcomeMessage();
            
            console.log('数独游戏初始化完成！');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage('游戏初始化失败，请刷新页面重试');
        }
    }

    /**
     * 显示加载屏幕
     */
    showLoadingScreen() {
        // 创建加载屏幕
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <h2>数独游戏</h2>
                <div class="loading-spinner"></div>
                <p>正在加载...</p>
            </div>
        `;
        
        // 添加加载屏幕样式
        const style = document.createElement('style');
        style.textContent = `
            #loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--bg-primary);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }
            
            .loading-content {
                text-align: center;
            }
            
            .loading-content h2 {
                color: var(--primary-color);
                margin-bottom: 20px;
                font-size: 2rem;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--border-light);
                border-top-color: var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            
            .loading-content p {
                color: var(--text-secondary);
                font-size: 1.1rem;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingScreen);
    }

    /**
     * 隐藏加载屏幕
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                loadingScreen.remove();
            }, 300);
        }
    }

    /**
     * 检查保存的游戏
     */
    checkSavedGame() {
        const gameState = this.gameController.getGameState();
        
        if (gameState.status === 'playing') {
            // 有保存的游戏在进行中
            const confirmResume = confirm(
                '检测到有未完成的游戏，是否继续？\n\n' +
                `难度：${this.gameController.sudokuEngine.DIFFICULTY_CONFIG[gameState.difficulty].name}\n` +
                `已用时间：${this.gameController.formatTime(gameState.elapsedTime)}\n` +
                `使用提示：${gameState.hintsUsed}次`
            );
            
            if (!confirmResume) {
                // 用户选择不继续，开始新游戏
                this.gameController.newGame();
            }
        } else {
            // 没有保存的游戏，显示欢迎界面
            this.showWelcomeInterface();
        }
    }

    /**
     * 显示欢迎界面
     */
    showWelcomeInterface() {
        const gameState = this.gameController.getGameState();
        
        if (gameState.status === 'menu') {
            // 自动开始中等难度游戏
            setTimeout(() => {
                this.gameController.newGame('medium');
            }, 1000);
        }
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        const userStats = this.gameController.getUserStats();
        
        if (userStats.statistics.gamesPlayed === 0) {
            // 首次游戏
            this.uiManager.showMessage('info', '欢迎体验数独游戏！使用数字键1-9输入数字，点击"新游戏"开始。');
        } else {
            // 老用户
            this.uiManager.showMessage('info', `欢迎回来！您已完成 ${userStats.statistics.gamesCompleted} 个数独。`);
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showErrorMessage(message) {
        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>出错了</h3>
            <p>${message}</p>
            <button onclick="location.reload()">刷新页面</button>
        `;
        
        // 添加错误样式
        const style = document.createElement('style');
        style.textContent = `
            .error-message {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 10000;
                max-width: 400px;
            }
            
            .error-message h3 {
                color: var(--error-color);
                margin-bottom: 15px;
            }
            
            .error-message p {
                margin-bottom: 20px;
                color: var(--text-secondary);
            }
            
            .error-message button {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(errorDiv);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 可以在这里添加响应式处理逻辑
        console.log('Window resized');
    }

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面不可见时自动暂停游戏
            const gameState = this.gameController.getGameState();
            if (gameState.status === 'playing' && !gameState.isPaused) {
                this.gameController.togglePause();
                this.uiManager.showMessage('info', '游戏已自动暂停');
            }
        }
    }

    /**
     * 处理页面关闭前事件
     */
    handleBeforeUnload(e) {
        const gameState = this.gameController.getGameState();
        
        if (gameState.status === 'playing') {
            // 自动保存游戏进度
            this.gameController.autoSave();
            
            // 提示用户有未完成的游戏
            const message = '您有未完成的游戏，确定要离开吗？游戏进度已自动保存。';
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // 页面关闭前
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        // 键盘快捷键帮助
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
        });
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        const helpText = `
数独游戏帮助：

基本操作：
• 点击单元格选择，使用数字键1-9输入
• 方向键移动选择，Delete/Backspace清除
• 点击数字按钮选择数字后点击单元格输入

快捷键：
• 空格键：暂停/继续游戏
• H键：获取提示
• Ctrl+Z：撤销操作
• Ctrl+N：开始新游戏
• Ctrl+S：保存游戏
• F1：显示帮助
• Esc：关闭对话框

游戏规则：
• 在9×9网格中填入1-9的数字
• 每行、每列、每个3×3九宫格都不能有重复数字
• 红色标记表示数字冲突
• 蓝色高亮显示相关单元格

祝您游戏愉快！
        `;
        
        alert(helpText);
    }

    /**
     * 获取游戏统计信息
     */
    getGameInfo() {
        return {
            version: '1.0.0',
            gameController: this.gameController,
            uiManager: this.uiManager,
            stats: this.gameController.getUserStats()
        };
    }

    /**
     * 销毁应用
     */
    destroy() {
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        
        if (this.gameController) {
            this.gameController.destroy();
        }
        
        // 清理全局事件监听器
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
}

// 启动应用
let sudokuApp = null;

// 确保在DOM加载完成后启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sudokuApp = new SudokuApp();
    });
} else {
    sudokuApp = new SudokuApp();
}

// 导出应用实例供调试使用
window.SudokuApp = SudokuApp;
window.sudokuApp = sudokuApp;

// 添加一些调试功能（仅在开发环境下）
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.debugSudoku = {
        getGameInfo: () => sudokuApp.getGameInfo(),
        completeGame: () => {
            const gameState = sudokuApp.gameController.getGameState();
            if (gameState.solution) {
                // 自动完成游戏（仅用于调试）
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (gameState.currentGrid[row][col] === 0) {
                            sudokuApp.gameController.inputNumber(row, col, gameState.solution[row][col]);
                        }
                    }
                }
            }
        },
        clearStorage: () => {
            sudokuApp.gameController.storageManager.clearAllData();
            location.reload();
        }
    };
    
    console.log('调试功能已启用。使用 window.debugSudoku 访问调试功能。');
}